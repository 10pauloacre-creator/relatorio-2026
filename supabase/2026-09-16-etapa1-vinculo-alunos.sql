-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPA 1 — Vínculo de identidade Relatório 2026 ↔ Biblioteca Digital
-- ───────────────────────────────────────────────────────────────────────────
-- Os painéis de alunos do Relatório guardam cada turma em report_sync_state
-- (payload.alunos[]), identificando o aluno por um id local e pelo nome.
-- A Biblioteca guarda o aluno em public.alunos, com escola, grupo e série.
--
-- Este arquivo cria a "ponte" entre os dois:
--   relatorio_turmas         → qual turma do Relatório é qual escola/grupo/série
--   relatorio_aluno_vinculo  → qual aluno do Relatório é qual aluno da Biblioteca
--   relatorio_sincronizar_vinculos() → refaz o casamento automático
--
-- Regra anti-cruzamento: um aluno só é casado com candidatos da MESMA escola,
-- do MESMO grupo e de uma das séries aceitas pela turma. Nome igual em outra
-- escola ou turma nunca é considerado. Número de chamada não é usado para
-- casar, porque nos grupos mistos (8º/9º, 2ª/3ª) a numeração recomeça por série.
--
-- Vínculos marcados como 'manual' nunca são sobrescritos pela sincronização.
-- Idempotente: pode rodar de novo sem perder dados.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.relatorio_normalizar_nome(p_nome text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT lower(regexp_replace(trim(public.unaccent(coalesce(p_nome, ''))), '\s+', ' ', 'g'));
$$;

-- ── 1. Turmas do Relatório ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.relatorio_turmas (
  scope_key       text PRIMARY KEY,
  escola_id       uuid NOT NULL REFERENCES public.escolas(id) ON DELETE RESTRICT,
  grupo_turma_id  uuid NULL REFERENCES public.grupos_turma(id) ON DELETE RESTRICT,
  series          text[] NOT NULL,
  rotulo          text NOT NULL,
  ativo           boolean NOT NULL DEFAULT true,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.relatorio_turmas (scope_key, escola_id, grupo_turma_id, series, rotulo)
SELECT v.scope_key, e.id, g.id, v.series, v.rotulo
FROM (VALUES
  ('casavequia:panel:pc_alunos_1serie_2026_v1', 'padre-carlos-casavequia',     'pcc-1-serie', ARRAY['1ª Série'],            'Casavequia · 1ª Série'),
  ('casavequia:panel:pc_alunos_2serie_2026_v1', 'padre-carlos-casavequia',     'pcc-2-serie', ARRAY['2ª Série'],            'Casavequia · 2ª Série'),
  ('casavequia:panel:pc_alunos_3serie_2026_v1', 'padre-carlos-casavequia',     'pcc-3-serie', ARRAY['3ª Série'],            'Casavequia · 3ª Série'),
  ('casavequia:panel:pc_alunos_6ano_2026_v1',   'padre-carlos-casavequia',     NULL,          ARRAY['6º Ano'],              'Casavequia · 6º Ano'),
  ('herminio:panel:rh_alunos_1serie_2026_v1',   'raimundo-herminio-de-melo-2', 'rhm2-em-1',   ARRAY['1ª Série'],            'Hermínio · 1ª Série'),
  ('herminio:panel:rh_alunos_2serie_2026_v1',   'raimundo-herminio-de-melo-2', 'rhm2-em-2-3', ARRAY['2ª Série'],            'Hermínio · 2ª Série'),
  ('herminio:panel:rh_alunos_3serie_2026_v1',   'raimundo-herminio-de-melo-2', 'rhm2-em-2-3', ARRAY['3ª Série'],            'Hermínio · 3ª Série'),
  ('herminio:panel:rh_alunos_8e9ano_2026_v1',   'raimundo-herminio-de-melo-2', 'rhm2-8-9',    ARRAY['8º Ano', '9º Ano'],    'Hermínio · 8º e 9º Ano')
) AS v(scope_key, escola_slug, grupo_slug, series, rotulo)
JOIN public.escolas e ON e.slug = v.escola_slug
LEFT JOIN public.grupos_turma g ON g.slug = v.grupo_slug
ON CONFLICT (scope_key) DO UPDATE
  SET escola_id = EXCLUDED.escola_id,
      grupo_turma_id = EXCLUDED.grupo_turma_id,
      series = EXCLUDED.series,
      rotulo = EXCLUDED.rotulo;

-- ── 2. Vínculo aluno a aluno ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.relatorio_aluno_vinculo (
  scope_key           text NOT NULL REFERENCES public.relatorio_turmas(scope_key) ON DELETE CASCADE,
  aluno_relatorio_id  integer NOT NULL,
  numero_chamada      integer,
  nome_relatorio      text NOT NULL,
  transferido         boolean NOT NULL DEFAULT false,
  aluno_id            uuid NULL REFERENCES public.alunos(id) ON DELETE SET NULL,
  metodo              text NOT NULL CHECK (metodo IN ('nome', 'nome_parcial', 'manual', 'pendente')),
  atualizado_em       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope_key, aluno_relatorio_id)
);

CREATE INDEX IF NOT EXISTS relatorio_aluno_vinculo_aluno_idx
  ON public.relatorio_aluno_vinculo (aluno_id);

-- ── 3. Casamento automático ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.relatorio_sincronizar_vinculos()
RETURNS TABLE (turma text, total integer, por_nome integer, parcial integer, manual integer, pendentes integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.role(), 'service_role') <> 'service_role' AND NOT COALESCE((SELECT private.is_admin()), false) THEN
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
    WHERE t.ativo AND (a.value ->> 'id') ~ '^\d+$'
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
  escolha AS (
    SELECT o.*,
      CASE
        WHEN (SELECT count(*) FROM candidatos c WHERE c.scope_key = o.scope_key AND c.aluno_relatorio_id = o.aluno_relatorio_id AND c.exato) = 1
          THEN (SELECT c.aluno_id FROM candidatos c WHERE c.scope_key = o.scope_key AND c.aluno_relatorio_id = o.aluno_relatorio_id AND c.exato)
        WHEN (SELECT count(*) FROM candidatos c WHERE c.scope_key = o.scope_key AND c.aluno_relatorio_id = o.aluno_relatorio_id AND c.parcial) = 1
          THEN (SELECT c.aluno_id FROM candidatos c WHERE c.scope_key = o.scope_key AND c.aluno_relatorio_id = o.aluno_relatorio_id AND c.parcial)
      END AS aluno_id,
      CASE
        WHEN (SELECT count(*) FROM candidatos c WHERE c.scope_key = o.scope_key AND c.aluno_relatorio_id = o.aluno_relatorio_id AND c.exato) = 1 THEN 'nome'
        WHEN (SELECT count(*) FROM candidatos c WHERE c.scope_key = o.scope_key AND c.aluno_relatorio_id = o.aluno_relatorio_id AND c.parcial) = 1 THEN 'nome_parcial'
        ELSE 'pendente'
      END AS metodo
    FROM origem o
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
        atualizado_em  = now();

  RETURN QUERY
  SELECT t.rotulo,
         count(v.*)::int,
         count(*) FILTER (WHERE v.metodo = 'nome')::int,
         count(*) FILTER (WHERE v.metodo = 'nome_parcial')::int,
         count(*) FILTER (WHERE v.metodo = 'manual')::int,
         count(*) FILTER (WHERE v.metodo = 'pendente')::int
  FROM relatorio_turmas t
  LEFT JOIN relatorio_aluno_vinculo v ON v.scope_key = t.scope_key
  GROUP BY t.rotulo
  ORDER BY t.rotulo;
END;
$$;

-- Vínculo manual (para os pendentes): informe o aluno da Biblioteca, ou NULL
-- para marcar que o aluno não tem cadastro lá.
CREATE OR REPLACE FUNCTION public.relatorio_vincular_manual(p_scope_key text, p_aluno_relatorio_id integer, p_aluno_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turma relatorio_turmas%ROWTYPE;
BEGIN
  IF COALESCE(auth.role(), 'service_role') <> 'service_role' AND NOT COALESCE((SELECT private.is_admin()), false) THEN
    RAISE EXCEPTION 'Apenas o administrador pode vincular alunos.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_turma FROM relatorio_turmas WHERE scope_key = p_scope_key;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Turma % não existe.', p_scope_key;
  END IF;

  IF p_aluno_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM alunos al
    WHERE al.id = p_aluno_id
      AND al.escola_id = v_turma.escola_id
      AND al.grupo_turma_id IS NOT DISTINCT FROM v_turma.grupo_turma_id
      AND al.serie = ANY (v_turma.series)
  ) THEN
    RAISE EXCEPTION 'Aluno de outra escola, turma ou série: vínculo recusado.' USING ERRCODE = '22023';
  END IF;

  UPDATE relatorio_aluno_vinculo
     SET aluno_id = p_aluno_id, metodo = 'manual', atualizado_em = now()
   WHERE scope_key = p_scope_key AND aluno_relatorio_id = p_aluno_relatorio_id;
END;
$$;

-- ── 4. Segurança ────────────────────────────────────────────────────────────
ALTER TABLE public.relatorio_turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorio_aluno_vinculo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS relatorio_turmas_admin ON public.relatorio_turmas;
CREATE POLICY relatorio_turmas_admin ON public.relatorio_turmas
  FOR ALL TO authenticated
  USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));

DROP POLICY IF EXISTS relatorio_aluno_vinculo_admin ON public.relatorio_aluno_vinculo;
CREATE POLICY relatorio_aluno_vinculo_admin ON public.relatorio_aluno_vinculo
  FOR ALL TO authenticated
  USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));

REVOKE ALL ON public.relatorio_turmas, public.relatorio_aluno_vinculo FROM anon;
REVOKE ALL ON FUNCTION public.relatorio_sincronizar_vinculos() FROM public, anon;
REVOKE ALL ON FUNCTION public.relatorio_vincular_manual(text, integer, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_sincronizar_vinculos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.relatorio_vincular_manual(text, integer, uuid) TO authenticated;
