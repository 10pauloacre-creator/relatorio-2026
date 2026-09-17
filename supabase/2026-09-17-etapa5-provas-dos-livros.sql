-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPA 5 — Prova da Biblioteca no boletim
-- ───────────────────────────────────────────────────────────────────────────
-- A Etapa 3B ligou o boletim ao sistema ANTIGO de provas da Biblioteca
-- (bimester_exam_templates/attempts/grades), que só tem 1 nota. As provas
-- de verdade são as do motor novo dos livros (assets/js/prova-runtime.js):
-- cada livro "N-bimestre.html" traz a Avaliação Bimestral, o resultado vai
-- para quiz_results com quiz_id "prova-<tema>" (1ª tentativa) e
-- "prova-<tema>-rec" (recuperação dentro do livro).
--
-- Regras (as mesmas que o livro mostra ao aluno):
--   - nota = acertos ÷ questões × 10;
--   - vale a MAIOR entre a prova e a recuperação do livro;
--   - bimestre = o do livro (conteúdo do bimestre), escola e série = as do
--     caminho do livro, e só entra no painel da mesma escola e série;
--   - resultado incoerente (acertos diferentes das respostas gravadas) fica
--     de fora.
-- O sistema antigo continua valendo onde tiver nota (fica a maior).
--
-- No boletim: prova digitada pelo professor tem prioridade; sem ela, entra a
-- prova da Biblioteca (3º e 4º bimestres da Casavequia: automático, com
-- ajuste opcional). Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS public.relatorio_provas_bimestrais;
CREATE VIEW public.relatorio_provas_bimestrais
WITH (security_invoker = true) AS
WITH livros AS (
  SELECT q.user_id AS aluno_id,
         q.book_path,
         (q.book_path LIKE '/livros/raimundo-herminio-de-melo-2/%') AS herminio,
         -- Casavequia: /livros/2-serie/<disciplina>/3-bimestre.html
         -- Hermínio:   /livros/raimundo-herminio-de-melo-2/<8-9|em-1|em-2-3>/<disciplina>/3-bimestre(-parte-2).html
         (regexp_match(q.book_path, '/([a-z0-9-]+)/([a-z0-9-]+)/[1-4]-bimestre[a-z0-9-]*\.html$')) AS partes,
         (regexp_match(q.book_path, '/([1-4])-bimestre[a-z0-9-]*\.html$'))[1] AS bimestre,
         q.quiz_id ~ '-rec$' AS recuperacao,
         q.correct, q.total,
         round(10.0 * q.correct / q.total, 1) AS nota,
         q.completed_at
  FROM public.quiz_results q
  WHERE q.quiz_id ~ '^prova-'
    AND q.total BETWEEN 1 AND 100 AND q.correct BETWEEN 0 AND q.total
    AND q.book_path ~ '^/livros/'
    AND (jsonb_typeof(q.answers) <> 'array'
         OR q.correct = (SELECT count(*) FROM jsonb_array_elements(q.answers) e WHERE (e ->> 'isCorrect')::boolean))
),
livros_mapeados AS (
  SELECT l.*,
         l.partes[2] AS disciplina_slug,
         CASE
           WHEN l.herminio AND l.partes[1] = '8-9' THEN '^herminio:panel:rh_alunos_8e9ano_'
           WHEN l.herminio AND l.partes[1] = 'em-1' THEN '^herminio:panel:rh_alunos_1serie_'
           WHEN l.herminio AND l.partes[1] = 'em-2-3' THEN '^herminio:panel:rh_alunos_(2|3)serie_'
           WHEN NOT l.herminio AND l.partes[1] ~ '^[1-3]-serie$' THEN '^casavequia:panel:pc_alunos_' || left(l.partes[1], 1) || 'serie_'
         END AS scope_padrao,
         CASE
           WHEN l.herminio THEN CASE l.partes[2]
             WHEN 'lingua-portuguesa' THEN 'Língua Portuguesa' WHEN 'artes' THEN 'Arte' WHEN 'arte' THEN 'Arte'
             WHEN 'ingles' THEN 'Inglês' WHEN 'espanhol' THEN 'Espanhol' WHEN 'redacao' THEN 'Redação'
             ELSE initcap(replace(l.partes[2], '-', ' ')) END
           ELSE public.relatorio_nome_disciplina(l.partes[2], initcap(replace(l.partes[2], '-', ' ')))
         END AS disciplina
  FROM livros l
  WHERE l.partes IS NOT NULL AND l.bimestre IS NOT NULL
),
dos_livros AS (
  SELECT v.scope_key, v.aluno_relatorio_id, v.nome_relatorio, m.aluno_id, m.disciplina, m.bimestre,
         max(m.nota) AS nota_prova,
         max(m.nota) FILTER (WHERE NOT m.recuperacao) AS nota_primeira,
         max(m.nota) FILTER (WHERE m.recuperacao) AS nota_recuperacao,
         max(m.completed_at) AS realizada_em,
         min(m.book_path) AS livro_path
  FROM livros_mapeados m
  JOIN public.relatorio_aluno_vinculo v ON v.aluno_id = m.aluno_id AND v.scope_key ~ m.scope_padrao
  WHERE m.scope_padrao IS NOT NULL
  GROUP BY v.scope_key, v.aluno_relatorio_id, v.nome_relatorio, m.aluno_id, m.disciplina, m.bimestre
),
do_sistema_antigo AS (
  SELECT v.scope_key, v.aluno_relatorio_id, v.nome_relatorio, g.aluno_id,
         public.relatorio_nome_disciplina(g.disciplina_slug, g.disciplina_nome) AS disciplina,
         g.bimestre::text AS bimestre,
         round(least(10, g.nota_prova / NULLIF(t.nota_maxima, 0) * 10), 1) AS nota_prova,
         round(least(10, g.nota_prova / NULLIF(t.nota_maxima, 0) * 10), 1) AS nota_primeira,
         NULL::numeric AS nota_recuperacao,
         COALESCE(a.submitted_at, g.updated_at) AS realizada_em,
         t.livro_path
  FROM public.bimester_grades g
  JOIN public.bimester_exam_attempts a ON a.id = g.prova_attempt_id AND a.status = 'finalizada'
  JOIN public.bimester_exam_templates t ON t.id = a.template_id
  JOIN public.relatorio_aluno_vinculo v ON v.aluno_id = g.aluno_id
  WHERE g.nota_prova IS NOT NULL
),
todas AS (
  SELECT 'livro'::text AS origem, * FROM dos_livros
  UNION ALL
  SELECT 'prova_antiga'::text, * FROM do_sistema_antigo
)
SELECT DISTINCT ON (scope_key, aluno_relatorio_id, disciplina, bimestre)
       scope_key, aluno_relatorio_id, nome_relatorio, aluno_id, disciplina, bimestre,
       nota_prova,
       nota_prova AS nota_prova_original,
       10::numeric AS nota_maxima,
       realizada_em,
       origem, nota_primeira, nota_recuperacao, livro_path
FROM todas
ORDER BY scope_key, aluno_relatorio_id, disciplina, bimestre, nota_prova DESC, realizada_em DESC;

GRANT SELECT ON public.relatorio_provas_bimestrais TO authenticated;
REVOKE ALL ON public.relatorio_provas_bimestrais FROM anon;

-- Índice para a view achar as provas depressa.
CREATE INDEX IF NOT EXISTS quiz_results_provas_idx
  ON public.quiz_results (user_id, book_path) WHERE quiz_id LIKE 'prova-%';

-- O boletim do aluno (perfil da Biblioteca) recebe o detalhe da prova do livro.
CREATE OR REPLACE FUNCTION public.get_meu_boletim(p_aluno_id uuid, p_session_token uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
                              ORDER BY p.realizada_em DESC LIMIT 1),
          -- Etapa 5: prova e recuperação feitas no livro (vale a maior).
          'provaDetalhe',   (SELECT jsonb_build_object('primeira', p.nota_primeira, 'recuperacao', p.nota_recuperacao,
                                                       'realizadaEm', p.realizada_em, 'origem', p.origem)
                              FROM relatorio_provas_bimestrais p
                              WHERE p.aluno_id = p_aluno_id AND p.scope_key = v_turma.scope_key
                                AND relatorio_normalizar_nome(p.disciplina) = relatorio_normalizar_nome(v_disc)
                                AND p.bimestre = v_b
                              LIMIT 1)
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
$function$;
