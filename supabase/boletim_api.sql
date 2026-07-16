-- ═══════════════════════════════════════════════════════════════════════════
-- API de Boletim — view normalizada sobre report_sync_state
-- ───────────────────────────────────────────────────────────────────────────
-- Objetivo: expor as notas bimestrais de todas as turmas/disciplinas das duas
-- escolas (Pe. Carlos Casavequia e Raimundo Hermínio de Melo) em um formato
-- plano (1 linha = 1 aluno + 1 disciplina + 1 bimestre), para ser consumido
-- via REST pelo projeto da biblioteca digital.
--
-- Como aplicar:
--   1. Abra o painel do Supabase do projeto (vgceathgwvtmjxbdpecr) → SQL Editor.
--   2. Cole este arquivo inteiro e rode uma vez ("Run").
--   3. Rode novamente sempre que uma nova turma/página de boletim for criada
--      (é só adicionar uma linha em scope_config abaixo).
--
-- Como consultar (mesma chave pública já usada pelo site, em
-- assets/js/supabase-report-sync.js):
--
--   GET https://vgceathgwvtmjxbdpecr.supabase.co/rest/v1/boletim_normalizado
--       ?select=*
--       &aluno_nome=eq.Fernanda%20Vict%C3%B3ria%20Batista%20Machado
--   Headers:
--       apikey: sb_publishable_ba-g-ww4KwM2Wq0x2vsGVg_x_9pTqUQ
--       Authorization: Bearer sb_publishable_ba-g-ww4KwM2Wq0x2vsGVg_x_9pTqUQ
--
-- Outros filtros úteis (PostgREST): &escola=eq.E.E.%20Rural...,
-- &turma=eq.1%C2%AA%20S%C3%A9rie, &disciplina=eq.Artes, &bimestre=eq.2
--
-- Aviso: a identificação do aluno é feita por NOME COMPLETO (não existe um id
-- externo compartilhado entre os sistemas ainda). Nomes duplicados entre
-- escolas/turmas diferentes não são esperados, mas o app consumidor deveria
-- também considerar "escola" e "turma" ao casar o registro, se possível.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.boletim_normalizado AS
WITH scope_config(scope_key, escola, turma, disciplina_principal) AS (
  VALUES
    ('casavequia:panel:pc_alunos_1serie_2026_v1', 'E.E. Rural Pe. Carlos Casavequia', '1ª Série', 'Língua Portuguesa'),
    ('casavequia:panel:pc_alunos_2serie_2026_v1', 'E.E. Rural Pe. Carlos Casavequia', '2ª Série', 'Língua Portuguesa'),
    ('casavequia:panel:pc_alunos_3serie_2026_v1', 'E.E. Rural Pe. Carlos Casavequia', '3ª Série', 'Língua Portuguesa'),
    ('casavequia:panel:pc_alunos_6ano_2026_v1',   'E.E. Rural Pe. Carlos Casavequia', '6º Ano',   'Artes'),
    ('herminio:panel:rh_alunos_1serie_2026_v1',   'E.E. Raimundo Hermínio de Melo',   '1ª Série', 'Língua Portuguesa'),
    ('herminio:panel:rh_alunos_2serie_2026_v1',   'E.E. Raimundo Hermínio de Melo',   '2ª Série', 'Língua Portuguesa'),
    ('herminio:panel:rh_alunos_3serie_2026_v1',   'E.E. Raimundo Hermínio de Melo',   '3ª Série', 'Língua Portuguesa'),
    ('herminio:panel:rh_alunos_8e9ano_2026_v1',   'E.E. Raimundo Hermínio de Melo',   '8º/9º Ano','Língua Portuguesa')
),
alunos AS (
  SELECT
    c.escola,
    c.turma,
    c.disciplina_principal,
    r.updated_at,
    a.value AS aluno
  FROM public.report_sync_state r
  JOIN scope_config c ON c.scope_key = r.scope_key
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(r.payload -> 'alunos', '[]'::jsonb)) AS a(value)
),
principal AS (
  -- disciplina principal: fica achatada em aluno.bimestres[bim]
  SELECT
    escola, turma,
    aluno ->> 'nome' AS aluno_nome,
    disciplina_principal AS disciplina,
    bim.key AS bimestre,
    NULLIF(bim.value ->> 'trabalhos', '')::numeric AS nota_trabalhos,
    NULLIF(bim.value ->> 'prova', '')::numeric AS nota_prova,
    updated_at
  FROM alunos
  CROSS JOIN LATERAL jsonb_each(coalesce(aluno -> 'bimestres', '{}'::jsonb)) AS bim(key, value)
),
outras AS (
  -- demais disciplinas: aluno.boletim[disciplina].bimestres[bim]
  SELECT
    escola, turma,
    aluno ->> 'nome' AS aluno_nome,
    disc.key AS disciplina,
    bim.key AS bimestre,
    NULLIF(bim.value ->> 'trabalhos', '')::numeric AS nota_trabalhos,
    NULLIF(bim.value ->> 'prova', '')::numeric AS nota_prova,
    updated_at
  FROM alunos
  CROSS JOIN LATERAL jsonb_each(coalesce(aluno -> 'boletim', '{}'::jsonb)) AS disc(key, value)
  CROSS JOIN LATERAL jsonb_each(coalesce(disc.value -> 'bimestres', '{}'::jsonb)) AS bim(key, value)
),
unificado AS (
  SELECT * FROM principal
  UNION ALL
  SELECT * FROM outras
)
SELECT
  escola,
  turma,
  aluno_nome,
  disciplina,
  bimestre::int AS bimestre,
  nota_trabalhos,
  nota_prova,
  CASE
    WHEN nota_trabalhos IS NULL AND nota_prova IS NULL THEN NULL
    ELSE round(coalesce(nota_trabalhos, 0) + coalesce(nota_prova, 0), 1)
  END AS nota_total,
  updated_at AS atualizado_em
FROM unificado
ORDER BY escola, turma, aluno_nome, disciplina, bimestre;

-- Libera leitura para a mesma chave pública (anon) já usada pelo site.
GRANT SELECT ON public.boletim_normalizado TO anon, authenticated;
