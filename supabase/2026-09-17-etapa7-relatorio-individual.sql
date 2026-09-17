-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPA 7 — Relatório individual do aluno (fonte única do PDF)
-- ───────────────────────────────────────────────────────────────────────────
-- Uma função devolve TUDO o que entra no relatório de um aluno, no bimestre
-- escolhido ou no ano todo:
--   • notas (o mesmo get_meu_boletim: trabalhos, prova, recuperação, bônus
--     do Ranking de Poder);
--   • aulas e atividades: data, disciplina, tema, h/aula, presença, atividade
--     (fez, não fez, aguardando) e se a atividade vale ponto;
--   • frequência por disciplina, em h/aula;
--   • comportamento: data, horário, disciplina, gravidade, categoria,
--     interferência na aula, papel e o texto do registro.
--
-- Professor e aluno leem daqui, então o PDF sai igual para os dois
-- (assets/js/relatorio-individual.js, cópia idêntica nos dois repositórios).
--
-- Quem pode ler: o administrador ou o próprio aluno com a sessão dele
-- (a mesma checagem do get_meu_boletim). Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.relatorio_individual(
  p_aluno_id uuid,
  p_bimestre text DEFAULT NULL,
  p_session_token uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_boletim     jsonb;
  v_aulas       jsonb;
  v_frequencia  jsonb;
  v_ocorrencias jsonb;
  v_conduta     jsonb;
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

  RETURN jsonb_build_object(
    'geradoEm', now(),
    'bimestre', p_bimestre,
    'boletins', v_boletim -> 'boletins',
    'aulas', v_aulas,
    'frequencia', v_frequencia,
    'ocorrencias', v_ocorrencias,
    'resumoConduta', v_conduta
  );
END;
$$;

REVOKE ALL ON FUNCTION public.relatorio_individual(uuid, text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.relatorio_individual(uuid, text, uuid) TO authenticated, anon;
