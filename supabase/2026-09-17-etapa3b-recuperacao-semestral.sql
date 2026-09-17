-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPA 3B — Bimestres automáticos, recuperação semestral e boletim do aluno
-- ───────────────────────────────────────────────────────────────────────────
-- Decisões do professor (16–17/09/2026):
--  • Raimundo Hermínio: boletins mantidos como estão (notas digitadas).
--  • Casavequia: 3º e 4º bimestres contam APENAS pelo motor automático —
--    trabalhos (relatorio_notas_trabalho) e prova (prova bimestral da
--    Biblioteca). Notas digitadas nesses bimestres são apagadas.
--  • Recuperação semestral (regras em assets/js/boletim-regras.js, arquivo
--    idêntico nos dois repositórios): 2º bimestre recupera o 1º, 4º recupera o
--    3º; se ainda houver bimestre abaixo de 7, prova única de recuperação
--    semestral (7 ou mais recupera; abaixo, reprovado).
--  • O aluno vê tudo isso na aba Boletim do perfil privado (Biblioteca), via
--    get_meu_boletim — só com a sessão dele (ou a conta admin).
-- Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Regras por escola ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.relatorio_regras_escola (
  escola_id              uuid PRIMARY KEY REFERENCES public.escolas(id) ON DELETE CASCADE,
  bimestres_automaticos  text[] NOT NULL DEFAULT '{}',
  recuperacao_semestral  boolean NOT NULL DEFAULT false,
  atualizada_em          timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.relatorio_regras_escola (escola_id, bimestres_automaticos, recuperacao_semestral)
SELECT e.id, v.bimestres, v.recuperacao
FROM (VALUES
  ('padre-carlos-casavequia',     ARRAY['3', '4'], true),
  ('raimundo-herminio-de-melo-2', ARRAY[]::text[], false)
) AS v(slug, bimestres, recuperacao)
JOIN public.escolas e ON e.slug = v.slug
ON CONFLICT (escola_id) DO UPDATE
  SET bimestres_automaticos = EXCLUDED.bimestres_automaticos,
      recuperacao_semestral = EXCLUDED.recuperacao_semestral,
      atualizada_em = now();

ALTER TABLE public.relatorio_regras_escola ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS relatorio_regras_escola_admin ON public.relatorio_regras_escola;
CREATE POLICY relatorio_regras_escola_admin ON public.relatorio_regras_escola
  FOR ALL TO authenticated
  USING ((SELECT private.is_relatorio_admin())) WITH CHECK ((SELECT private.is_relatorio_admin()));
REVOKE ALL ON public.relatorio_regras_escola FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.relatorio_regras_escola TO authenticated;

-- ── 2. Disciplina principal de cada painel (fica em aluno.bimestres) ────────
ALTER TABLE public.relatorio_turmas ADD COLUMN IF NOT EXISTS disciplina_principal text;
UPDATE public.relatorio_turmas t
   SET disciplina_principal = v.disciplina
  FROM (VALUES
    ('casavequia:panel:pc_alunos_1serie_2026_v1', 'Língua Portuguesa'),
    ('casavequia:panel:pc_alunos_2serie_2026_v1', 'Língua Portuguesa'),
    ('casavequia:panel:pc_alunos_3serie_2026_v1', 'Língua Portuguesa'),
    ('casavequia:panel:pc_alunos_6ano_2026_v1',   'Artes'),
    ('herminio:panel:rh_alunos_1serie_2026_v1',   'Língua Portuguesa'),
    ('herminio:panel:rh_alunos_2serie_2026_v1',   'Língua Portuguesa'),
    ('herminio:panel:rh_alunos_3serie_2026_v1',   'Língua Portuguesa'),
    ('herminio:panel:rh_alunos_8e9ano_2026_v1',   'Língua Portuguesa')
  ) AS v(scope_key, disciplina)
 WHERE t.scope_key = v.scope_key;

-- ── 3. Prova bimestral da Biblioteca, na escala 0–10 ────────────────────────
-- Nota oficial = bimester_grades.nota_prova (última prova enviada), dividida
-- pela nota máxima da prova e multiplicada por 10.
CREATE OR REPLACE FUNCTION public.relatorio_nome_disciplina(p_slug text, p_nome text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_slug
    WHEN 'lingua-portuguesa' THEN 'Língua Portuguesa'
    WHEN 'trilhas-de-linguagens' THEN 'Trilhas de Linguagens'
    WHEN 'trilhas-de-c-humanas' THEN 'Trilhas de C. Humanas'
    WHEN 'trilhas-de-ciencias-humanas' THEN 'Trilhas de C. Humanas'
    WHEN 'artes' THEN 'Artes'
    WHEN 'arte' THEN 'Artes'
    ELSE p_nome
  END;
$$;

DROP VIEW IF EXISTS public.relatorio_provas_bimestrais;
CREATE VIEW public.relatorio_provas_bimestrais
WITH (security_invoker = true) AS
SELECT v.scope_key,
       v.aluno_relatorio_id,
       v.nome_relatorio,
       g.aluno_id,
       public.relatorio_nome_disciplina(g.disciplina_slug, g.disciplina_nome) AS disciplina,
       g.bimestre::text AS bimestre,
       round(least(10, g.nota_prova / NULLIF(t.nota_maxima, 0) * 10), 1) AS nota_prova,
       g.nota_prova AS nota_prova_original,
       t.nota_maxima,
       COALESCE(a.submitted_at, g.updated_at) AS realizada_em
FROM public.bimester_grades g
JOIN public.bimester_exam_attempts a ON a.id = g.prova_attempt_id AND a.status = 'finalizada'
JOIN public.bimester_exam_templates t ON t.id = a.template_id
JOIN public.relatorio_aluno_vinculo v ON v.aluno_id = g.aluno_id
WHERE g.nota_prova IS NOT NULL;

GRANT SELECT ON public.relatorio_provas_bimestrais TO authenticated;
REVOKE ALL ON public.relatorio_provas_bimestrais FROM anon;

-- ── 4. Casavequia: apaga notas digitadas no 3º e 4º bimestres ───────────────
-- Os painéis também ignoram e limpam esses campos; aqui o banco fica coerente
-- e __syncUpdatedAt avança para que os aparelhos aceitem o estado limpo.
CREATE OR REPLACE FUNCTION private.relatorio_limpar_bimestres(p_bim jsonb, p_bimestres text[])
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(jsonb_object_agg(
           k,
           CASE WHEN k = ANY (p_bimestres) AND jsonb_typeof(val) = 'object'
                THEN val || '{"trabalhos": "", "prova": ""}'::jsonb
                ELSE val END
         ), '{}'::jsonb)
  FROM jsonb_each(COALESCE(p_bim, '{}'::jsonb)) AS e(k, val);
$$;

WITH limpos AS (
  SELECT r.scope_key,
         jsonb_agg(
           CASE WHEN jsonb_typeof(a) <> 'object' THEN a ELSE
             jsonb_set(
               a || jsonb_build_object('bimestres', private.relatorio_limpar_bimestres(a -> 'bimestres', ARRAY['3', '4'])),
               '{boletim}',
               COALESCE((
                 SELECT jsonb_object_agg(d.key, d.value || jsonb_build_object('bimestres', private.relatorio_limpar_bimestres(d.value -> 'bimestres', ARRAY['3', '4'])))
                 FROM jsonb_each(COALESCE(a -> 'boletim', '{}'::jsonb)) AS d(key, value)
                 WHERE jsonb_typeof(d.value) = 'object'
               ), '{}'::jsonb)
             )
           END
           ORDER BY ord
         ) AS alunos
  FROM public.report_sync_state r
  CROSS JOIN LATERAL jsonb_array_elements(r.payload -> 'alunos') WITH ORDINALITY AS x(a, ord)
  WHERE r.scope_key LIKE 'casavequia:panel:%'
  GROUP BY r.scope_key
)
UPDATE public.report_sync_state r
   SET payload = r.payload
                 || jsonb_build_object('alunos', l.alunos)
                 || jsonb_build_object('__syncUpdatedAt', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
       updated_at = now()
  FROM limpos l
 WHERE r.scope_key = l.scope_key
   AND r.payload -> 'alunos' IS DISTINCT FROM l.alunos;

-- ── 5. Boletim do aluno (dados brutos; as regras rodam no navegador) ────────
-- Retorna, para cada painel em que o aluno está vinculado:
--   escola, turma, regras e, por disciplina, os lançamentos na escala 0–10:
--   bimestres[b] = {trabalhoManual, provaManual, trabalhoAuto, provaAuto,
--                   resumoTrabalho{...}} e recuperacao{"1","2"}.
CREATE OR REPLACE FUNCTION public.get_meu_boletim(p_aluno_id uuid, p_session_token uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resultado jsonb := '[]'::jsonb;
  v_turma     record;
  v_aluno     jsonb;
  v_regras    record;
  v_disciplinas jsonb;
  v_disc      text;
  v_bims      jsonb;
  v_origem    jsonb;
  v_b         text;
BEGIN
  IF p_aluno_id IS NULL THEN
    RAISE EXCEPTION 'Aluno não informado.' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    COALESCE(auth.role(), 'service_role') = 'service_role'   -- SQL Editor / servidor
    OR COALESCE((SELECT private.is_relatorio_admin()), false)
    OR (p_session_token IS NOT NULL AND public.student_progress_session_is_valid(p_aluno_id, p_session_token))
  ) THEN
    RAISE EXCEPTION 'Sessão do aluno inválida ou expirada. Entre novamente.' USING ERRCODE = '42501';
  END IF;

  FOR v_turma IN
    SELECT t.scope_key, t.rotulo, t.escola_id, t.disciplina_principal, e.nome AS escola_nome,
           v.aluno_relatorio_id, v.transferido, r.payload, r.updated_at
    FROM relatorio_aluno_vinculo v
    JOIN relatorio_turmas t ON t.scope_key = v.scope_key AND t.ativo
    JOIN escolas e ON e.id = t.escola_id
    JOIN report_sync_state r ON r.scope_key = v.scope_key
    WHERE v.aluno_id = p_aluno_id
  LOOP
    SELECT a INTO v_aluno
    FROM jsonb_array_elements(v_turma.payload -> 'alunos') AS a
    WHERE a ->> 'id' = v_turma.aluno_relatorio_id::text
    LIMIT 1;
    CONTINUE WHEN v_aluno IS NULL;

    SELECT COALESCE(rg.bimestres_automaticos, '{}') AS automaticos,
           COALESCE(rg.recuperacao_semestral, false) AS recuperacao
      INTO v_regras
      FROM (SELECT 1) AS um
      LEFT JOIN relatorio_regras_escola rg ON rg.escola_id = v_turma.escola_id;

    v_disciplinas := '[]'::jsonb;
    FOR v_disc IN
      SELECT DISTINCT nome FROM (
        SELECT v_turma.disciplina_principal AS nome
        UNION ALL
        SELECT k FROM jsonb_object_keys(COALESCE(v_aluno -> 'boletim', '{}'::jsonb)) AS k
      ) d WHERE nome IS NOT NULL
      ORDER BY 1
    LOOP
      v_origem := CASE WHEN v_disc = v_turma.disciplina_principal
                       THEN v_aluno -> 'bimestres'
                       ELSE v_aluno -> 'boletim' -> v_disc -> 'bimestres' END;
      v_bims := '{}'::jsonb;
      FOREACH v_b IN ARRAY ARRAY['1', '2', '3', '4'] LOOP
        v_bims := v_bims || jsonb_build_object(v_b, jsonb_build_object(
          -- armazenado em 0–5 no painel → 0–10
          'trabalhoManual', (SELECT round(NULLIF(v_origem -> v_b ->> 'trabalhos', '')::numeric * 2, 1)),
          'provaManual',    (SELECT round(NULLIF(v_origem -> v_b ->> 'prova', '')::numeric * 2, 1)),
          'trabalhoAuto',   (SELECT n.nota_trabalho FROM relatorio_notas_trabalho n
                              WHERE n.aluno_id = p_aluno_id AND n.escola_id = v_turma.escola_id
                                AND relatorio_normalizar_nome(n.disciplina) = relatorio_normalizar_nome(v_disc)
                                AND n.bimestre::text = v_b
                              LIMIT 1),
          'resumoTrabalho', (SELECT jsonb_build_object('atividadesValidas', n.atividades_validas, 'valorAtividade', n.valor_atividade,
                                                       'fez', n.fez, 'naoFez', n.nao_fez, 'aguardando', n.aguardando)
                              FROM relatorio_notas_trabalho n
                              WHERE n.aluno_id = p_aluno_id AND n.escola_id = v_turma.escola_id
                                AND relatorio_normalizar_nome(n.disciplina) = relatorio_normalizar_nome(v_disc)
                                AND n.bimestre::text = v_b
                              LIMIT 1),
          'provaAuto',      (SELECT p.nota_prova FROM relatorio_provas_bimestrais p
                              WHERE p.aluno_id = p_aluno_id AND p.scope_key = v_turma.scope_key
                                AND relatorio_normalizar_nome(p.disciplina) = relatorio_normalizar_nome(v_disc)
                                AND p.bimestre = v_b
                              ORDER BY p.realizada_em DESC LIMIT 1)
        ));
      END LOOP;

      v_disciplinas := v_disciplinas || jsonb_build_array(jsonb_build_object(
        'nome', v_disc,
        'bimestres', v_bims,
        'recuperacao', COALESCE(v_aluno -> 'recuperacao' -> v_disc, '{}'::jsonb)
      ));
    END LOOP;

    v_resultado := v_resultado || jsonb_build_array(jsonb_build_object(
      'escola', v_turma.escola_nome,
      'turma', v_turma.rotulo,
      'aluno', v_aluno ->> 'nome',
      'numero', v_aluno -> 'numero',
      'transferido', v_turma.transferido,
      'regras', jsonb_build_object('bimestresAutomaticos', to_jsonb(v_regras.automaticos), 'recuperacaoSemestral', v_regras.recuperacao),
      'disciplinas', v_disciplinas,
      'atualizadoEm', v_turma.updated_at
    ));
  END LOOP;

  RETURN jsonb_build_object('boletins', v_resultado, 'geradoEm', now());
END;
$$;

REVOKE ALL ON FUNCTION public.get_meu_boletim(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_meu_boletim(uuid, uuid) TO anon, authenticated;
