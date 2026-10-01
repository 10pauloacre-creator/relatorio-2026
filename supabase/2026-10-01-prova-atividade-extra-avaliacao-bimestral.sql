-- ════════════════════════════════════════════════════════════════════════
-- ATIVIDADE EXTRA COMO NOTA DE PROVA (Avaliação bimestral, 01/10/2026)
-- ────────────────────────────────────────────────────────────────────────
-- Decisão do professor: a nota de uma atividade extra da Biblioteca só vale
-- como nota de PROVA do bimestre quando a atividade foi marcada, na criação,
-- como "Avaliação bimestral" (extra_activities.avaliacao_bimestral; SQL da
-- Biblioteca: sql/2026-10-01-extra-activities-avaliacao-bimestral.sql).
-- Ela exige disciplina e bimestre.
--
-- * relatorio_provas_bimestrais ganha a origem 'atividade_extra': a nota da
--   correção (0–10) de cada aluno, no bimestre e na disciplina da atividade.
--   Várias marcadas no mesmo bimestre = média das corrigidas. Junto com a
--   prova do livro, vale a MAIOR (regra que a view já tinha). Coluna nova
--   no fim: atividade_tema.
--   Todos os consumidores recebem a nota sem mudança: boletim do aluno
--   (get_meu_boletim), painel da Casavequia (notas-bimestrais.js), Hermínio
--   (herminio-regras-extras.js) e a tabela de notas do Relatório Individual.
-- * Aluno sem correção (não entregou) fica sem nota automática de prova.
-- * extra_activity_correcoes: o professor (admin) passa a ler a tabela pela
--   view (security_invoker). Só ele; o aluno continua pelas RPCs.
-- * get_meu_boletim: provaDetalhe leva 'atividade' (tema).
-- * relatorio_individual: atividadesExtras[].avaliacaoBimestral.
-- ════════════════════════════════════════════════════════════════════════

GRANT SELECT ON public.extra_activity_correcoes TO authenticated;
DROP POLICY IF EXISTS extra_activity_correcoes_admin_le ON public.extra_activity_correcoes;
CREATE POLICY extra_activity_correcoes_admin_le ON public.extra_activity_correcoes
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
        ), da_atividade_extra AS (
         -- 01/10/2026: atividade extra marcada como Avaliação bimestral (nota corrigida, 0–10).
         -- Várias no mesmo bimestre/disciplina: média das corrigidas.
         SELECT v.scope_key,
            v.aluno_relatorio_id,
            v.nome_relatorio,
            c.aluno_id,
            a.disciplina,
            a.bimestre::text AS bimestre,
            round(avg(LEAST(10::numeric, c.nota / NULLIF(c.nota_max, 0::numeric) * 10::numeric)), 2) AS nota_prova,
            max(COALESCE(c.atualizado_em, c.corrigido_em)) AS realizada_em,
            string_agg(a.tema, ' + ' ORDER BY a.prazo_at) AS atividade_tema
           FROM extra_activity_correcoes c
             JOIN extra_activities a ON a.id = c.activity_id
             JOIN relatorio_aluno_vinculo v ON v.aluno_id = c.aluno_id
          WHERE a.avaliacao_bimestral AND a.disciplina IS NOT NULL AND a.bimestre IS NOT NULL AND c.nota IS NOT NULL
          GROUP BY v.scope_key, v.aluno_relatorio_id, v.nome_relatorio, c.aluno_id, a.disciplina, a.bimestre
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
            NULL::text AS atividade_tema
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
            NULL::text AS atividade_tema
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
            e.atividade_tema
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
    atividade_tema
   FROM todas
  ORDER BY scope_key, aluno_relatorio_id, disciplina, bimestre, nota_prova DESC, realizada_em DESC;

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
           v.aluno_relatorio_id, v.numero_chamada, v.nome_relatorio, v.transferido, r.payload, r.updated_at
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
    -- Aluno novo da Biblioteca que o painel ainda não salvou (Etapa 5B):
    -- entra com o vínculo, sem notas digitadas; o cálculo automático vale.
    v_aluno := COALESCE(v_aluno, jsonb_build_object(
      'id', v_turma.aluno_relatorio_id, 'numero', v_turma.numero_chamada, 'nome', v_turma.nome_relatorio));

    SELECT COALESCE(rg.bimestres_automaticos, '{}') AS automaticos,
           COALESCE(rg.recuperacao_semestral, false) AS recuperacao,
           COALESCE(rg.bonus_poder, false) AS bonus_poder,
           COALESCE(rg.desconto_conduta, false) AS desconto_conduta,
           COALESCE(rg.prova_biblioteca_vence, false) AS prova_vence
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
          -- Etapa 9C: onde a prova da Biblioteca vence, a nota digitada só vale
          -- se o aluno ainda não fez a prova do bimestre.
          'provaManual',    CASE WHEN v_regras.prova_vence AND EXISTS (
                              SELECT 1 FROM relatorio_provas_bimestrais p
                              WHERE p.aluno_id = p_aluno_id AND p.scope_key = v_turma.scope_key
                                AND relatorio_disciplina_chave(p.disciplina) = relatorio_disciplina_chave(v_disc)
                                AND p.bimestre = v_b AND p.nota_prova IS NOT NULL)
                            THEN NULL
                            ELSE (SELECT round(NULLIF(v_origem -> v_b ->> 'prova', '')::numeric * 2, 1)) END,
          'trabalhoAuto',   (SELECT n.nota_trabalho FROM relatorio_notas_trabalho n
                              WHERE n.aluno_id = p_aluno_id AND n.escola_id = v_turma.escola_id
                                AND relatorio_disciplina_chave(n.disciplina) = relatorio_disciplina_chave(v_disc)
                                AND n.bimestre::text = v_b
                              LIMIT 1),
          'resumoTrabalho', (SELECT jsonb_build_object('atividadesValidas', n.atividades_validas, 'valorAtividade', n.valor_atividade,
                                                       'fez', n.fez, 'naoFez', n.nao_fez, 'aguardando', n.aguardando)
                              FROM relatorio_notas_trabalho n
                              WHERE n.aluno_id = p_aluno_id AND n.escola_id = v_turma.escola_id
                                AND relatorio_disciplina_chave(n.disciplina) = relatorio_disciplina_chave(v_disc)
                                AND n.bimestre::text = v_b
                              LIMIT 1),
          'provaAuto',      (SELECT p.nota_prova FROM relatorio_provas_bimestrais p
                              WHERE p.aluno_id = p_aluno_id AND p.scope_key = v_turma.scope_key
                                AND relatorio_disciplina_chave(p.disciplina) = relatorio_disciplina_chave(v_disc)
                                AND p.bimestre = v_b
                              ORDER BY p.realizada_em DESC LIMIT 1),
          -- Etapa 5: prova e recuperação feitas no livro (vale a maior).
          -- Comportamento desconta nota (17/09/2026): pontos da disciplina no bimestre, já limitados.
          'descontoConduta', relatorio_desconto_conduta(p_aluno_id, v_turma.escola_id, v_disc, v_b),
          'provaDetalhe',   (SELECT jsonb_build_object('primeira', p.nota_primeira, 'recuperacao', p.nota_recuperacao,
                                                       'realizadaEm', p.realizada_em, 'origem', p.origem,
                                                       'atividade', p.atividade_tema)
                              FROM relatorio_provas_bimestrais p
                              WHERE p.aluno_id = p_aluno_id AND p.scope_key = v_turma.scope_key
                                AND relatorio_disciplina_chave(p.disciplina) = relatorio_disciplina_chave(v_disc)
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
      'scopeKey', v_turma.scope_key,
      'aluno', v_aluno ->> 'nome',
      'numero', v_aluno -> 'numero',
      'transferido', v_turma.transferido,
      'regras', jsonb_build_object('bimestresAutomaticos', to_jsonb(v_regras.automaticos), 'recuperacaoSemestral', v_regras.recuperacao,
                                   'bonusPoder', v_regras.bonus_poder, 'descontoConduta', v_regras.desconto_conduta,
                                   'provaBibliotecaVence', v_regras.prova_vence),
      -- Etapa 6: pontos do Ranking de Poder (o motor calcula o nível e o bônus).
      'pontosPoder', (SELECT al.pontos FROM alunos al WHERE al.id = p_aluno_id),
      'disciplinas', v_disciplinas,
      'atualizadoEm', v_turma.updated_at
    ));
  END LOOP;

  RETURN jsonb_build_object('boletins', v_resultado, 'geradoEm', now());
END;
$function$;

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
           'corrigidoEm', COALESCE(c.atualizado_em, c.corrigido_em),
           'avaliacaoBimestral', a.avaliacao_bimestral
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

NOTIFY pgrst, 'reload schema';
