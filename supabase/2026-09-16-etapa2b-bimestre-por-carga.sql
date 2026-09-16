-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPA 2B — Bimestre pela soma de aulas (não pelo calendário)
-- ───────────────────────────────────────────────────────────────────────────
-- Decisão do professor (16/09/2026): na prática o bimestre não segue o
-- calendário. Cada disciplina de cada turma tem uma meta de h/aula por
-- bimestre; com meta 10, o 1º bimestre termina na 10ª h/aula, o 2º na 20ª...
--
-- A página já calcula isso para o contador de aulas (Casavequia:
-- pcDiaryAssignBimestersByLoad; Hermínio: rhColetarMapaBimestresPanes). Agora
-- ela envia o bimestre de cada aula ("b") e as metas ("metas") no retrato, e o
-- banco guarda exatamente o que o contador mostra.
--
-- Remove: relatorio_bimestres e relatorio_bimestre_da_data (datas fixas).
-- Cria:   relatorio_metas_bimestrais e a view relatorio_bimestres_por_carga
--         (início, fim, h/aula e situação de cada bimestre por turma/disciplina).
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.relatorio_bimestre_da_data(uuid, date);
DROP TABLE IF EXISTS public.relatorio_bimestres;

CREATE TABLE IF NOT EXISTS public.relatorio_metas_bimestrais (
  escola_id      uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  turma_codigo   text NOT NULL,
  disciplina     text NOT NULL,
  aulas_bimestre integer NOT NULL CHECK (aulas_bimestre >= 0),
  aulas_ano      integer,
  credito_anterior integer NOT NULL DEFAULT 0,  -- h/aula dadas antes dos relatos digitais
  atualizada_em  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (escola_id, turma_codigo, disciplina)
);

ALTER TABLE public.relatorio_metas_bimestrais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS relatorio_metas_bimestrais_admin ON public.relatorio_metas_bimestrais;
CREATE POLICY relatorio_metas_bimestrais_admin ON public.relatorio_metas_bimestrais
  FOR ALL TO authenticated
  USING ((SELECT private.is_relatorio_admin())) WITH CHECK ((SELECT private.is_relatorio_admin()));
REVOKE ALL ON public.relatorio_metas_bimestrais FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relatorio_metas_bimestrais TO authenticated;

-- h/aula que o contador atribui a ESTA disciplina (um relato pode dividir a
-- carga entre disciplinas; 0 quando o contador não conta a aula).
ALTER TABLE public.relatorio_aulas
  ADD COLUMN IF NOT EXISTS horas_disciplina numeric(4,1) NOT NULL DEFAULT 0;

-- Início e fim de cada bimestre, medidos pelas aulas registradas.
-- "concluido": a soma de h/aula (com o crédito anterior) alcançou a meta, ou
-- o bimestre seguinte já começou (aula que cruza o limite fica no anterior).
DROP VIEW IF EXISTS public.relatorio_bimestres_por_carga;
CREATE VIEW public.relatorio_bimestres_por_carga
WITH (security_invoker = true) AS
WITH por_bimestre AS (
  SELECT a.escola_id, a.turma_codigo, a.disciplina, a.bimestre,
         min(a.data) AS inicio,
         max(a.data) AS ultima_aula,
         sum(a.horas_disciplina) AS horas_registradas,
         count(*) FILTER (WHERE a.tem_atividade) AS atividades,
         count(*) FILTER (WHERE a.tem_atividade AND a.atividade_vale_ponto) AS atividades_valendo_ponto
  FROM public.relatorio_aulas a
  WHERE NOT a.removida
  GROUP BY 1, 2, 3, 4
),
acumulado AS (
  SELECT p.*,
         sum(p.horas_registradas) OVER (PARTITION BY p.escola_id, p.turma_codigo, p.disciplina ORDER BY p.bimestre)
           + COALESCE(m.credito_anterior, 0) AS horas_acumuladas,
         max(p.bimestre) OVER (PARTITION BY p.escola_id, p.turma_codigo, p.disciplina) AS bimestre_atual,
         m.aulas_bimestre
  FROM por_bimestre p
  LEFT JOIN public.relatorio_metas_bimestrais m
    ON m.escola_id = p.escola_id AND m.turma_codigo = p.turma_codigo AND m.disciplina = p.disciplina
),
situacao AS (
  SELECT a.*,
         (a.bimestre < a.bimestre_atual
           OR (a.aulas_bimestre > 0 AND a.horas_acumuladas >= a.bimestre * a.aulas_bimestre)) AS concluido
  FROM acumulado a
)
SELECT escola_id, turma_codigo, disciplina, bimestre, aulas_bimestre,
       inicio,
       CASE WHEN concluido THEN ultima_aula END AS fim,
       ultima_aula,
       horas_registradas,
       horas_acumuladas,
       concluido,
       atividades,
       atividades_valendo_ponto
FROM situacao;

GRANT SELECT ON public.relatorio_bimestres_por_carga TO authenticated;
REVOKE ALL ON public.relatorio_bimestres_por_carga FROM anon;

-- Publicação: igual à Etapa 2, com bimestre vindo do retrato e metas gravadas.
CREATE OR REPLACE FUNCTION public.relatorio_publicar_lancamentos(p_escola_slug text, p_snapshot jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escola_id        uuid;
  v_aulas_existentes integer;
  v_aulas_retrato    integer;
  v_ocorr_existentes integer;
  v_ocorr_retrato    integer;
  v_pode_remover     boolean;
  v_pode_remover_oc  boolean;
  v_lancamentos      integer;
  v_sem_vinculo      jsonb;
BEGIN
  IF COALESCE(auth.role(), 'service_role') <> 'service_role' AND NOT COALESCE((SELECT private.is_relatorio_admin()), false) THEN
    RAISE EXCEPTION 'Apenas o administrador pode publicar lançamentos.' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_escola_id FROM escolas WHERE slug = p_escola_slug;
  IF v_escola_id IS NULL THEN
    RAISE EXCEPTION 'Escola % não encontrada.', p_escola_slug;
  END IF;

  -- Metas por turma/disciplina (o que o contador da página usa).
  INSERT INTO relatorio_metas_bimestrais AS mb (escola_id, turma_codigo, disciplina, aulas_bimestre, aulas_ano, credito_anterior, atualizada_em)
  SELECT v_escola_id, m ->> 't', m ->> 'disc', (m ->> 'meta')::int, NULLIF(m ->> 'total', '')::int,
         COALESCE(NULLIF(m ->> 'credito', '')::int, 0), now()
  FROM jsonb_array_elements(COALESCE(p_snapshot -> 'metas', '[]'::jsonb)) AS m
  WHERE COALESCE(m ->> 't', '') <> '' AND COALESCE(m ->> 'disc', '') <> '' AND (m ->> 'meta') ~ '^\d+$'
  ON CONFLICT (escola_id, turma_codigo, disciplina) DO UPDATE
    SET aulas_bimestre = EXCLUDED.aulas_bimestre,
        aulas_ano = EXCLUDED.aulas_ano,
        credito_anterior = EXCLUDED.credito_anterior,
        atualizada_em = now()
    WHERE (mb.aulas_bimestre, mb.aulas_ano, mb.credito_anterior)
      IS DISTINCT FROM (EXCLUDED.aulas_bimestre, EXCLUDED.aulas_ano, EXCLUDED.credito_anterior);

  CREATE TEMP TABLE IF NOT EXISTS _rel_alunos (turma text, n integer, nome text, tr boolean, aluno_id uuid) ON COMMIT DROP;
  CREATE TEMP TABLE IF NOT EXISTS _rel_aulas (
    id text, codigo text, turma text, data date, bimestre smallint, disciplina text, horario text, tema text,
    carga numeric, horas_disciplina numeric, p jsonb, a jsonb
  ) ON COMMIT DROP;
  TRUNCATE _rel_alunos, _rel_aulas;

  INSERT INTO _rel_alunos (turma, n, nome, tr, aluno_id)
  SELECT t ->> 'codigo', (al ->> 0)::int, al ->> 1, COALESCE((al ->> 2)::boolean, false),
         relatorio_resolver_aluno(v_escola_id, t ->> 'codigo', al ->> 1)
  FROM jsonb_array_elements(COALESCE(p_snapshot -> 'turmas', '[]'::jsonb)) AS t
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t -> 'alunos', '[]'::jsonb)) AS al
  WHERE (al ->> 0) ~ '^\d+$';

  INSERT INTO _rel_aulas
  SELECT p_escola_slug || ':' || (x ->> 'c'), x ->> 'c', x ->> 't', (x ->> 'd')::date,
         LEAST(4, GREATEST(1, COALESCE(NULLIF(x ->> 'b', '')::int, 1)))::smallint,
         COALESCE(x ->> 'disc', ''), NULLIF(x ->> 'h', ''), NULLIF(x ->> 'tema', ''),
         COALESCE(NULLIF(x ->> 'carga', '')::numeric, 1),
         COALESCE(NULLIF(x ->> 'hd', '')::numeric, NULLIF(x ->> 'carga', '')::numeric, 1),
         NULLIF(x -> 'p', 'null'::jsonb), NULLIF(x -> 'a', 'null'::jsonb)
  FROM jsonb_array_elements(COALESCE(p_snapshot -> 'aulas', '[]'::jsonb)) AS x
  WHERE COALESCE(x ->> 'c', '') <> '' AND (x ->> 'd') ~ '^\d{4}-\d{2}-\d{2}$';

  SELECT count(*) INTO v_aulas_retrato FROM _rel_aulas;
  SELECT count(*) INTO v_aulas_existentes FROM relatorio_aulas WHERE escola_id = v_escola_id AND NOT removida;
  v_pode_remover := v_aulas_existentes < 20 OR v_aulas_retrato >= v_aulas_existentes * 0.8;

  INSERT INTO relatorio_aulas AS ra
    (id, escola_id, turma_codigo, codigo, disciplina, data, bimestre, horario, tema, carga, horas_disciplina,
     tem_presenca, tem_atividade, removida, publicada_em, atualizada_em)
  SELECT id, v_escola_id, turma, codigo, disciplina, data, bimestre,
         horario, tema, carga, horas_disciplina, p IS NOT NULL, a IS NOT NULL, false, now(), now()
  FROM _rel_aulas
  ON CONFLICT (id) DO UPDATE
    SET turma_codigo  = EXCLUDED.turma_codigo,
        disciplina    = EXCLUDED.disciplina,
        data          = EXCLUDED.data,
        bimestre      = EXCLUDED.bimestre,
        horario       = EXCLUDED.horario,
        tema          = EXCLUDED.tema,
        carga         = EXCLUDED.carga,
        horas_disciplina = EXCLUDED.horas_disciplina,
        tem_presenca  = EXCLUDED.tem_presenca,
        tem_atividade = EXCLUDED.tem_atividade,
        removida      = false,
        atualizada_em = now()
    WHERE (ra.turma_codigo, ra.disciplina, ra.data, ra.bimestre, ra.horario, ra.tema, ra.carga, ra.horas_disciplina, ra.tem_presenca, ra.tem_atividade, ra.removida)
      IS DISTINCT FROM
          (EXCLUDED.turma_codigo, EXCLUDED.disciplina, EXCLUDED.data, EXCLUDED.bimestre, EXCLUDED.horario, EXCLUDED.tema, EXCLUDED.carga, EXCLUDED.horas_disciplina, EXCLUDED.tem_presenca, EXCLUDED.tem_atividade, false);

  IF v_pode_remover THEN
    UPDATE relatorio_aulas ra SET removida = true, atualizada_em = now()
    WHERE ra.escola_id = v_escola_id AND NOT ra.removida
      AND NOT EXISTS (SELECT 1 FROM _rel_aulas x WHERE x.id = ra.id);
  END IF;

  WITH novos AS (
    SELECT x.id AS aula_id, al.n AS numero_chamada, al.nome AS nome_relatorio, al.tr AS transferido, al.aluno_id,
           CASE x.p ->> al.n::text WHEN 'p' THEN 'presente' WHEN 'f' THEN 'falta' WHEN 'j' THEN 'falta_justificada' END AS presenca,
           CASE x.a ->> al.n::text WHEN 'fz' THEN 'fez' WHEN 'nf' THEN 'nao_fez' WHEN 'ag' THEN 'aguardando' WHEN 'pd' THEN 'pendente' END AS atividade
    FROM _rel_aulas x
    JOIN _rel_alunos al ON al.turma = x.turma
  ),
  gravados AS (
    INSERT INTO relatorio_lancamentos AS rl
      (aula_id, numero_chamada, nome_relatorio, transferido, aluno_id, presenca, atividade)
    SELECT aula_id, numero_chamada, nome_relatorio, transferido, aluno_id, presenca, atividade FROM novos
    ON CONFLICT (aula_id, numero_chamada) DO UPDATE
      SET nome_relatorio = EXCLUDED.nome_relatorio,
          transferido    = EXCLUDED.transferido,
          aluno_id       = EXCLUDED.aluno_id,
          presenca       = EXCLUDED.presenca,
          atividade      = EXCLUDED.atividade
      WHERE (rl.nome_relatorio, rl.transferido, rl.aluno_id, rl.presenca, rl.atividade)
        IS DISTINCT FROM (EXCLUDED.nome_relatorio, EXCLUDED.transferido, EXCLUDED.aluno_id, EXCLUDED.presenca, EXCLUDED.atividade)
    RETURNING 1
  )
  SELECT count(*) INTO v_lancamentos FROM gravados;

  DELETE FROM relatorio_lancamentos rl
  USING _rel_aulas x
  WHERE rl.aula_id = x.id
    AND NOT EXISTS (SELECT 1 FROM _rel_alunos al WHERE al.turma = x.turma AND al.n = rl.numero_chamada);

  CREATE TEMP TABLE IF NOT EXISTS _rel_ocorr (
    id text, turma text, relato text, data date, horario text, disciplina text,
    n integer, nome text, icone text, positiva boolean, texto text
  ) ON COMMIT DROP;
  TRUNCATE _rel_ocorr;

  INSERT INTO _rel_ocorr
  SELECT DISTINCT ON (oid)
    oid, turma, relato, data, horario, disciplina, n, nome, icone, positiva, texto
  FROM (
    SELECT md5(p_escola_slug || '|' || (o ->> 't') || '|' || (o ->> 'd') || '|' ||
               relatorio_normalizar_nome(o ->> 'nome') || '|' || relatorio_normalizar_nome(o ->> 'txt')) AS oid,
           o ->> 't' AS turma, NULLIF(o ->> 'r', '') AS relato, (o ->> 'd')::date AS data,
           NULLIF(o ->> 'h', '') AS horario, NULLIF(o ->> 'disc', '') AS disciplina,
           NULLIF(o ->> 'n', '')::int AS n, o ->> 'nome' AS nome, NULLIF(o ->> 'ic', '') AS icone,
           COALESCE((o ->> 'pos')::boolean, false) AS positiva, o ->> 'txt' AS texto
    FROM jsonb_array_elements(COALESCE(p_snapshot -> 'ocorrencias', '[]'::jsonb)) AS o
    WHERE COALESCE(o ->> 'nome', '') <> '' AND COALESCE(o ->> 'txt', '') <> ''
      AND (o ->> 'd') ~ '^\d{4}-\d{2}-\d{2}$'
  ) s;

  SELECT count(*) INTO v_ocorr_retrato FROM _rel_ocorr;
  SELECT count(*) INTO v_ocorr_existentes FROM relatorio_ocorrencias WHERE escola_id = v_escola_id AND NOT removida;
  v_pode_remover_oc := v_pode_remover AND (v_ocorr_existentes < 10 OR v_ocorr_retrato >= v_ocorr_existentes * 0.8);

  -- Bimestre da ocorrência = bimestre da aula do mesmo relato; sem aula
  -- correspondente, o da última aula da turma (mesma disciplina, se houver)
  -- até aquela data.
  INSERT INTO relatorio_ocorrencias AS ro
    (id, escola_id, turma_codigo, relato_codigo, data, bimestre, horario, disciplina, numero_chamada,
     nome_relatorio, aluno_id, icone, positiva, texto, removida, publicada_em, atualizada_em)
  SELECT o.id, v_escola_id, o.turma, o.relato, o.data,
         COALESCE(
           (SELECT x.bimestre FROM _rel_aulas x WHERE x.codigo = o.relato LIMIT 1),
           (SELECT x.bimestre FROM _rel_aulas x
             WHERE x.turma = o.turma AND x.data <= o.data
             ORDER BY (x.disciplina = COALESCE(o.disciplina, '')) DESC, x.data DESC, x.codigo DESC LIMIT 1),
           1
         ),
         o.horario, o.disciplina,
         COALESCE(o.n, (SELECT al.n FROM _rel_alunos al WHERE al.turma = o.turma
                         AND relatorio_normalizar_nome(al.nome) = relatorio_normalizar_nome(o.nome) LIMIT 1)),
         o.nome,
         COALESCE(
           (SELECT al.aluno_id FROM _rel_alunos al WHERE al.turma = o.turma AND al.n = o.n),
           relatorio_resolver_aluno(v_escola_id, o.turma, regexp_replace(o.nome, '\s*\([^)]*\)', '', 'g'))
         ),
         o.icone, o.positiva, o.texto, false, now(), now()
  FROM _rel_ocorr o
  ON CONFLICT (id) DO UPDATE
    SET relato_codigo  = EXCLUDED.relato_codigo,
        bimestre       = EXCLUDED.bimestre,
        horario        = EXCLUDED.horario,
        disciplina     = EXCLUDED.disciplina,
        numero_chamada = EXCLUDED.numero_chamada,
        aluno_id       = EXCLUDED.aluno_id,
        icone          = EXCLUDED.icone,
        positiva       = EXCLUDED.positiva,
        removida       = false,
        atualizada_em  = now()
    WHERE (ro.relato_codigo, ro.bimestre, ro.horario, ro.disciplina, ro.numero_chamada, ro.aluno_id, ro.icone, ro.positiva, ro.removida)
      IS DISTINCT FROM
          (EXCLUDED.relato_codigo, EXCLUDED.bimestre, EXCLUDED.horario, EXCLUDED.disciplina, EXCLUDED.numero_chamada, EXCLUDED.aluno_id, EXCLUDED.icone, EXCLUDED.positiva, false);

  IF v_pode_remover_oc THEN
    UPDATE relatorio_ocorrencias ro SET removida = true, atualizada_em = now()
    WHERE ro.escola_id = v_escola_id AND NOT ro.removida
      AND NOT EXISTS (SELECT 1 FROM _rel_ocorr o WHERE o.id = ro.id);
  END IF;

  SELECT COALESCE(jsonb_agg(DISTINCT al.turma || ' · ' || al.nome), '[]'::jsonb) INTO v_sem_vinculo
  FROM _rel_alunos al
  JOIN relatorio_turmas_diarias td ON td.escola_id = v_escola_id AND td.turma_codigo = al.turma
  JOIN relatorio_turmas t ON t.scope_key = ANY (td.scope_keys) AND t.grupo_turma_id IS NOT NULL
  WHERE al.aluno_id IS NULL AND NOT al.tr;

  RETURN jsonb_build_object(
    'escola', p_escola_slug,
    'aulas', v_aulas_retrato,
    'lancamentos_alterados', v_lancamentos,
    'ocorrencias', v_ocorr_retrato,
    'remocao_aplicada', v_pode_remover,
    'alunos_sem_vinculo', v_sem_vinculo
  );
END;
$$;

REVOKE ALL ON FUNCTION public.relatorio_publicar_lancamentos(text, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_publicar_lancamentos(text, jsonb) TO authenticated;
