-- ═══════════════════════════════════════════════════════════════════════════
-- OBSOLETO — NÃO RODAR (neutralizado em 26/09/2026, auditoria de segurança)
-- ───────────────────────────────────────────────────────────────────────────
-- Este arquivo criava a view public.boletim_normalizado com
-- "GRANT SELECT ... TO anon": com a chave pública do site, qualquer pessoa lia
-- nome e notas de todos os alunos das duas escolas. A Etapa 8C
-- (2026-09-17-etapa8c-fecha-boletim-normalizado.sql) fechou a view; rodar a
-- versão antiga de novo reabriria tudo. Por isso o conteúdo foi retirado (fica
-- no histórico do git) e o bloco abaixo impede qualquer execução.
--
-- A definição vigente da view é a da Etapa 8C. O aluno vê o próprio boletim
-- só por get_meu_boletim(aluno_id, sessão); o professor, logado.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE EXCEPTION 'supabase/boletim_api.sql é obsoleto e reabria as notas ao público. Use a Etapa 8C.';
END;
$$;
