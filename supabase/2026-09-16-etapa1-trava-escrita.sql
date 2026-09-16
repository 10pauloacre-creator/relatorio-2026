-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPA 1B — Fecha report_sync_state para o público
-- ───────────────────────────────────────────────────────────────────────────
-- RODAR SOMENTE DEPOIS de testar o login no Relatório (casavequia.html,
-- herminio.html e páginas de alunos salvando normalmente com a conta admin).
--
-- Antes: qualquer pessoa com a chave pública (que também vai no app da
-- Biblioteca, instalado pelos alunos) podia ler e reescrever relatos, notas
-- e observações de comportamento.
-- Depois: só a conta de administrador lê e grava. O realtime continua
-- funcionando, porque respeita o RLS do usuário logado.
--
-- A view boletim_normalizado não é afetada (roda com os privilégios do dono);
-- ela será substituída por uma função que devolve só os dados do próprio aluno
-- nas etapas 5 e 8.
--
-- Para desfazer em emergência, rode o bloco "REVERTER" no fim do arquivo.
-- ═══════════════════════════════════════════════════════════════════════════

-- Trava de segurança: não aplica nada se a conta admin não for reconhecida.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE u.email = '10pauloacre@gmail.com' AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Conta admin 10pauloacre@gmail.com sem perfil admin: bloqueio cancelado para evitar ficar sem acesso.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.is_relatorio_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((SELECT private.is_admin()), false)
      OR COALESCE((SELECT auth.email()) = '10pauloacre@gmail.com', false);
$$;

REVOKE ALL ON FUNCTION private.is_relatorio_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION private.is_relatorio_admin() TO authenticated;

DROP POLICY IF EXISTS report_sync_state_public_insert ON public.report_sync_state;
DROP POLICY IF EXISTS report_sync_state_public_select ON public.report_sync_state;
DROP POLICY IF EXISTS report_sync_state_public_update ON public.report_sync_state;

DROP POLICY IF EXISTS report_sync_state_admin_select ON public.report_sync_state;
CREATE POLICY report_sync_state_admin_select ON public.report_sync_state
  FOR SELECT TO authenticated
  USING ((SELECT private.is_relatorio_admin()));

DROP POLICY IF EXISTS report_sync_state_admin_insert ON public.report_sync_state;
CREATE POLICY report_sync_state_admin_insert ON public.report_sync_state
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_relatorio_admin()));

DROP POLICY IF EXISTS report_sync_state_admin_update ON public.report_sync_state;
CREATE POLICY report_sync_state_admin_update ON public.report_sync_state
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_relatorio_admin()))
  WITH CHECK ((SELECT private.is_relatorio_admin()));

ALTER TABLE public.report_sync_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.report_sync_state FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.report_sync_state TO authenticated;

-- ── REVERTER (emergência) ───────────────────────────────────────────────────
-- GRANT SELECT, INSERT, UPDATE ON public.report_sync_state TO anon;
-- CREATE POLICY report_sync_state_public_select ON public.report_sync_state FOR SELECT TO public USING (true);
-- CREATE POLICY report_sync_state_public_insert ON public.report_sync_state FOR INSERT TO public WITH CHECK (true);
-- CREATE POLICY report_sync_state_public_update ON public.report_sync_state FOR UPDATE TO public USING (true) WITH CHECK (true);
