-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPA 8D — Aviso em tempo real para o boletim do aluno
-- ───────────────────────────────────────────────────────────────────────────
-- Quando o professor publica relatos (lançamentos), muda uma gravidade, a IA
-- classifica uma ocorrência ou o painel salva notas, o banco manda um AVISO
-- pelo Supabase Realtime (canal público "relatorio-atualizado", evento
-- "atualizado"). O aviso não leva nota nem nome: só {em}. O app do aluno,
-- com o boletim aberto, busca de novo o PRÓPRIO boletim com a sessão dele
-- (get_meu_boletim), então nenhum dado circula pelo canal.
--
-- No máximo um aviso a cada 5 segundos (publicações em rajada viram um só);
-- o app espera de 6 a 10 s antes de buscar, cobrindo essa janela.
-- Uma falha no aviso nunca atrapalha a gravação.
-- Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS private.relatorio_aviso (
  id  integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  em  timestamptz NOT NULL DEFAULT 'epoch'
);
INSERT INTO private.relatorio_aviso (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
REVOKE ALL ON private.relatorio_aviso FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION private.relatorio_avisar_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  BEGIN
    UPDATE private.relatorio_aviso SET em = now()
     WHERE id = 1 AND em < now() - interval '5 seconds';
    IF FOUND THEN
      PERFORM realtime.send(jsonb_build_object('em', now()), 'atualizado', 'relatorio-atualizado', false);
    END IF;
  EXCEPTION WHEN others THEN
    NULL;  -- o aviso é conveniência; a gravação nunca pode falhar por ele
  END;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION private.relatorio_avisar_trg() FROM public, anon, authenticated;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['relatorio_lancamentos', 'relatorio_ocorrencias', 'relatorio_aulas', 'report_sync_state'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_aviso_tempo_real', t);
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION private.relatorio_avisar_trg()',
                   t || '_aviso_tempo_real', t);
  END LOOP;
END;
$$;
