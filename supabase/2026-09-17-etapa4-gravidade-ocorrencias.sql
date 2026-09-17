-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPA 4 — Gravidade das ocorrências de comportamento
-- ───────────────────────────────────────────────────────────────────────────
-- A IA (Edge Function classificar-ocorrencias, repositório da Biblioteca)
-- sugere a gravidade de cada ocorrência: leve, médio, grave ou muito grave,
-- com uma justificativa curta. O professor confirma ou troca com um toque no
-- próprio relato. Decisão do professor: comportamento NÃO desconta nota; a
-- gravidade só fica registrada (relatório individual, Etapa 7).
--
-- Ocorrências positivas (✅ ⭐ …) não são classificadas.
-- Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.relatorio_ocorrencias
  ADD COLUMN IF NOT EXISTS gravidade_justificativa text,
  ADD COLUMN IF NOT EXISTS gravidade_modelo text,
  ADD COLUMN IF NOT EXISTS classificada_em timestamptz,
  ADD COLUMN IF NOT EXISTS confirmada_em timestamptz;

CREATE INDEX IF NOT EXISTS relatorio_ocorrencias_pendentes_idx
  ON public.relatorio_ocorrencias (escola_id, data)
  WHERE NOT removida AND NOT positiva AND gravidade IS NULL;

-- Professor define ou confirma a gravidade. Confirmar a sugestão da IA mantém
-- a origem "ia"; escolher outra passa a origem para "professor".
-- p_gravidade NULL desfaz a confirmação (volta a ser só sugestão da IA).
CREATE OR REPLACE FUNCTION public.relatorio_definir_gravidade(p_id text, p_gravidade text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_atual relatorio_ocorrencias%ROWTYPE;
BEGIN
  IF COALESCE(auth.role(), 'service_role') <> 'service_role' AND NOT COALESCE((SELECT private.is_relatorio_admin()), false) THEN
    RAISE EXCEPTION 'Apenas o administrador pode definir a gravidade.' USING ERRCODE = '42501';
  END IF;
  IF p_gravidade IS NOT NULL AND p_gravidade NOT IN ('leve', 'medio', 'grave', 'muito_grave') THEN
    RAISE EXCEPTION 'Gravidade inválida: %', p_gravidade USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_atual FROM relatorio_ocorrencias WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ocorrência não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF p_gravidade IS NULL THEN
    UPDATE relatorio_ocorrencias
       SET gravidade_confirmada = false, confirmada_em = NULL, atualizada_em = now()
     WHERE id = p_id
    RETURNING * INTO v_atual;
  ELSE
    UPDATE relatorio_ocorrencias
       SET gravidade = p_gravidade,
           gravidade_origem = CASE
             WHEN v_atual.gravidade = p_gravidade AND v_atual.gravidade_origem = 'ia' THEN 'ia'
             ELSE 'professor' END,
           gravidade_confirmada = true,
           confirmada_em = now(),
           atualizada_em = now()
     WHERE id = p_id
    RETURNING * INTO v_atual;
  END IF;

  RETURN jsonb_build_object(
    'id', v_atual.id,
    'gravidade', v_atual.gravidade,
    'gravidade_origem', v_atual.gravidade_origem,
    'gravidade_confirmada', v_atual.gravidade_confirmada,
    'gravidade_justificativa', v_atual.gravidade_justificativa
  );
END;
$$;

REVOKE ALL ON FUNCTION public.relatorio_definir_gravidade(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_definir_gravidade(text, text) TO authenticated;

-- A Edge Function grava a sugestão da IA por aqui (só quando ainda não há
-- gravidade confirmada pelo professor).
CREATE OR REPLACE FUNCTION public.relatorio_registrar_sugestao_gravidade(p_itens jsonb, p_modelo text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
BEGIN
  IF COALESCE(auth.role(), 'service_role') <> 'service_role' AND NOT COALESCE((SELECT private.is_relatorio_admin()), false) THEN
    RAISE EXCEPTION 'Apenas o administrador pode classificar ocorrências.' USING ERRCODE = '42501';
  END IF;

  UPDATE relatorio_ocorrencias o
     SET gravidade = i.gravidade,
         gravidade_origem = 'ia',
         gravidade_justificativa = left(i.justificativa, 280),
         gravidade_modelo = p_modelo,
         classificada_em = now(),
         atualizada_em = now()
    FROM jsonb_to_recordset(COALESCE(p_itens, '[]'::jsonb)) AS i(id text, gravidade text, justificativa text)
   WHERE o.id = i.id
     AND i.gravidade IN ('leve', 'medio', 'grave', 'muito_grave')
     AND NOT o.gravidade_confirmada
     AND NOT o.positiva;
  GET DIAGNOSTICS v_total = ROW_COUNT;
  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.relatorio_registrar_sugestao_gravidade(jsonb, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_registrar_sugestao_gravidade(jsonb, text) TO authenticated;

-- Pendentes de classificação, com o histórico do aluno até aquela data
-- (reincidência pesa na gravidade).
CREATE OR REPLACE FUNCTION public.relatorio_ocorrencias_pendentes(p_limite integer DEFAULT 40)
RETURNS TABLE (id text, escola text, turma text, data date, horario text, disciplina text,
               aluno text, texto text, anteriores integer, historico text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.role(), 'service_role') <> 'service_role' AND NOT COALESCE((SELECT private.is_relatorio_admin()), false) THEN
    RAISE EXCEPTION 'Apenas o administrador pode classificar ocorrências.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT o.id, e.nome_curto, o.turma_codigo, o.data, o.horario, o.disciplina, o.nome_relatorio, o.texto,
         (SELECT count(*)::int FROM relatorio_ocorrencias h
           WHERE h.escola_id = o.escola_id AND h.turma_codigo = o.turma_codigo
             AND (CASE WHEN o.aluno_id IS NOT NULL THEN h.aluno_id = o.aluno_id
                       ELSE relatorio_normalizar_nome(h.nome_relatorio) = relatorio_normalizar_nome(o.nome_relatorio) END)
             AND NOT h.removida AND NOT h.positiva AND h.data < o.data),
         (SELECT string_agg(to_char(h.data, 'DD/MM') || ': ' || left(h.texto, 90), ' | ' ORDER BY h.data DESC)
            FROM (SELECT * FROM relatorio_ocorrencias h2
                   WHERE h2.escola_id = o.escola_id AND h2.turma_codigo = o.turma_codigo
                     AND (CASE WHEN o.aluno_id IS NOT NULL THEN h2.aluno_id = o.aluno_id
                               ELSE relatorio_normalizar_nome(h2.nome_relatorio) = relatorio_normalizar_nome(o.nome_relatorio) END)
                     AND NOT h2.removida AND NOT h2.positiva AND h2.data < o.data
                   ORDER BY h2.data DESC LIMIT 3) h)
  FROM relatorio_ocorrencias o
  JOIN escolas e ON e.id = o.escola_id
  WHERE NOT o.removida AND NOT o.positiva AND o.gravidade IS NULL
  ORDER BY o.data, o.id
  LIMIT LEAST(GREATEST(COALESCE(p_limite, 40), 1), 60);
END;
$$;

REVOKE ALL ON FUNCTION public.relatorio_ocorrencias_pendentes(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_ocorrencias_pendentes(integer) TO authenticated;
