-- Etapa 9B — Sincronia das notas entre a Biblioteca e o Relatório
--
-- Problema encontrado em 19/09/2026: aluno novo da Biblioteca (Etapa 5B) só
-- ganhava vínculo com o painel quando o professor salvava o painel da turma de
-- novo. Clarisse Nascimento Sousa (2ª Série) entrou em 17/09 às 14:46, o painel
-- da 2ª Série foi salvo pela última vez às 12:09 do mesmo dia, e a prova de
-- Língua Portuguesa dela (e a recuperação) não chegava a lugar nenhum: nem no
-- painel, nem no boletim do aluno, nem no Relatório Individual.
--
-- 1. relatorio_sincronizar_vinculos: além da lista salva pelo painel, entram
--    os alunos de relatorio_alunos_adicionados, com o MESMO número que o
--    painel dá a eles (assets/js/relatorio-alunos-adicionados.js,
--    completarPainel): maior id/número da lista fixa + ordem de registro.
-- 2. Gatilho em relatorio_alunos_adicionados: o vínculo nasce no cadastro.
-- 3. get_meu_boletim: aluno com vínculo e ainda fora da lista salva entra no
--    boletim (sem notas digitadas; valem o cálculo de trabalhos e a prova da
--    Biblioteca). Passa a devolver também "scopeKey" de cada boletim.
-- Pode rodar mais de uma vez.

CREATE OR REPLACE FUNCTION public.relatorio_sincronizar_vinculos(p_scope_key text DEFAULT NULL::text)
 RETURNS TABLE(turma text, total integer, por_nome integer, parcial integer, manual integer, pendentes integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
BEGIN
  IF COALESCE(auth.role(), 'service_role') <> 'service_role' AND NOT COALESCE((SELECT private.is_relatorio_admin()), false) THEN
    RAISE EXCEPTION 'Apenas o administrador pode sincronizar vínculos.' USING ERRCODE = '42501';
  END IF;

  WITH salvos AS (
    SELECT
      t.scope_key,
      t.escola_id,
      t.grupo_turma_id,
      t.series,
      (a.value ->> 'id')::int                                AS aluno_relatorio_id,
      NULLIF(a.value ->> 'numero', '')::int                  AS numero_chamada,
      a.value ->> 'nome'                                     AS nome_relatorio,
      COALESCE((a.value ->> 'transferido')::boolean, false)  AS transferido,
      relatorio_normalizar_nome(a.value ->> 'nome')          AS nome_norm
    FROM relatorio_turmas t
    JOIN report_sync_state r ON r.scope_key = t.scope_key
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(r.payload -> 'alunos', '[]'::jsonb)) AS a(value)
    WHERE t.ativo
      AND (p_scope_key IS NULL OR t.scope_key = p_scope_key)
      AND (a.value ->> 'id') ~ '^\d+$'
  ),
  adicionados AS (
    SELECT ad.scope_key, ad.nome, ad.ordem, relatorio_normalizar_nome(ad.nome) AS nome_norm
    FROM relatorio_alunos_adicionados ad
    WHERE p_scope_key IS NULL OR ad.scope_key = p_scope_key
  ),
  -- Lista fixa do HTML = o que foi salvo, menos os adicionados já salvos.
  base AS (
    SELECT s.scope_key, max(s.aluno_relatorio_id) AS max_id, max(s.numero_chamada) AS max_numero
    FROM salvos s
    WHERE NOT EXISTS (SELECT 1 FROM adicionados ad WHERE ad.scope_key = s.scope_key AND ad.nome_norm = s.nome_norm)
    GROUP BY s.scope_key
  ),
  numerados AS (
    SELECT t.scope_key, t.escola_id, t.grupo_turma_id, t.series,
           b.max_id + row_number() OVER w      AS aluno_relatorio_id,
           b.max_numero + row_number() OVER w  AS numero_chamada,
           ad.nome AS nome_relatorio, ad.nome_norm
    FROM adicionados ad
    JOIN relatorio_turmas t ON t.scope_key = ad.scope_key AND t.ativo
    JOIN base b ON b.scope_key = ad.scope_key
    WINDOW w AS (PARTITION BY ad.scope_key ORDER BY ad.ordem)
  ),
  origem AS (
    SELECT scope_key, escola_id, grupo_turma_id, series, aluno_relatorio_id, numero_chamada,
           nome_relatorio, transferido, nome_norm
    FROM salvos
    UNION ALL
    SELECT n.scope_key, n.escola_id, n.grupo_turma_id, n.series, n.aluno_relatorio_id::int, n.numero_chamada::int,
           n.nome_relatorio, false, n.nome_norm
    FROM numerados n
    WHERE NOT EXISTS (SELECT 1 FROM salvos s WHERE s.scope_key = n.scope_key AND s.nome_norm = n.nome_norm)
  ),
  candidatos AS (
    SELECT o.scope_key, o.aluno_relatorio_id, al.id AS aluno_id,
           relatorio_normalizar_nome(al.nome_completo) = o.nome_norm AS exato,
           split_part(relatorio_normalizar_nome(al.nome_completo), ' ', 1) = split_part(o.nome_norm, ' ', 1)
             AND regexp_replace(relatorio_normalizar_nome(al.nome_completo), '^.* ', '')
               = regexp_replace(o.nome_norm, '^.* ', '')                                AS parcial
    FROM origem o
    JOIN alunos al
      ON al.escola_id = o.escola_id
     AND o.grupo_turma_id IS NOT NULL
     AND al.grupo_turma_id = o.grupo_turma_id
     AND al.serie = ANY (o.series)
     AND COALESCE(al.role, 'aluno') = 'aluno'
  ),
  contagem AS (
    SELECT scope_key, aluno_relatorio_id,
           count(*) FILTER (WHERE exato)   AS n_exato,
           count(*) FILTER (WHERE parcial) AS n_parcial,
           (array_agg(aluno_id) FILTER (WHERE exato))[1]   AS id_exato,
           (array_agg(aluno_id) FILTER (WHERE parcial))[1] AS id_parcial
    FROM candidatos
    GROUP BY scope_key, aluno_relatorio_id
  ),
  escolha AS (
    SELECT o.scope_key, o.aluno_relatorio_id, o.numero_chamada, o.nome_relatorio, o.transferido,
      CASE WHEN c.n_exato = 1 THEN c.id_exato WHEN c.n_parcial = 1 THEN c.id_parcial END AS aluno_id,
      CASE WHEN c.n_exato = 1 THEN 'nome' WHEN c.n_parcial = 1 THEN 'nome_parcial' ELSE 'pendente' END AS metodo
    FROM origem o
    LEFT JOIN contagem c USING (scope_key, aluno_relatorio_id)
  )
  INSERT INTO relatorio_aluno_vinculo AS v
    (scope_key, aluno_relatorio_id, numero_chamada, nome_relatorio, transferido, aluno_id, metodo, atualizado_em)
  SELECT scope_key, aluno_relatorio_id, numero_chamada, nome_relatorio, transferido, aluno_id, metodo, now()
  FROM escolha
  ON CONFLICT (scope_key, aluno_relatorio_id) DO UPDATE
    SET numero_chamada = EXCLUDED.numero_chamada,
        nome_relatorio = EXCLUDED.nome_relatorio,
        transferido    = EXCLUDED.transferido,
        aluno_id       = CASE WHEN v.metodo = 'manual' THEN v.aluno_id ELSE EXCLUDED.aluno_id END,
        metodo         = CASE WHEN v.metodo = 'manual' THEN 'manual'   ELSE EXCLUDED.metodo   END,
        atualizado_em  = now()
    WHERE v.numero_chamada IS DISTINCT FROM EXCLUDED.numero_chamada
       OR v.nome_relatorio IS DISTINCT FROM EXCLUDED.nome_relatorio
       OR v.transferido    IS DISTINCT FROM EXCLUDED.transferido
       OR (v.metodo <> 'manual' AND (v.aluno_id IS DISTINCT FROM EXCLUDED.aluno_id OR v.metodo IS DISTINCT FROM EXCLUDED.metodo));

  RETURN QUERY
  SELECT t.rotulo,
         count(v.*)::int,
         count(*) FILTER (WHERE v.metodo = 'nome')::int,
         count(*) FILTER (WHERE v.metodo = 'nome_parcial')::int,
         count(*) FILTER (WHERE v.metodo = 'manual')::int,
         count(*) FILTER (WHERE v.metodo = 'pendente')::int
  FROM relatorio_turmas t
  LEFT JOIN relatorio_aluno_vinculo v ON v.scope_key = t.scope_key
  WHERE p_scope_key IS NULL OR t.scope_key = p_scope_key
  GROUP BY t.rotulo
  ORDER BY t.rotulo;
END;
$function$;

-- ── O vínculo nasce quando o aluno novo é registrado ────────────────────────
CREATE OR REPLACE FUNCTION private.relatorio_vincular_adicionado_trg()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Um erro aqui nunca pode impedir o cadastro do aluno.
  BEGIN
    PERFORM public.relatorio_sincronizar_vinculos(NEW.scope_key);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'relatorio_vincular_adicionado_trg(%): %', NEW.scope_key, SQLERRM;
  END;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS relatorio_alunos_adicionados_vincular ON public.relatorio_alunos_adicionados;
CREATE TRIGGER relatorio_alunos_adicionados_vincular
  AFTER INSERT OR UPDATE OF scope_key, nome, ordem ON public.relatorio_alunos_adicionados
  FOR EACH ROW EXECUTE FUNCTION private.relatorio_vincular_adicionado_trg();

-- ── Boletim: aluno vinculado entra mesmo antes de o painel salvar ───────────
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
      'scopeKey', v_turma.scope_key,
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

-- Refaz os vínculos agora (Clarisse entra na 2ª Série da Casavequia).
SELECT * FROM public.relatorio_sincronizar_vinculos();
