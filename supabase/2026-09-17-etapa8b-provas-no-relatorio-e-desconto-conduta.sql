-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPA 8B — Relatório da prova no documento e desconto por comportamento
-- ───────────────────────────────────────────────────────────────────────────
-- 1. RELATÓRIO DE PROVAS: o Relatório Individual Anual passa a trazer, para
--    cada Avaliação Bimestral do livro, o mesmo resultado que o aluno vê ao
--    terminar a prova: nota, aproveitamento, acertos, erros, não respondidas,
--    tempo e o desempenho por habilidade (descritor). Os dados saem do log de
--    respostas gravado em quiz_results.answers.
--    A view relatorio_provas_livros concentra o mapeamento livro → escola,
--    série, disciplina e bimestre; relatorio_provas_bimestrais passa a ler dela.
--
-- 2. COMPORTAMENTO DESCONTA NOTA (decisão do professor em 17/09/2026, que
--    substitui a regra "comportamento não desconta nota"):
--      leve 0,25 · médio 0,5 · grave 1,0 · muito grave 2,0 por ocorrência de
--      quem praticou o ato, na nota do bimestre da disciplina em que aconteceu,
--      até 2,0 pontos por bimestre; a nota não fica abaixo de 0.
--    Vítima, testemunha, envolvido, destaque, "sem infração" e registros
--    positivos não descontam. Ocorrência sem disciplina não desconta.
--    O motor (boletim-regras.js) aplica antes da recuperação.
--    Interruptor por escola: relatorio_regras_escola.desconto_conduta
--    (Casavequia ligado; Hermínio desligado, boletins mantidos como estão).
-- Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.relatorio_regras_escola
  ADD COLUMN IF NOT EXISTS desconto_conduta boolean NOT NULL DEFAULT false;
UPDATE public.relatorio_regras_escola r SET desconto_conduta = true, atualizada_em = now()
  FROM public.escolas e
 WHERE e.id = r.escola_id AND e.slug = 'padre-carlos-casavequia' AND NOT r.desconto_conduta;

-- Pontos por nível (uma fonte só para o banco).
CREATE OR REPLACE FUNCTION public.relatorio_pontos_conduta(p_gravidade text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_gravidade WHEN 'leve' THEN 0.25 WHEN 'medio' THEN 0.5 WHEN 'grave' THEN 1.0 WHEN 'muito_grave' THEN 2.0 ELSE 0 END;
$$;

-- Desconto de um aluno numa disciplina e bimestre: {pontos (até 2,0), bruto, ocorrencias}.
CREATE OR REPLACE FUNCTION public.relatorio_desconto_conduta(p_aluno_id uuid, p_escola_id uuid, p_disciplina text, p_bimestre text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
           'pontos', LEAST(2.0, COALESCE(sum(relatorio_pontos_conduta(o.gravidade)), 0)),
           'bruto', COALESCE(sum(relatorio_pontos_conduta(o.gravidade)), 0),
           'ocorrencias', count(*))
  FROM relatorio_ocorrencias o
  WHERE o.aluno_id = p_aluno_id AND o.escola_id = p_escola_id
    AND NOT o.removida AND NOT o.positiva AND NOT o.sem_infracao
    AND o.papel = 'autor' AND o.gravidade IS NOT NULL
    AND o.disciplina IS NOT NULL
    AND relatorio_normalizar_nome(o.disciplina) = relatorio_normalizar_nome(p_disciplina)
    AND o.bimestre::text = p_bimestre;
$$;
REVOKE ALL ON FUNCTION public.relatorio_desconto_conduta(uuid, uuid, text, text) FROM public, anon, authenticated;

-- Painel do professor: desconto por aluno do painel, disciplina e bimestre.
CREATE OR REPLACE VIEW public.relatorio_descontos_conduta AS
SELECT v.scope_key, v.aluno_relatorio_id, o.disciplina, o.bimestre::text AS bimestre,
       LEAST(2.0, sum(relatorio_pontos_conduta(o.gravidade))) AS pontos,
       sum(relatorio_pontos_conduta(o.gravidade)) AS bruto,
       count(*)::int AS ocorrencias,
       COALESCE(bool_or(rg.desconto_conduta), false) AS regra_ligada
FROM public.relatorio_ocorrencias o
JOIN public.relatorio_aluno_vinculo v ON v.aluno_id = o.aluno_id
JOIN public.relatorio_turmas t ON t.scope_key = v.scope_key AND t.escola_id = o.escola_id
LEFT JOIN public.relatorio_regras_escola rg ON rg.escola_id = o.escola_id
WHERE NOT o.removida AND NOT o.positiva AND NOT o.sem_infracao
  AND o.papel = 'autor' AND o.gravidade IS NOT NULL AND o.disciplina IS NOT NULL
  AND (SELECT private.is_relatorio_admin())
GROUP BY v.scope_key, v.aluno_relatorio_id, o.disciplina, o.bimestre;
REVOKE ALL ON public.relatorio_descontos_conduta FROM anon;
GRANT SELECT ON public.relatorio_descontos_conduta TO authenticated;

-- ── Provas dos livros, com o log de respostas ───────────────────────────────
DROP VIEW IF EXISTS public.relatorio_provas_bimestrais;
DROP VIEW IF EXISTS public.relatorio_provas_livros;
CREATE VIEW public.relatorio_provas_livros
WITH (security_invoker = true) AS
WITH livros AS (
  SELECT q.user_id AS aluno_id, q.book_path, q.quiz_id,
         (q.book_path LIKE '/livros/raimundo-herminio-de-melo-2/%') AS herminio,
         (regexp_match(q.book_path, '/([a-z0-9-]+)/([a-z0-9-]+)/[1-4]-bimestre[a-z0-9-]*\.html$')) AS partes,
         (regexp_match(q.book_path, '/([1-4])-bimestre[a-z0-9-]*\.html$'))[1] AS bimestre,
         q.quiz_id ~ '-rec$' AS recuperacao,
         q.correct, q.total,
         round(10.0 * q.correct / q.total, 1) AS nota,
         q.completed_at,
         CASE WHEN jsonb_typeof(q.answers) = 'array' THEN q.answers ELSE '[]'::jsonb END AS respostas
  FROM public.quiz_results q
  WHERE q.quiz_id ~ '^prova-'
    AND q.quiz_id !~ '-teste-[0-9]+$'   -- testes do admin nunca entram no boletim
    AND q.total BETWEEN 1 AND 100 AND q.correct BETWEEN 0 AND q.total
    AND q.book_path ~ '^/livros/'
    AND (jsonb_typeof(q.answers) <> 'array'
         OR q.correct = (SELECT count(*) FROM jsonb_array_elements(q.answers) e WHERE (e ->> 'isCorrect')::boolean))
)
SELECT l.aluno_id, l.book_path, l.quiz_id, l.bimestre, l.recuperacao, l.correct, l.total, l.nota, l.completed_at,
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
       END AS disciplina,
       -- Mesmo resumo da tela de resultado do aluno (prova-report.js).
       (SELECT count(*) FROM jsonb_array_elements(l.respostas) e
         WHERE NULLIF(e ->> 'selectedAnswer', '') IS NOT NULL AND NOT COALESCE((e ->> 'isCorrect')::boolean, false))::int AS erros,
       GREATEST(0, l.total - l.correct
         - (SELECT count(*) FROM jsonb_array_elements(l.respostas) e
             WHERE NULLIF(e ->> 'selectedAnswer', '') IS NOT NULL AND NOT COALESCE((e ->> 'isCorrect')::boolean, false)))::int AS nao_respondidas,
       (SELECT sum(COALESCE((e ->> 'seconds')::int, 0)) FROM jsonb_array_elements(l.respostas) e)::int AS tempo_segundos,
       (SELECT COALESCE(jsonb_agg(jsonb_build_object('codigo', x.codigo, 'nome', x.nome, 'acertos', x.acertos, 'total', x.total) ORDER BY x.codigo), '[]'::jsonb)
          FROM (SELECT COALESCE(NULLIF(e ->> 'descriptorCode', ''), '—') AS codigo, max(e ->> 'descriptorName') AS nome,
                       count(*) FILTER (WHERE (e ->> 'isCorrect')::boolean)::int AS acertos, count(*)::int AS total
                  FROM jsonb_array_elements(l.respostas) e
                 GROUP BY 1) x) AS descritores
FROM livros l
WHERE l.partes IS NOT NULL AND l.bimestre IS NOT NULL;

GRANT SELECT ON public.relatorio_provas_livros TO authenticated;
REVOKE ALL ON public.relatorio_provas_livros FROM anon;

CREATE VIEW public.relatorio_provas_bimestrais
WITH (security_invoker = true) AS
WITH dos_livros AS (
  SELECT v.scope_key, v.aluno_relatorio_id, v.nome_relatorio, m.aluno_id, m.disciplina, m.bimestre,
         max(m.nota) AS nota_prova,
         max(m.nota) FILTER (WHERE NOT m.recuperacao) AS nota_primeira,
         max(m.nota) FILTER (WHERE m.recuperacao) AS nota_recuperacao,
         max(m.completed_at) AS realizada_em,
         min(m.book_path) AS livro_path
  FROM public.relatorio_provas_livros m
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

-- ── Boletim do aluno: regra e desconto por bimestre ─────────────────────────
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
           COALESCE(rg.recuperacao_semestral, false) AS recuperacao,
           COALESCE(rg.bonus_poder, false) AS bonus_poder,
           COALESCE(rg.desconto_conduta, false) AS desconto_conduta
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
          -- Comportamento desconta nota (17/09/2026): pontos da disciplina no bimestre, já limitados.
          'descontoConduta', relatorio_desconto_conduta(p_aluno_id, v_turma.escola_id, v_disc, v_b),
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
      'regras', jsonb_build_object('bimestresAutomaticos', to_jsonb(v_regras.automaticos), 'recuperacaoSemestral', v_regras.recuperacao,
                                   'bonusPoder', v_regras.bonus_poder, 'descontoConduta', v_regras.desconto_conduta),
      -- Etapa 6: pontos do Ranking de Poder (o motor calcula o nível e o bônus).
      'pontosPoder', (SELECT al.pontos FROM alunos al WHERE al.id = p_aluno_id),
      'disciplinas', v_disciplinas,
      'atualizadoEm', v_turma.updated_at
    ));
  END LOOP;

  RETURN jsonb_build_object('boletins', v_resultado, 'geradoEm', now());
END;
$function$;

-- ── Relatório individual: relatório de cada prova ───────────────────────────
CREATE OR REPLACE FUNCTION public.relatorio_individual(p_aluno_id uuid, p_bimestre text DEFAULT NULL::text, p_session_token uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_boletim     jsonb;
  v_aulas       jsonb;
  v_frequencia  jsonb;
  v_ocorrencias jsonb;
  v_conduta     jsonb;
  v_provas      jsonb;
  v_bim         smallint := NULLIF(p_bimestre, '')::smallint;
BEGIN
  -- Confere a permissão e traz as notas (levanta erro se a sessão não valer).
  v_boletim := public.get_meu_boletim(p_aluno_id, p_session_token);

  SELECT COALESCE(jsonb_agg(x ORDER BY x ->> 'data', x ->> 'disciplina'), '[]'::jsonb) INTO v_aulas
  FROM (
    SELECT jsonb_build_object(
             'data', a.data, 'bimestre', a.bimestre, 'disciplina', a.disciplina,
             'tema', a.tema, 'horario', a.horario, 'carga', a.carga,
             'presenca', l.presenca, 'atividade', l.atividade,
             'temAtividade', a.tem_atividade, 'valePonto', a.atividade_vale_ponto
           ) AS x
    FROM relatorio_lancamentos l
    JOIN relatorio_aulas a ON a.id = l.aula_id
    WHERE l.aluno_id = p_aluno_id AND NOT a.removida
      AND (v_bim IS NULL OR a.bimestre = v_bim)
  ) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'disciplina', d.disciplina, 'bimestre', d.bimestre,
           'aulas', d.aulas, 'horas', d.horas,
           'presencas', d.presencas, 'faltas', d.faltas, 'faltasJustificadas', d.faltas_j,
           'semRegistro', d.sem_registro,
           'percentual', CASE WHEN d.horas > 0 THEN round(100 * d.presencas / d.horas, 1) END,
           'atividadesFez', d.fez, 'atividadesNaoFez', d.nao_fez, 'atividadesAguardando', d.aguardando
         ) ORDER BY d.disciplina, d.bimestre), '[]'::jsonb) INTO v_frequencia
  FROM (
    SELECT a.disciplina, a.bimestre,
           count(*)::int AS aulas,
           COALESCE(sum(a.carga), 0) AS horas,
           COALESCE(sum(a.carga) FILTER (WHERE l.presenca = 'presente'), 0) AS presencas,
           COALESCE(sum(a.carga) FILTER (WHERE l.presenca = 'falta'), 0) AS faltas,
           COALESCE(sum(a.carga) FILTER (WHERE l.presenca = 'falta_justificada'), 0) AS faltas_j,
           COALESCE(sum(a.carga) FILTER (WHERE l.presenca IS NULL), 0) AS sem_registro,
           count(*) FILTER (WHERE l.atividade = 'fez')::int AS fez,
           count(*) FILTER (WHERE l.atividade = 'nao_fez')::int AS nao_fez,
           count(*) FILTER (WHERE l.atividade = 'aguardando')::int AS aguardando
    FROM relatorio_lancamentos l
    JOIN relatorio_aulas a ON a.id = l.aula_id
    WHERE l.aluno_id = p_aluno_id AND NOT a.removida
      AND (v_bim IS NULL OR a.bimestre = v_bim)
    GROUP BY a.disciplina, a.bimestre
  ) d;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'data', o.data, 'horario', o.horario, 'disciplina', o.disciplina, 'bimestre', o.bimestre,
           'papel', o.papel, 'positiva', o.positiva, 'semInfracao', o.sem_infracao,
           'gravidade', o.gravidade, 'gravidadeOrigem', o.gravidade_origem,
           'justificativa', o.gravidade_justificativa, 'categoria', o.categoria,
           'interferencia', o.interferencia, 'reincidencia', o.reincidencia_aplicada,
           'fraudeAcademica', o.fraude_academica, 'origem', o.origem,
           'descricao', o.contexto ->> 'descricao', 'texto', o.texto
         ) ORDER BY o.data DESC, o.horario DESC NULLS LAST), '[]'::jsonb) INTO v_ocorrencias
  FROM relatorio_ocorrencias o
  WHERE o.aluno_id = p_aluno_id AND NOT o.removida
    AND (v_bim IS NULL OR o.bimestre = v_bim);

  SELECT jsonb_build_object(
           'leve', count(*) FILTER (WHERE o.gravidade = 'leve' AND o.papel = 'autor'),
           'medio', count(*) FILTER (WHERE o.gravidade = 'medio' AND o.papel = 'autor'),
           'grave', count(*) FILTER (WHERE o.gravidade = 'grave' AND o.papel = 'autor'),
           'muitoGrave', count(*) FILTER (WHERE o.gravidade = 'muito_grave' AND o.papel = 'autor'),
           'destaques', count(*) FILTER (WHERE o.papel = 'destaque' OR o.positiva),
           'semInfracao', count(*) FILTER (WHERE o.sem_infracao),
           'aguardandoIA', count(*) FILTER (WHERE o.papel = 'autor' AND NOT o.positiva AND NOT o.sem_infracao AND o.gravidade IS NULL)
         ) INTO v_conduta
  FROM relatorio_ocorrencias o
  WHERE o.aluno_id = p_aluno_id AND NOT o.removida
    AND (v_bim IS NULL OR o.bimestre = v_bim);

  -- Relatório de cada prova do livro, como o aluno vê ao terminar (Etapa 8B).
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'disciplina', p.disciplina, 'bimestre', p.bimestre, 'recuperacao', p.recuperacao,
           'data', p.completed_at, 'acertos', p.correct, 'total', p.total, 'nota', p.nota,
           'erros', p.erros, 'naoRespondidas', p.nao_respondidas, 'tempoSegundos', p.tempo_segundos,
           'descritores', p.descritores
         ) ORDER BY p.disciplina, p.bimestre, p.recuperacao), '[]'::jsonb) INTO v_provas
  FROM relatorio_provas_livros p
  WHERE p.aluno_id = p_aluno_id
    AND (v_bim IS NULL OR p.bimestre = v_bim::text);

  RETURN jsonb_build_object(
    'geradoEm', now(),
    'provas', v_provas,
    'bimestre', p_bimestre,
    'boletins', v_boletim -> 'boletins',
    'aulas', v_aulas,
    'frequencia', v_frequencia,
    'ocorrencias', v_ocorrencias,
    'resumoConduta', v_conduta
  );
END;
$function$;
