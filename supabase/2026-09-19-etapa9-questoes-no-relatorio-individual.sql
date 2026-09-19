-- Etapa 9 — Relatório Individual: grade de questões de cada prova
-- O relatório de provas passa a mostrar a mesma tela "Resultado da Avaliação"
-- que o aluno vê ao terminar a prova. Faltava a lista de questões (o que o aluno
-- marcou, a alternativa correta e se acertou), que vem do log de respostas em
-- quiz_results.answers.
--
-- Em vez de copiar a função inteira, a versão atual vira relatorio_individual_base
-- (mesma permissão, mesmo conteúdo) e relatorio_individual passa a chamá-la e a
-- acrescentar "questoes" em cada item de "provas". Pode rodar mais de uma vez.

DO $$
BEGIN
  IF to_regprocedure('public.relatorio_individual_base(uuid,text,uuid)') IS NULL THEN
    ALTER FUNCTION public.relatorio_individual(uuid, text, uuid) RENAME TO relatorio_individual_base;
  END IF;
END $$;

-- A base só é chamada pela função nova.
REVOKE ALL ON FUNCTION public.relatorio_individual_base(uuid, text, uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.relatorio_individual(p_aluno_id uuid, p_bimestre text DEFAULT NULL::text, p_session_token uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_base    jsonb;
  v_provas  jsonb;
BEGIN
  -- A base confere a permissão (levanta erro se a sessão não valer).
  v_base := public.relatorio_individual_base(p_aluno_id, p_bimestre, p_session_token);

  SELECT COALESCE(jsonb_agg(
           x.e || jsonb_build_object('questoes', COALESCE((
             SELECT jsonb_agg(jsonb_build_object(
                      'n', t.ord,
                      'marcou', NULLIF(t.a ->> 'selectedAnswer', ''),
                      'correta', t.a ->> 'correctAnswer',
                      'ok', COALESCE((t.a ->> 'isCorrect')::boolean, false)
                    ) ORDER BY t.ord)
               FROM public.relatorio_provas_livros p
               JOIN public.quiz_results q
                 ON q.user_id = p.aluno_id AND q.book_path = p.book_path AND q.quiz_id = p.quiz_id
               CROSS JOIN LATERAL jsonb_array_elements(
                 CASE WHEN jsonb_typeof(q.answers) = 'array' THEN q.answers ELSE '[]'::jsonb END
               ) WITH ORDINALITY AS t(a, ord)
              WHERE p.aluno_id = p_aluno_id
                AND p.disciplina = x.e ->> 'disciplina'
                AND p.bimestre = x.e ->> 'bimestre'
                AND p.recuperacao = (x.e ->> 'recuperacao')::boolean
           ), '[]'::jsonb))
           ORDER BY x.ord), '[]'::jsonb)
    INTO v_provas
    FROM jsonb_array_elements(COALESCE(v_base -> 'provas', '[]'::jsonb)) WITH ORDINALITY AS x(e, ord);

  RETURN v_base || jsonb_build_object('provas', v_provas);
END;
$function$;

REVOKE ALL ON FUNCTION public.relatorio_individual(uuid, text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.relatorio_individual(uuid, text, uuid) TO authenticated, anon;
