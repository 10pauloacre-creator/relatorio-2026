-- ═══════════════════════════════════════════════════════════════════════
-- Etapa 9 — Contas de professores (19/09/2026)
--
-- O Relatório passa a aceitar outros professores: cada um cria a própria
-- conta (e-mail/senha ou Google) e vê SÓ os próprios dados. Os relatórios
-- da Casavequia e da Hermínio continuam presos à conta 10pauloacre@gmail.com
-- (report_sync_state e relatorio_* seguem com private.is_relatorio_admin).
--
-- Antes de abrir o cadastro, duas brechas que já existiam foram fechadas:
--   1. profiles: a regra "insert/update own" deixava qualquer conta gravar
--      role = 'admin' no próprio perfil, e private.is_admin() confia nessa
--      coluna — a conta nova leria relatórios, boletins e alunos.
--   2. alunos: SELECT liberado para qualquer usuário logado (inclui
--      password_hash). Agora só o professor administrador lê.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Ninguém se promove a admin ─────────────────────────────────────
CREATE OR REPLACE FUNCTION private.profiles_trava_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  pode boolean := (SELECT auth.uid()) IS NULL                                  -- SQL/serviço
               OR COALESCE((SELECT auth.email()) = '10pauloacre@gmail.com', false);
BEGIN
  IF pode THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS DISTINCT FROM 'aluno' THEN NEW.role := 'aluno'; END IF;
  ELSIF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Só o administrador pode alterar o papel de um perfil.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_trava_role ON public.profiles;
CREATE TRIGGER profiles_trava_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.profiles_trava_role();

-- ── 2. Lista de alunos só para o professor ────────────────────────────
DROP POLICY IF EXISTS alunos_select_admin ON public.alunos;
CREATE POLICY alunos_select_admin ON public.alunos
  FOR SELECT TO authenticated
  USING ((SELECT public.bdm_e_professor()));

-- ── 3. Dados particulares de cada professor ───────────────────────────
-- Um registro por escopo (ex.: "diario:v1"). Só o dono lê e grava.
CREATE TABLE IF NOT EXISTS public.professor_dados (
  user_id    uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  scope_key  text        NOT NULL CHECK (char_length(scope_key) BETWEEN 1 AND 120),
  payload    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  page_path  text,
  source     text,
  PRIMARY KEY (user_id, scope_key),
  -- Teto de 4 MB por escopo: protege o banco de abuso por contas abertas.
  CONSTRAINT professor_dados_tamanho CHECK (pg_column_size(payload) < 4194304)
);

ALTER TABLE public.professor_dados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professor_dados FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.professor_dados FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professor_dados TO authenticated;

DROP POLICY IF EXISTS professor_dados_dono_select ON public.professor_dados;
DROP POLICY IF EXISTS professor_dados_dono_insert ON public.professor_dados;
DROP POLICY IF EXISTS professor_dados_dono_update ON public.professor_dados;
DROP POLICY IF EXISTS professor_dados_dono_delete ON public.professor_dados;
CREATE POLICY professor_dados_dono_select ON public.professor_dados
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY professor_dados_dono_insert ON public.professor_dados
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY professor_dados_dono_update ON public.professor_dados
  FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY professor_dados_dono_delete ON public.professor_dados
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- Tempo real: cada aparelho do professor recebe a mudança na hora
-- (o Realtime aplica a mesma RLS, então ninguém recebe dado alheio).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'professor_dados'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.professor_dados;
  END IF;
END $$;

-- ── 4. Cota diária da IA para contas novas ────────────────────────────
-- As chaves de IA são de camada gratuita e servem também à Biblioteca.
-- O administrador não tem cota; os demais professores têm um teto por dia.
CREATE TABLE IF NOT EXISTS private.ia_uso (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  dia     date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Rio_Branco')::date,
  pedidos int  NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, dia)
);

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
  INSERT INTO private.ia_uso AS u (user_id, dia, pedidos)
  VALUES (uid, (now() AT TIME ZONE 'America/Rio_Branco')::date, 1)
  ON CONFLICT (user_id, dia) DO UPDATE SET pedidos = u.pedidos + 1
  RETURNING pedidos INTO total;
  RETURN total <= GREATEST(1, LEAST(p_limite, 200));
END;
$$;

REVOKE ALL ON FUNCTION public.ia_consumir_cota(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ia_consumir_cota(int) TO authenticated;
