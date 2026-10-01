-- ════════════════════════════════════════════════════════════════════════
-- 01/10/2026 — Avaliação bimestral (atividade extra) não entregue = nota 0
-- Decisão do professor: quem não enviou resposta até o prazo fica com 0 na
-- prova do bimestre; se fizer a prova do livro, vale a maior (o DISTINCT ON
-- da view já fica com a maior nota).
-- * relatorio_provas_bimestrais: linhas 0 para quem é das turmas da atividade,
--   foi cadastrado antes do prazo, não respondeu e não tem correção; coluna
--   nova no fim: nao_entregue.
-- * get_meu_boletim: provaDetalhe leva 'naoEntregue'.
-- * Leitura do administrador (painéis leem a view com o token dele):
--   extra_activity_respostas, extra_activities e extra_activity_turmas.
-- ════════════════════════════════════════════════════════════════════════

-- Respostas: continuam fechadas para todos, menos a leitura do administrador.
DROP POLICY IF EXISTS extra_activity_respostas_sem_acesso ON public.extra_activity_respostas;
CREATE POLICY extra_activity_respostas_sem_acesso ON public.extra_activity_respostas
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING ((SELECT private.is_relatorio_admin())) WITH CHECK (false);
DROP POLICY IF EXISTS extra_activity_respostas_admin_le ON public.extra_activity_respostas;
CREATE POLICY extra_activity_respostas_admin_le ON public.extra_activity_respostas
  FOR SELECT TO authenticated USING ((SELECT private.is_relatorio_admin()));
GRANT SELECT ON public.extra_activity_respostas TO authenticated;

-- Atividades desativadas continuam valendo na nota (leitura do administrador).
DROP POLICY IF EXISTS extra_activities_admin_le ON public.extra_activities;
CREATE POLICY extra_activities_admin_le ON public.extra_activities
  FOR SELECT TO authenticated USING ((SELECT private.is_relatorio_admin()));
DROP POLICY IF EXISTS extra_activity_turmas_admin_le ON public.extra_activity_turmas;
CREATE POLICY extra_activity_turmas_admin_le ON public.extra_activity_turmas
  FOR SELECT TO authenticated USING ((SELECT private.is_relatorio_admin()));

CREATE OR REPLACE VIEW public.relatorio_provas_bimestrais WITH (security_invoker = true) AS
WITH dos_livros AS (
         SELECT v.scope_key,
            v.aluno_relatorio_id,
            v.nome_relatorio,
            m.aluno_id,
            m.disciplina,
            m.bimestre,
            max(m.nota) AS nota_prova,
            max(m.nota) FILTER (WHERE NOT m.recuperacao) AS nota_primeira,
            max(m.nota) FILTER (WHERE m.recuperacao) AS nota_recuperacao,
            max(m.completed_at) AS realizada_em,
            min(m.book_path) AS livro_path
           FROM relatorio_provas_livros m
             JOIN relatorio_aluno_vinculo v ON v.aluno_id = m.aluno_id AND v.scope_key ~ m.scope_padrao
          WHERE m.scope_padrao IS NOT NULL
          GROUP BY v.scope_key, v.aluno_relatorio_id, v.nome_relatorio, m.aluno_id, m.disciplina, m.bimestre
        ), do_sistema_antigo AS (
         SELECT v.scope_key,
            v.aluno_relatorio_id,
            v.nome_relatorio,
            g.aluno_id,
            relatorio_nome_disciplina(g.disciplina_slug, g.disciplina_nome) AS disciplina,
            g.bimestre::text AS bimestre,
            round(LEAST(10::numeric, g.nota_prova / NULLIF(t.nota_maxima, 0::numeric) * 10::numeric), 1) AS nota_prova,
            round(LEAST(10::numeric, g.nota_prova / NULLIF(t.nota_maxima, 0::numeric) * 10::numeric), 1) AS nota_primeira,
            NULL::numeric AS nota_recuperacao,
            COALESCE(a.submitted_at, g.updated_at) AS realizada_em,
            t.livro_path
           FROM bimester_grades g
             JOIN bimester_exam_attempts a ON a.id = g.prova_attempt_id AND a.status = 'finalizada'::text
             JOIN bimester_exam_templates t ON t.id = a.template_id
             JOIN relatorio_aluno_vinculo v ON v.aluno_id = g.aluno_id
          WHERE g.nota_prova IS NOT NULL
        ), atividade_extra_por_aluno AS (
         -- Corrigidas: a nota da correção, em 0–10.
         SELECT c.aluno_id, a.id AS activity_id, a.disciplina, a.bimestre, a.tema, a.prazo_at,
            LEAST(10::numeric, c.nota / NULLIF(c.nota_max, 0::numeric) * 10::numeric) AS nota,
            COALESCE(c.atualizado_em, c.corrigido_em) AS realizada_em,
            false AS nao_entregue
           FROM extra_activity_correcoes c
             JOIN extra_activities a ON a.id = c.activity_id
          WHERE a.avaliacao_bimestral AND a.disciplina IS NOT NULL AND a.bimestre IS NOT NULL AND c.nota IS NOT NULL
        UNION ALL
         -- 01/10/2026 (decisão do professor): prazo encerrado sem resposta = 0.
         -- Só alunos das turmas da atividade, cadastrados antes do prazo e sem correção.
         -- Entrega atrasada aceita tira o 0 (fica aguardando a correção).
         SELECT al.id, a.id, a.disciplina, a.bimestre, a.tema, a.prazo_at,
            0::numeric, a.prazo_at, true
           FROM extra_activities a
             JOIN extra_activity_turmas eat ON eat.activity_id = a.id
             JOIN alunos al ON al.grupo_turma_id = eat.grupo_turma_id
          WHERE a.avaliacao_bimestral AND a.disciplina IS NOT NULL AND a.bimestre IS NOT NULL
            AND a.prazo_at < now()
            AND al.created_at < a.prazo_at
            AND NOT EXISTS (SELECT 1 FROM extra_activity_respostas r WHERE r.activity_id = a.id AND r.aluno_id = al.id)
            AND NOT EXISTS (SELECT 1 FROM extra_activity_correcoes c WHERE c.activity_id = a.id AND c.aluno_id = al.id AND c.nota IS NOT NULL)
        ), da_atividade_extra AS (
         -- Atividade extra marcada como Avaliação bimestral. Várias no mesmo
         -- bimestre/disciplina: média (a não entregue entra como 0).
         SELECT v.scope_key,
            v.aluno_relatorio_id,
            v.nome_relatorio,
            x.aluno_id,
            x.disciplina,
            x.bimestre::text AS bimestre,
            round(avg(x.nota), 2) AS nota_prova,
            max(x.realizada_em) AS realizada_em,
            string_agg(x.tema, ' + ' ORDER BY x.prazo_at) AS atividade_tema,
            bool_and(x.nao_entregue) AS nao_entregue
           FROM (SELECT DISTINCT ON (p.aluno_id, p.activity_id) p.*
                   FROM atividade_extra_por_aluno p
                  ORDER BY p.aluno_id, p.activity_id, p.nao_entregue) x
             JOIN relatorio_aluno_vinculo v ON v.aluno_id = x.aluno_id
          GROUP BY v.scope_key, v.aluno_relatorio_id, v.nome_relatorio, x.aluno_id, x.disciplina, x.bimestre
        ), todas AS (
         SELECT 'livro'::text AS origem,
            dos_livros.scope_key,
            dos_livros.aluno_relatorio_id,
            dos_livros.nome_relatorio,
            dos_livros.aluno_id,
            dos_livros.disciplina,
            dos_livros.bimestre,
            dos_livros.nota_prova,
            dos_livros.nota_primeira,
            dos_livros.nota_recuperacao,
            dos_livros.realizada_em,
            dos_livros.livro_path,
            NULL::text AS atividade_tema,
            NULL::boolean AS nao_entregue
           FROM dos_livros
        UNION ALL
         SELECT 'prova_antiga'::text AS text,
            do_sistema_antigo.scope_key,
            do_sistema_antigo.aluno_relatorio_id,
            do_sistema_antigo.nome_relatorio,
            do_sistema_antigo.aluno_id,
            do_sistema_antigo.disciplina,
            do_sistema_antigo.bimestre,
            do_sistema_antigo.nota_prova,
            do_sistema_antigo.nota_primeira,
            do_sistema_antigo.nota_recuperacao,
            do_sistema_antigo.realizada_em,
            do_sistema_antigo.livro_path,
            NULL::text AS atividade_tema,
            NULL::boolean AS nao_entregue
           FROM do_sistema_antigo
        UNION ALL
         SELECT 'atividade_extra'::text AS text,
            e.scope_key,
            e.aluno_relatorio_id,
            e.nome_relatorio,
            e.aluno_id,
            e.disciplina,
            e.bimestre,
            e.nota_prova,
            e.nota_prova AS nota_primeira,
            NULL::numeric AS nota_recuperacao,
            e.realizada_em,
            NULL::text AS livro_path,
            e.atividade_tema,
            e.nao_entregue
           FROM da_atividade_extra e
        )
 SELECT DISTINCT ON (scope_key, aluno_relatorio_id, disciplina, bimestre) scope_key,
    aluno_relatorio_id,
    nome_relatorio,
    aluno_id,
    disciplina,
    bimestre,
    nota_prova,
    nota_prova AS nota_prova_original,
    10::numeric AS nota_maxima,
    realizada_em,
    origem,
    nota_primeira,
    nota_recuperacao,
    livro_path,
    atividade_tema,
    nao_entregue
   FROM todas
  ORDER BY scope_key, aluno_relatorio_id, disciplina, bimestre, nota_prova DESC, realizada_em DESC;

-- get_meu_boletim: provaDetalhe ganha 'naoEntregue'.
DO $$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.get_meu_boletim(uuid, uuid)'::regprocedure);
  IF position('naoEntregue' IN d) = 0 THEN
    IF position($s$'atividade', p.atividade_tema)$s$ IN d) = 0 THEN
      RAISE EXCEPTION 'get_meu_boletim: trecho de provaDetalhe não encontrado';
    END IF;
    d := replace(d, $s$'atividade', p.atividade_tema)$s$,
                    $s$'atividade', p.atividade_tema, 'naoEntregue', p.nao_entregue)$s$);
    EXECUTE d;
  END IF;
END $$;
