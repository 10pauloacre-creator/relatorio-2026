-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPA 1C — Vínculo de alunos automático
-- ───────────────────────────────────────────────────────────────────────────
-- Sempre que um painel de alunos do Relatório é salvo e a lista de alunos
-- (id, nome, número, transferido) muda, o vínculo daquela turma é refeito.
-- Assim uma turma nova (ex.: Hermínio 3ª Série, que ainda não tinha sido salva)
-- ou um aluno novo entra sem precisar rodar nada à mão.
--
-- Mudanças só de nota não disparam o re-vínculo.
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.relatorio_sincronizar_vinculos();

CREATE OR REPLACE FUNCTION public.relatorio_sincronizar_vinculos(p_scope_key text DEFAULT NULL)
RETURNS TABLE (turma text, total integer, por_nome integer, parcial integer, manual integer, pendentes integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF COALESCE(auth.role(), 'service_role') <> 'service_role' AND NOT COALESCE((SELECT private.is_relatorio_admin()), false) THEN
    RAISE EXCEPTION 'Apenas o administrador pode sincronizar vínculos.' USING ERRCODE = '42501';
  END IF;

  WITH origem AS (
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
$$;

REVOKE ALL ON FUNCTION public.relatorio_sincronizar_vinculos(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_sincronizar_vinculos(text) TO authenticated;

-- Só a "lista de chamada" do payload: nota mudando não dispara nada.
CREATE OR REPLACE FUNCTION public.relatorio_lista_alunos(p_payload jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_array(a ->> 'id', a ->> 'nome', a ->> 'numero', a ->> 'transferido')), '[]'::jsonb)
  FROM jsonb_array_elements(COALESCE(p_payload -> 'alunos', '[]'::jsonb)) AS a;
$$;

CREATE OR REPLACE FUNCTION private.relatorio_revincular_apos_salvar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.relatorio_turmas t WHERE t.scope_key = NEW.scope_key AND t.ativo)
     AND (TG_OP = 'INSERT'
          OR public.relatorio_lista_alunos(OLD.payload) IS DISTINCT FROM public.relatorio_lista_alunos(NEW.payload)) THEN
    -- Um erro aqui nunca pode impedir o professor de salvar o painel.
    BEGIN
      PERFORM public.relatorio_sincronizar_vinculos(NEW.scope_key);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'relatorio_revincular_apos_salvar(%): %', NEW.scope_key, SQLERRM;
    END;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS report_sync_state_revincular ON public.report_sync_state;
CREATE TRIGGER report_sync_state_revincular
  AFTER INSERT OR UPDATE OF payload ON public.report_sync_state
  FOR EACH ROW EXECUTE FUNCTION private.relatorio_revincular_apos_salvar();
