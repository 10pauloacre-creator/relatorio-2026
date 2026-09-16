-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPA 3 — Interruptor "vale ponto" e nota de trabalho automática
-- ───────────────────────────────────────────────────────────────────────────
-- Regras do professor (16/09/2026):
--   • Cada atividade registrada pode valer ponto ou não (interruptor na aba
--     📝 Atividades do relato). Por padrão, vale.
--   • Os 10 pontos de trabalho do bimestre são divididos entre as atividades
--     que valem ponto: valor de cada atividade = 10 ÷ atividades válidas.
--   • "Aguardando" (e "pendente", sem marcação) fica FORA do cálculo até o
--     professor marcar fez ou não fez. Assim, a nota do aluno é
--         10 × fez ÷ (fez + não fez)
--     — igual a "valor da atividade × feitas" quando tudo já está marcado.
--   • Nota do bimestre = média entre trabalhos (0–10) e prova (0–10).
--   • Comportamento não desconta nota.
--   • O bimestre de cada aula vem da soma de h/aula (Etapa 2B).
-- ═══════════════════════════════════════════════════════════════════════════

-- O interruptor agora é decisão tomada NA PÁGINA (sincronizada entre aparelhos
-- no estado diário) e chega no retrato como "vp". Sem "vp", mantém o que está.
CREATE OR REPLACE FUNCTION public.relatorio_aplicar_vale_ponto(p_escola_slug text, p_snapshot jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alteradas integer;
BEGIN
  IF COALESCE(auth.role(), 'service_role') <> 'service_role' AND NOT COALESCE((SELECT private.is_relatorio_admin()), false) THEN
    RAISE EXCEPTION 'Apenas o administrador pode alterar atividades.' USING ERRCODE = '42501';
  END IF;

  UPDATE relatorio_aulas ra
     SET atividade_vale_ponto = (x ->> 'vp')::boolean,
         atualizada_em = now()
    FROM jsonb_array_elements(COALESCE(p_snapshot -> 'aulas', '[]'::jsonb)) AS x
   WHERE ra.id = p_escola_slug || ':' || (x ->> 'c')
     AND (x ->> 'vp') IN ('true', 'false')
     AND ra.atividade_vale_ponto IS DISTINCT FROM (x ->> 'vp')::boolean;
  GET DIAGNOSTICS v_alteradas = ROW_COUNT;
  RETURN v_alteradas;
END;
$$;

REVOKE ALL ON FUNCTION public.relatorio_aplicar_vale_ponto(text, jsonb) FROM public, anon;

-- A publicação chama a aplicação do interruptor depois de gravar as aulas.
DO $$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef('public.relatorio_publicar_lancamentos(text, jsonb)'::regprocedure) INTO v_def;
  IF position('relatorio_aplicar_vale_ponto' IN v_def) = 0 THEN
    v_def := replace(
      v_def,
      E'  IF v_pode_remover THEN\n    UPDATE relatorio_aulas ra SET removida = true',
      E'  PERFORM relatorio_aplicar_vale_ponto(p_escola_slug, p_snapshot);\n\n  IF v_pode_remover THEN\n    UPDATE relatorio_aulas ra SET removida = true'
    );
    IF position('relatorio_aplicar_vale_ponto' IN v_def) = 0 THEN
      RAISE EXCEPTION 'Não foi possível encaixar o interruptor em relatorio_publicar_lancamentos.';
    END IF;
    EXECUTE v_def;
  END IF;
END;
$$;

-- ── Nota de trabalho por aluno / disciplina / bimestre ─────────────────────
DROP VIEW IF EXISTS public.relatorio_notas_trabalho;
CREATE VIEW public.relatorio_notas_trabalho
WITH (security_invoker = true) AS
WITH validas AS (
  SELECT a.id, a.escola_id, a.turma_codigo, a.disciplina, a.bimestre
  FROM public.relatorio_aulas a
  WHERE NOT a.removida AND a.tem_atividade AND a.atividade_vale_ponto
),
por_turma AS (
  SELECT escola_id, turma_codigo, disciplina, bimestre, count(*) AS atividades_validas
  FROM validas
  GROUP BY 1, 2, 3, 4
),
por_aluno AS (
  SELECT v.escola_id, v.turma_codigo, v.disciplina, v.bimestre, l.numero_chamada,
         max(l.nome_relatorio) AS nome_relatorio,
         (array_agg(l.aluno_id) FILTER (WHERE l.aluno_id IS NOT NULL))[1] AS aluno_id,
         count(*) FILTER (WHERE l.atividade = 'fez') AS fez,
         count(*) FILTER (WHERE l.atividade = 'nao_fez') AS nao_fez,
         count(*) FILTER (WHERE l.atividade IS NULL OR l.atividade IN ('aguardando', 'pendente')) AS aguardando
  FROM validas v
  JOIN public.relatorio_lancamentos l ON l.aula_id = v.id
  WHERE NOT l.transferido
  GROUP BY 1, 2, 3, 4, 5
)
SELECT e.slug AS escola_slug,
       a.escola_id, a.turma_codigo, a.disciplina, a.bimestre,
       a.numero_chamada, a.nome_relatorio, a.aluno_id,
       t.atividades_validas,
       round(10.0 / t.atividades_validas, 2) AS valor_atividade,
       a.fez, a.nao_fez, a.aguardando,
       CASE WHEN a.fez + a.nao_fez = 0 THEN NULL
            ELSE round(10.0 * a.fez / (a.fez + a.nao_fez), 1) END AS nota_trabalho,
       COALESCE(b.concluido, false) AS bimestre_concluido
FROM por_aluno a
JOIN por_turma t USING (escola_id, turma_codigo, disciplina, bimestre)
JOIN public.escolas e ON e.id = a.escola_id
LEFT JOIN public.relatorio_bimestres_por_carga b USING (escola_id, turma_codigo, disciplina, bimestre);

GRANT SELECT ON public.relatorio_notas_trabalho TO authenticated;
REVOKE ALL ON public.relatorio_notas_trabalho FROM anon;
