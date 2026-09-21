-- ═══════════════════════════════════════════════════════════════════════
-- Etapa 12 — IA da plataforma no assistente do Meu Diário (20/09/2026)
--
-- O professor passa a poder usar as chaves de IA do projeto (camada
-- gratuita, as mesmas da Biblioteca) direto no assistente, sem precisar de
-- chave própria. Como a cota dessas chaves é limitada, cada conta tem um
-- teto DIÁRIO por tipo de uso:
--
--   "assistente" → mensagens enviadas ao chat da aba 🤖 I.A
--   "diarios"    → diários criados pela IA da plataforma
--   "geral"      → o que já existia (botão "+ Novo Diário", organizar-relato)
--
-- Quando houver API paga, o teto de uma conta sobe com uma linha em
-- private.ia_plano — sem mexer no código.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. A contagem passa a ser por tipo de uso ─────────────────────────
ALTER TABLE private.ia_uso ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'geral';
ALTER TABLE private.ia_uso DROP CONSTRAINT IF EXISTS ia_uso_pkey;
ALTER TABLE private.ia_uso ADD PRIMARY KEY (user_id, dia, tipo);

-- A versão antiga (boolean, usada por organizar-relato) passa a gravar no tipo
-- "geral" com a chave nova — sem isso o ON CONFLICT antigo quebraria.
CREATE OR REPLACE FUNCTION public.ia_consumir_cota(p_limite int DEFAULT 40)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  uid uuid := (SELECT auth.uid());
  total int;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  IF COALESCE((SELECT auth.email()) = '10pauloacre@gmail.com', false) THEN RETURN true; END IF;
  INSERT INTO private.ia_uso AS u (user_id, dia, tipo, pedidos)
  VALUES (uid, (now() AT TIME ZONE 'America/Rio_Branco')::date, 'geral', 1)
  ON CONFLICT (user_id, dia, tipo) DO UPDATE SET pedidos = u.pedidos + 1
  RETURNING pedidos INTO total;
  RETURN total <= GREATEST(1, LEAST(p_limite, 200));
END;
$$;
REVOKE ALL ON FUNCTION public.ia_consumir_cota(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ia_consumir_cota(int) TO authenticated;

-- ── 2. Plano de cada professor (vazio hoje; é o gancho dos planos) ────
CREATE TABLE IF NOT EXISTS private.ia_plano (
  user_id           uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  limite_assistente int,
  limite_diarios    int,
  ate               date,          -- NULL = sem prazo
  nota              text,
  criado_em         timestamptz NOT NULL DEFAULT now()
);

-- ── 3. Teto em vigor para uma conta e um tipo ─────────────────────────
CREATE OR REPLACE FUNCTION private.ia_limite(p_user uuid, p_tipo text, p_padrao int)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT GREATEST(1, LEAST(500, COALESCE(
    (SELECT CASE p_tipo WHEN 'assistente' THEN p.limite_assistente WHEN 'diarios' THEN p.limite_diarios END
       FROM private.ia_plano p
      WHERE p.user_id = p_user
        AND (p.ate IS NULL OR p.ate >= (now() AT TIME ZONE 'America/Rio_Branco')::date)),
    p_padrao, 20)));
$$;

-- ── 4. Consumir e consultar a cota ────────────────────────────────────
-- Devolve {ok, usado, limite, restante, ilimitado}. O administrador não tem cota.
CREATE OR REPLACE FUNCTION public.ia_consumir_cota(p_tipo text, p_limite int DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  uid    uuid := (SELECT auth.uid());
  v_tipo   text := COALESCE(NULLIF(btrim(p_tipo), ''), 'geral');
  v_limite int;
  v_usado  int;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem-conta');
  END IF;
  IF COALESCE((SELECT auth.email()) = '10pauloacre@gmail.com', false) THEN
    RETURN jsonb_build_object('ok', true, 'ilimitado', true);
  END IF;
  v_limite := private.ia_limite(uid, v_tipo, p_limite);
  INSERT INTO private.ia_uso AS u (user_id, dia, tipo, pedidos)
  VALUES (uid, (now() AT TIME ZONE 'America/Rio_Branco')::date, v_tipo, 1)
  ON CONFLICT (user_id, dia, tipo) DO UPDATE SET pedidos = u.pedidos + 1
  RETURNING u.pedidos INTO v_usado;
  RETURN jsonb_build_object(
    'ok', v_usado <= v_limite, 'usado', v_usado, 'limite', v_limite,
    'restante', GREATEST(0, v_limite - v_usado), 'ilimitado', false);
END;
$$;

-- Só lê o saldo do dia (a tela mostra "restam X de Y").
CREATE OR REPLACE FUNCTION public.ia_saldo(p_tipo text DEFAULT 'assistente', p_limite int DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  uid    uuid := (SELECT auth.uid());
  v_tipo   text := COALESCE(NULLIF(btrim(p_tipo), ''), 'geral');
  v_limite int;
  v_usado  int;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem-conta');
  END IF;
  IF COALESCE((SELECT auth.email()) = '10pauloacre@gmail.com', false) THEN
    RETURN jsonb_build_object('ok', true, 'ilimitado', true);
  END IF;
  v_limite := private.ia_limite(uid, v_tipo, p_limite);
  SELECT COALESCE(u.pedidos, 0) INTO v_usado
    FROM private.ia_uso u
   WHERE u.user_id = uid
     AND u.dia = (now() AT TIME ZONE 'America/Rio_Branco')::date
     AND u.tipo = v_tipo;
  v_usado := COALESCE(v_usado, 0);
  RETURN jsonb_build_object(
    'ok', v_usado < v_limite, 'usado', v_usado, 'limite', v_limite,
    'restante', GREATEST(0, v_limite - v_usado), 'ilimitado', false);
END;
$$;

REVOKE ALL ON FUNCTION public.ia_consumir_cota(text, int) FROM public, anon;
REVOKE ALL ON FUNCTION public.ia_saldo(text, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ia_consumir_cota(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ia_saldo(text, int) TO authenticated;

-- A versão antiga (boolean, sem tipo) continua valendo para organizar-relato.
COMMENT ON FUNCTION public.ia_consumir_cota(int) IS
  'Cota diária da IA, tipo "geral". Mantida para as funções já publicadas.';
COMMENT ON FUNCTION public.ia_consumir_cota(text, int) IS
  'Consome 1 pedido do tipo informado e devolve {ok, usado, limite, restante}.';
COMMENT ON TABLE private.ia_plano IS
  'Teto diário maior por conta (planos de IA). Vazio = todos no limite padrão.';
