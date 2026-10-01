-- ════════════════════════════════════════════════════════════════════════
-- Relatório Individual: ATIVIDADES EXTRAS (01/10/2026)
-- ────────────────────────────────────────────────────────────────────────
-- A correção do professor das atividades extras da Biblioteca
-- (extra_activity_correcoes: nota, parecer sobre I.A., critérios e o
-- relatório de correção) passa a entrar no Relatório Individual Anual do
-- Aluno, como o relatório de provas.
--
-- relatorio_individual devolve 'atividadesExtras': cada atividade extra
-- publicada para a turma do aluno (ou já corrigida para ele), com a entrega
-- (no prazo, atrasada ou não entregue) e a correção, quando houver.
-- A permissão continua em relatorio_individual_base (admin ou a sessão do
-- próprio aluno); o aluno vê a própria correção.
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.relatorio_individual(p_aluno_id uuid, p_bimestre text DEFAULT NULL::text, p_session_token uuid DEFAULT NULL::uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_base    jsonb;
  v_provas  jsonb;
  v_extras  jsonb;
BEGIN
  -- A base confere a permissão (levanta erro se a sessão não valer).
  v_base := public.relatorio_individual_base(p_aluno_id, p_bimestre, p_session_token);

  SELECT COALESCE(jsonb_agg(
           x.e || jsonb_build_object('questoes', COALESCE((
             SELECT jsonb_agg(jsonb_build_object('n', t.ord, 'marcou', NULLIF(t.a ->> 'selectedAnswer', ''),
                      'correta', t.a ->> 'correctAnswer', 'ok', COALESCE((t.a ->> 'isCorrect')::boolean, false)) ORDER BY t.ord)
               FROM public.relatorio_provas_livros p
               JOIN public.quiz_results q ON q.user_id = p.aluno_id AND q.book_path = p.book_path AND q.quiz_id = p.quiz_id
               CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(q.answers) = 'array' THEN q.answers ELSE '[]'::jsonb END) WITH ORDINALITY AS t(a, ord)
              WHERE p.aluno_id = p_aluno_id AND p.disciplina = x.e ->> 'disciplina'
                AND p.bimestre = x.e ->> 'bimestre' AND p.recuperacao = (x.e ->> 'recuperacao')::boolean
           ), '[]'::jsonb)) ORDER BY x.ord), '[]'::jsonb)
    INTO v_provas
    FROM jsonb_array_elements(COALESCE(v_base -> 'provas', '[]'::jsonb)) WITH ORDINALITY AS x(e, ord);

  -- Atividades extras da turma do aluno + as que já têm correção para ele.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', a.id,
           'tema', a.tema,
           'subtema', a.subtema,
           'disciplina', a.disciplina,
           'bimestre', a.bimestre::text,
           'prazo', a.prazo_at,
           'entregue', r.envios IS NOT NULL,
           'atrasado', r.envios IS NOT NULL AND r.no_prazo = 0,
           'entregueEm', r.ultimo,
           'nota', c.nota,
           'notaMax', c.nota_max,
           'usoIa', c.uso_ia,
           'criterios', COALESCE(c.criterios, '[]'::jsonb),
           'resumo', c.resumo,
           'relatorioHtml', c.relatorio_html,
           'corrigidoEm', COALESCE(c.atualizado_em, c.corrigido_em)
         ) ORDER BY a.prazo_at NULLS LAST, a.created_at), '[]'::jsonb)
    INTO v_extras
    FROM public.extra_activities a
    LEFT JOIN public.extra_activity_correcoes c ON c.activity_id = a.id AND c.aluno_id = p_aluno_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS envios, MAX(er.enviado_em) AS ultimo,
             COUNT(*) FILTER (WHERE NOT er.atrasado) AS no_prazo
        FROM public.extra_activity_respostas er
       WHERE er.activity_id = a.id AND er.aluno_id = p_aluno_id
      HAVING COUNT(*) > 0
    ) r ON true
   WHERE c.id IS NOT NULL
      OR ((a.publicada_at IS NULL OR a.publicada_at <= now())
          AND EXISTS (SELECT 1
                        FROM public.extra_activity_turmas eat
                        JOIN public.alunos al ON al.grupo_turma_id = eat.grupo_turma_id
                       WHERE eat.activity_id = a.id AND al.id = p_aluno_id));

  RETURN v_base || jsonb_build_object('provas', v_provas, 'atividadesExtras', v_extras);
END;
$function$;
