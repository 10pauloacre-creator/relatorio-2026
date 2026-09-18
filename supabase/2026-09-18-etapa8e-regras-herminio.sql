-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPA 8E — Regras ligadas na Hermínio e chave única de disciplina
-- ───────────────────────────────────────────────────────────────────────────
-- 1. Decisão do professor (18/09/2026): o bônus do Ranking de Poder e o
--    desconto por comportamento passam a valer também na E.E. Raimundo
--    Hermínio de Melo.
-- 2. Os painéis da Hermínio chamam as disciplinas de "Língua Inglesa" e
--    "Língua Espanhola", mas os relatos e os livros usam "Inglês" e
--    "Espanhol". A comparação por nome exato deixava de fora a nota de
--    trabalho, a prova do livro e o desconto dessas disciplinas.
--    relatorio_disciplina_chave() dá a mesma chave aos dois nomes; o boletim
--    do aluno e o desconto passam a comparar por ela.
-- Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.relatorio_disciplina_chave(p_nome text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE n
           WHEN 'lingua inglesa' THEN 'ingles'
           WHEN 'lingua espanhola' THEN 'espanhol'
           WHEN 'artes' THEN 'arte'
           WHEN 'trilhas de ciencias humanas' THEN 'trilhas de c. humanas'
           ELSE n
         END
  FROM (SELECT relatorio_normalizar_nome(p_nome) AS n) x;
$$;

UPDATE public.relatorio_regras_escola r
   SET bonus_poder = true, desconto_conduta = true, atualizada_em = now()
  FROM public.escolas e
 WHERE e.id = r.escola_id AND e.slug = 'raimundo-herminio-de-melo-2'
   AND NOT (r.bonus_poder AND r.desconto_conduta);

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
    AND relatorio_disciplina_chave(o.disciplina) = relatorio_disciplina_chave(p_disciplina)
    AND o.bimestre::text = p_bimestre;
$$;
REVOKE ALL ON FUNCTION public.relatorio_desconto_conduta(uuid, uuid, text, text) FROM public, anon, authenticated;

-- ── Boletim do aluno: compara disciplinas pela chave ────────────────────────
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
                                                       'realizadaEm', p.realizada_em, 'origem', p.origem)
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
