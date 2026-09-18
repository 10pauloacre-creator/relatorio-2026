-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPA 8C — Fecha a view pública boletim_normalizado
-- ───────────────────────────────────────────────────────────────────────────
-- A view roda como dono do banco (ignora a RLS de report_sync_state) e estava
-- liberada para anon: com a chave pública do app, qualquer pessoa lia nome e
-- notas de todos os alunos das duas escolas (confirmado em 17/09/2026).
-- Agora só o professor logado lê (private.is_relatorio_admin) e ninguém
-- escreve. Quem usa: a página de notas do admin na Biblioteca
-- (report-boletim-api.js, que passa a enviar o login do professor). O aluno
-- vê o próprio boletim só por get_meu_boletim, com a sessão dele.
-- Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.boletim_normalizado AS
WITH scope_config(scope_key, escola, turma, disciplina_principal) AS (
         VALUES ('casavequia:panel:pc_alunos_1serie_2026_v1'::text,'E.E. Rural Pe. Carlos Casavequia'::text,'1ª Série'::text,'Língua Portuguesa'::text), ('casavequia:panel:pc_alunos_2serie_2026_v1'::text,'E.E. Rural Pe. Carlos Casavequia'::text,'2ª Série'::text,'Língua Portuguesa'::text), ('casavequia:panel:pc_alunos_3serie_2026_v1'::text,'E.E. Rural Pe. Carlos Casavequia'::text,'3ª Série'::text,'Língua Portuguesa'::text), ('casavequia:panel:pc_alunos_6ano_2026_v1'::text,'E.E. Rural Pe. Carlos Casavequia'::text,'6º Ano'::text,'Artes'::text), ('herminio:panel:rh_alunos_1serie_2026_v1'::text,'E.E. Raimundo Hermínio de Melo'::text,'1ª Série'::text,'Língua Portuguesa'::text), ('herminio:panel:rh_alunos_2serie_2026_v1'::text,'E.E. Raimundo Hermínio de Melo'::text,'2ª Série'::text,'Língua Portuguesa'::text), ('herminio:panel:rh_alunos_3serie_2026_v1'::text,'E.E. Raimundo Hermínio de Melo'::text,'3ª Série'::text,'Língua Portuguesa'::text), ('herminio:panel:rh_alunos_8e9ano_2026_v1'::text,'E.E. Raimundo Hermínio de Melo'::text,'8º/9º Ano'::text,'Língua Portuguesa'::text)
        ), alunos AS (
         SELECT c.escola,
            c.turma,
            c.disciplina_principal,
            r.updated_at,
            a.value AS aluno
           FROM report_sync_state r
             JOIN scope_config c ON c.scope_key = r.scope_key
             CROSS JOIN LATERAL jsonb_array_elements(COALESCE(r.payload -> 'alunos'::text, '[]'::jsonb)) a(value)
        ), principal AS (
         SELECT alunos.escola,
            alunos.turma,
            alunos.aluno ->> 'nome'::text AS aluno_nome,
            alunos.disciplina_principal AS disciplina,
            bim.key AS bimestre,
            NULLIF(bim.value ->> 'trabalhos'::text, ''::text)::numeric AS nota_trabalhos,
            NULLIF(bim.value ->> 'prova'::text, ''::text)::numeric AS nota_prova,
            alunos.updated_at
           FROM alunos
             CROSS JOIN LATERAL jsonb_each(COALESCE(alunos.aluno -> 'bimestres'::text, '{}'::jsonb)) bim(key, value)
        ), outras AS (
         SELECT alunos.escola,
            alunos.turma,
            alunos.aluno ->> 'nome'::text AS aluno_nome,
            disc.key AS disciplina,
            bim.key AS bimestre,
            NULLIF(bim.value ->> 'trabalhos'::text, ''::text)::numeric AS nota_trabalhos,
            NULLIF(bim.value ->> 'prova'::text, ''::text)::numeric AS nota_prova,
            alunos.updated_at
           FROM alunos
             CROSS JOIN LATERAL jsonb_each(COALESCE(alunos.aluno -> 'boletim'::text, '{}'::jsonb)) disc(key, value)
             CROSS JOIN LATERAL jsonb_each(COALESCE(disc.value -> 'bimestres'::text, '{}'::jsonb)) bim(key, value)
        ), unificado AS (
         SELECT principal.escola,
            principal.turma,
            principal.aluno_nome,
            principal.disciplina,
            principal.bimestre,
            principal.nota_trabalhos,
            principal.nota_prova,
            principal.updated_at
           FROM principal
        UNION ALL
         SELECT outras.escola,
            outras.turma,
            outras.aluno_nome,
            outras.disciplina,
            outras.bimestre,
            outras.nota_trabalhos,
            outras.nota_prova,
            outras.updated_at
           FROM outras
        )
 SELECT escola,
    turma,
    aluno_nome,
    disciplina,
    bimestre::integer AS bimestre,
    nota_trabalhos,
    nota_prova,
        CASE
            WHEN nota_trabalhos IS NULL AND nota_prova IS NULL THEN NULL::numeric
            ELSE round(COALESCE(nota_trabalhos, 0::numeric) + COALESCE(nota_prova, 0::numeric), 1)
        END AS nota_total,
    updated_at AS atualizado_em
   FROM unificado
  WHERE (SELECT private.is_relatorio_admin())   -- só o professor (antes: qualquer um com a chave pública)
  ORDER BY escola, turma, aluno_nome, disciplina, (bimestre::integer);

REVOKE ALL ON public.boletim_normalizado FROM anon, authenticated, public;
GRANT SELECT ON public.boletim_normalizado TO authenticated;
