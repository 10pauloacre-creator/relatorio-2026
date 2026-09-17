-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPA 5B — Aluno novo na Biblioteca entra sozinho no Relatório
-- ───────────────────────────────────────────────────────────────────────────
-- As listas do diário e dos painéis são fixas no HTML. Quando a Biblioteca
-- ganha um aluno (escola + grupo + série de uma turma do Relatório) que não
-- está nessas listas, ele é registrado aqui e as páginas completam as listas
-- (assets/js/relatorio-alunos-adicionados.js). A partir daí ele entra em
-- presença, atividades, notas, provas, observações e relatório individual,
-- porque tudo isso já é montado a partir das listas das páginas.
--
-- - Número de chamada: o próximo livre da turma, na ordem em que o aluno foi
--   registrado aqui (nunca renumera quem já está na lista).
-- - "desde": data de entrada. Aulas anteriores não contam presença nem
--   atividade para ele. Padrão: o dia em que a conta foi criada na Biblioteca.
-- - Gatilho em alunos: novo cadastro ou troca de turma registra na hora.
--
-- Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.relatorio_alunos_adicionados (
  aluno_id      uuid PRIMARY KEY REFERENCES public.alunos(id) ON DELETE CASCADE,
  escola_id     uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  turma_codigo  text NOT NULL,            -- turma do diário (t2, t89...)
  scope_key     text NOT NULL,            -- painel do aluno
  nome          text NOT NULL,
  desde         date NOT NULL,
  ordem         bigserial,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.relatorio_alunos_adicionados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS relatorio_alunos_adicionados_admin ON public.relatorio_alunos_adicionados;
CREATE POLICY relatorio_alunos_adicionados_admin ON public.relatorio_alunos_adicionados FOR ALL TO authenticated
  USING ((SELECT private.is_relatorio_admin())) WITH CHECK ((SELECT private.is_relatorio_admin()));
REVOKE ALL ON public.relatorio_alunos_adicionados FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relatorio_alunos_adicionados TO authenticated;

-- Chamada de cada turma do diário, como está na página (gravada a cada
-- publicação). "adicionado" = veio desta tabela, não da lista fixa.
CREATE TABLE IF NOT EXISTS public.relatorio_chamada (
  escola_id       uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  turma_codigo    text NOT NULL,
  numero_chamada  integer NOT NULL,
  nome            text NOT NULL,
  transferido     boolean NOT NULL DEFAULT false,
  adicionado      boolean NOT NULL DEFAULT false,
  atualizada_em   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (escola_id, turma_codigo, numero_chamada)
);
ALTER TABLE public.relatorio_chamada ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS relatorio_chamada_admin ON public.relatorio_chamada;
CREATE POLICY relatorio_chamada_admin ON public.relatorio_chamada FOR ALL TO authenticated
  USING ((SELECT private.is_relatorio_admin())) WITH CHECK ((SELECT private.is_relatorio_admin()));
REVOKE ALL ON public.relatorio_chamada FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relatorio_chamada TO authenticated;

-- Registra os alunos da Biblioteca que faltam nas listas do Relatório.
-- p_aluno_id NULL = todos.
CREATE OR REPLACE FUNCTION public.relatorio_registrar_alunos_novos(p_aluno_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
BEGIN
  WITH candidatos AS (
    SELECT DISTINCT ON (al.id)
           al.id AS aluno_id, t.escola_id, td.turma_codigo, t.scope_key, btrim(al.nome_completo) AS nome,
           COALESCE(al.created_at::date, current_date) AS desde
    FROM alunos al
    JOIN relatorio_turmas t
      ON t.ativo AND t.grupo_turma_id IS NOT NULL
     AND al.escola_id = t.escola_id AND al.grupo_turma_id = t.grupo_turma_id AND al.serie = ANY (t.series)
    JOIN relatorio_turmas_diarias td ON td.escola_id = t.escola_id AND t.scope_key = ANY (td.scope_keys)
    WHERE (p_aluno_id IS NULL OR al.id = p_aluno_id)
      AND COALESCE(al.role, 'aluno') = 'aluno'
      AND btrim(COALESCE(al.nome_completo, '')) <> ''
      -- já ligado a um painel
      AND NOT EXISTS (SELECT 1 FROM relatorio_aluno_vinculo v WHERE v.aluno_id = al.id)
      -- já está no painel com o mesmo nome (vínculo ainda não refeito)
      AND NOT EXISTS (SELECT 1 FROM relatorio_aluno_vinculo v
                       WHERE v.scope_key = t.scope_key
                         AND relatorio_normalizar_nome(v.nome_relatorio) = relatorio_normalizar_nome(al.nome_completo))
      -- já está na lista fixa da página (chamada publicada)
      AND NOT EXISTS (SELECT 1 FROM relatorio_chamada c
                       WHERE c.escola_id = t.escola_id AND c.turma_codigo = td.turma_codigo AND NOT c.adicionado
                         AND relatorio_normalizar_nome(c.nome) = relatorio_normalizar_nome(al.nome_completo))
      -- já está na chamada das aulas com o mesmo nome
      AND NOT EXISTS (SELECT 1 FROM relatorio_lancamentos l
                        JOIN relatorio_aulas a ON a.id = l.aula_id
                       WHERE a.escola_id = t.escola_id AND a.turma_codigo = td.turma_codigo
                         AND relatorio_normalizar_nome(l.nome_relatorio) = relatorio_normalizar_nome(al.nome_completo))
    ORDER BY al.id, t.scope_key
  ),
  gravados AS (
    INSERT INTO relatorio_alunos_adicionados (aluno_id, escola_id, turma_codigo, scope_key, nome, desde)
    SELECT aluno_id, escola_id, turma_codigo, scope_key, nome, desde FROM candidatos
    ORDER BY desde, nome
    ON CONFLICT (aluno_id) DO UPDATE
      SET escola_id = EXCLUDED.escola_id, turma_codigo = EXCLUDED.turma_codigo,
          scope_key = EXCLUDED.scope_key, nome = EXCLUDED.nome
      WHERE (relatorio_alunos_adicionados.escola_id, relatorio_alunos_adicionados.turma_codigo,
             relatorio_alunos_adicionados.scope_key, relatorio_alunos_adicionados.nome)
        IS DISTINCT FROM (EXCLUDED.escola_id, EXCLUDED.turma_codigo, EXCLUDED.scope_key, EXCLUDED.nome)
    RETURNING 1
  )
  SELECT count(*) INTO v_total FROM gravados;
  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.relatorio_registrar_alunos_novos(uuid) FROM public, anon, authenticated;

-- Gatilho: cadastro novo ou troca de turma/nome na Biblioteca.
CREATE OR REPLACE FUNCTION private.relatorio_aluno_novo_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.relatorio_registrar_alunos_novos(NEW.id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS alunos_relatorio_novo ON public.alunos;
CREATE TRIGGER alunos_relatorio_novo
  AFTER INSERT OR UPDATE OF escola_id, grupo_turma_id, serie, nome_completo ON public.alunos
  FOR EACH ROW EXECUTE FUNCTION private.relatorio_aluno_novo_trg();

-- Nova turma do Relatório (relatorio_turmas) puxa os alunos dela.
CREATE OR REPLACE FUNCTION private.relatorio_turma_nova_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.relatorio_registrar_alunos_novos(NULL);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS relatorio_turmas_alunos_novos ON public.relatorio_turmas;
CREATE TRIGGER relatorio_turmas_alunos_novos
  AFTER INSERT OR UPDATE OF grupo_turma_id, series, ativo ON public.relatorio_turmas
  FOR EACH STATEMENT EXECUTE FUNCTION private.relatorio_turma_nova_trg();

-- Lista para as páginas (só o professor).
CREATE OR REPLACE FUNCTION public.relatorio_alunos_adicionados_da_escola(p_escola_slug text)
RETURNS TABLE (turma_codigo text, scope_key text, nome text, desde date, aluno_id uuid, ordem bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.role(), 'service_role') <> 'service_role' AND NOT COALESCE((SELECT private.is_relatorio_admin()), false) THEN
    RAISE EXCEPTION 'Apenas o administrador pode ver as listas.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT a.turma_codigo, a.scope_key, a.nome, a.desde, a.aluno_id, a.ordem
  FROM relatorio_alunos_adicionados a
  JOIN escolas e ON e.id = a.escola_id
  WHERE e.slug = p_escola_slug
  ORDER BY a.turma_codigo, a.ordem;
END;
$$;

REVOKE ALL ON FUNCTION public.relatorio_alunos_adicionados_da_escola(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_alunos_adicionados_da_escola(text) TO authenticated;

-- Publicação: grava a chamada completa e limpa "adicionados" que já estão
-- fixos na página. O 4º item de cada aluno no retrato é "adicionado".
CREATE OR REPLACE FUNCTION public.relatorio_publicar_lancamentos(p_escola_slug text, p_snapshot jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_escola_id        uuid;
  v_aulas_existentes integer;
  v_aulas_retrato    integer;
  v_ocorr_existentes integer;
  v_ocorr_retrato    integer;
  v_pode_remover     boolean;
  v_pode_remover_oc  boolean;
  v_lancamentos      integer;
  v_sem_vinculo      jsonb;
BEGIN
  IF COALESCE(auth.role(), 'service_role') <> 'service_role' AND NOT COALESCE((SELECT private.is_relatorio_admin()), false) THEN
    RAISE EXCEPTION 'Apenas o administrador pode publicar lançamentos.' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_escola_id FROM escolas WHERE slug = p_escola_slug;
  IF v_escola_id IS NULL THEN
    RAISE EXCEPTION 'Escola % não encontrada.', p_escola_slug;
  END IF;

  -- Metas por turma/disciplina (o que o contador da página usa).
  INSERT INTO relatorio_metas_bimestrais AS mb (escola_id, turma_codigo, disciplina, aulas_bimestre, aulas_ano, credito_anterior, atualizada_em)
  SELECT v_escola_id, m ->> 't', m ->> 'disc', (m ->> 'meta')::int, NULLIF(m ->> 'total', '')::int,
         COALESCE(NULLIF(m ->> 'credito', '')::int, 0), now()
  FROM jsonb_array_elements(COALESCE(p_snapshot -> 'metas', '[]'::jsonb)) AS m
  WHERE COALESCE(m ->> 't', '') <> '' AND COALESCE(m ->> 'disc', '') <> '' AND (m ->> 'meta') ~ '^\d+$'
  ON CONFLICT (escola_id, turma_codigo, disciplina) DO UPDATE
    SET aulas_bimestre = EXCLUDED.aulas_bimestre,
        aulas_ano = EXCLUDED.aulas_ano,
        credito_anterior = EXCLUDED.credito_anterior,
        atualizada_em = now()
    WHERE (mb.aulas_bimestre, mb.aulas_ano, mb.credito_anterior)
      IS DISTINCT FROM (EXCLUDED.aulas_bimestre, EXCLUDED.aulas_ano, EXCLUDED.credito_anterior);

  CREATE TEMP TABLE IF NOT EXISTS _rel_alunos (turma text, n integer, nome text, tr boolean, aluno_id uuid, adicionado boolean) ON COMMIT DROP;
  CREATE TEMP TABLE IF NOT EXISTS _rel_aulas (
    id text, codigo text, turma text, data date, bimestre smallint, disciplina text, horario text, tema text,
    carga numeric, horas_disciplina numeric, p jsonb, a jsonb
  ) ON COMMIT DROP;
  TRUNCATE _rel_alunos, _rel_aulas;

  INSERT INTO _rel_alunos (turma, n, nome, tr, aluno_id, adicionado)
  SELECT t ->> 'codigo', (al ->> 0)::int, al ->> 1, COALESCE((al ->> 2)::boolean, false),
         relatorio_resolver_aluno(v_escola_id, t ->> 'codigo', al ->> 1),
         COALESCE((al ->> 3)::boolean, false)
  FROM jsonb_array_elements(COALESCE(p_snapshot -> 'turmas', '[]'::jsonb)) AS t
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t -> 'alunos', '[]'::jsonb)) AS al
  WHERE (al ->> 0) ~ '^\d+$';

  INSERT INTO _rel_aulas
  SELECT p_escola_slug || ':' || (x ->> 'c'), x ->> 'c', x ->> 't', (x ->> 'd')::date,
         LEAST(4, GREATEST(1, COALESCE(NULLIF(x ->> 'b', '')::int, 1)))::smallint,
         COALESCE(x ->> 'disc', ''), NULLIF(x ->> 'h', ''), NULLIF(x ->> 'tema', ''),
         COALESCE(NULLIF(x ->> 'carga', '')::numeric, 1),
         COALESCE(NULLIF(x ->> 'hd', '')::numeric, NULLIF(x ->> 'carga', '')::numeric, 1),
         NULLIF(x -> 'p', 'null'::jsonb), NULLIF(x -> 'a', 'null'::jsonb)
  FROM jsonb_array_elements(COALESCE(p_snapshot -> 'aulas', '[]'::jsonb)) AS x
  WHERE COALESCE(x ->> 'c', '') <> '' AND (x ->> 'd') ~ '^\d{4}-\d{2}-\d{2}$';

  -- Chamada completa de cada turma (inclusive turma ainda sem aula no banco).
  INSERT INTO relatorio_chamada AS c (escola_id, turma_codigo, numero_chamada, nome, transferido, adicionado, atualizada_em)
  SELECT DISTINCT ON (turma, n) v_escola_id, turma, n, nome, tr, adicionado, now() FROM _rel_alunos ORDER BY turma, n
  ON CONFLICT (escola_id, turma_codigo, numero_chamada) DO UPDATE
    SET nome = EXCLUDED.nome, transferido = EXCLUDED.transferido, adicionado = EXCLUDED.adicionado, atualizada_em = now()
    WHERE (c.nome, c.transferido, c.adicionado) IS DISTINCT FROM (EXCLUDED.nome, EXCLUDED.transferido, EXCLUDED.adicionado);
  DELETE FROM relatorio_chamada c
   WHERE c.escola_id = v_escola_id
     AND EXISTS (SELECT 1 FROM _rel_alunos x WHERE x.turma = c.turma_codigo)
     AND NOT EXISTS (SELECT 1 FROM _rel_alunos x WHERE x.turma = c.turma_codigo AND x.n = c.numero_chamada);
  -- Quem já está fixo na lista da página deixa de ser "adicionado".
  DELETE FROM relatorio_alunos_adicionados ad
   WHERE ad.escola_id = v_escola_id
     AND EXISTS (SELECT 1 FROM _rel_alunos x WHERE x.turma = ad.turma_codigo AND NOT x.adicionado
                   AND relatorio_normalizar_nome(x.nome) = relatorio_normalizar_nome(ad.nome));
  PERFORM relatorio_registrar_alunos_novos(NULL);

  SELECT count(*) INTO v_aulas_retrato FROM _rel_aulas;
  SELECT count(*) INTO v_aulas_existentes FROM relatorio_aulas WHERE escola_id = v_escola_id AND NOT removida;
  v_pode_remover := v_aulas_existentes < 20 OR v_aulas_retrato >= v_aulas_existentes * 0.8;

  INSERT INTO relatorio_aulas AS ra
    (id, escola_id, turma_codigo, codigo, disciplina, data, bimestre, horario, tema, carga, horas_disciplina,
     tem_presenca, tem_atividade, removida, publicada_em, atualizada_em)
  SELECT id, v_escola_id, turma, codigo, disciplina, data, bimestre,
         horario, tema, carga, horas_disciplina, p IS NOT NULL, a IS NOT NULL, false, now(), now()
  FROM _rel_aulas
  ON CONFLICT (id) DO UPDATE
    SET turma_codigo  = EXCLUDED.turma_codigo,
        disciplina    = EXCLUDED.disciplina,
        data          = EXCLUDED.data,
        bimestre      = EXCLUDED.bimestre,
        horario       = EXCLUDED.horario,
        tema          = EXCLUDED.tema,
        carga         = EXCLUDED.carga,
        horas_disciplina = EXCLUDED.horas_disciplina,
        tem_presenca  = EXCLUDED.tem_presenca,
        tem_atividade = EXCLUDED.tem_atividade,
        removida      = false,
        atualizada_em = now()
    WHERE (ra.turma_codigo, ra.disciplina, ra.data, ra.bimestre, ra.horario, ra.tema, ra.carga, ra.horas_disciplina, ra.tem_presenca, ra.tem_atividade, ra.removida)
      IS DISTINCT FROM
          (EXCLUDED.turma_codigo, EXCLUDED.disciplina, EXCLUDED.data, EXCLUDED.bimestre, EXCLUDED.horario, EXCLUDED.tema, EXCLUDED.carga, EXCLUDED.horas_disciplina, EXCLUDED.tem_presenca, EXCLUDED.tem_atividade, false);

  PERFORM relatorio_aplicar_vale_ponto(p_escola_slug, p_snapshot);

  IF v_pode_remover THEN
    UPDATE relatorio_aulas ra SET removida = true, atualizada_em = now()
    WHERE ra.escola_id = v_escola_id AND NOT ra.removida
      AND NOT EXISTS (SELECT 1 FROM _rel_aulas x WHERE x.id = ra.id);
  END IF;

  WITH novos AS (
    SELECT x.id AS aula_id, al.n AS numero_chamada, al.nome AS nome_relatorio, al.tr AS transferido, al.aluno_id,
           CASE x.p ->> al.n::text WHEN 'p' THEN 'presente' WHEN 'f' THEN 'falta' WHEN 'j' THEN 'falta_justificada' END AS presenca,
           CASE x.a ->> al.n::text WHEN 'fz' THEN 'fez' WHEN 'nf' THEN 'nao_fez' WHEN 'ag' THEN 'aguardando' WHEN 'pd' THEN 'pendente' END AS atividade
    FROM _rel_aulas x
    JOIN _rel_alunos al ON al.turma = x.turma
  ),
  gravados AS (
    INSERT INTO relatorio_lancamentos AS rl
      (aula_id, numero_chamada, nome_relatorio, transferido, aluno_id, presenca, atividade)
    SELECT aula_id, numero_chamada, nome_relatorio, transferido, aluno_id, presenca, atividade FROM novos
    ON CONFLICT (aula_id, numero_chamada) DO UPDATE
      SET nome_relatorio = EXCLUDED.nome_relatorio,
          transferido    = EXCLUDED.transferido,
          aluno_id       = EXCLUDED.aluno_id,
          presenca       = EXCLUDED.presenca,
          atividade      = EXCLUDED.atividade
      WHERE (rl.nome_relatorio, rl.transferido, rl.aluno_id, rl.presenca, rl.atividade)
        IS DISTINCT FROM (EXCLUDED.nome_relatorio, EXCLUDED.transferido, EXCLUDED.aluno_id, EXCLUDED.presenca, EXCLUDED.atividade)
    RETURNING 1
  )
  SELECT count(*) INTO v_lancamentos FROM gravados;

  DELETE FROM relatorio_lancamentos rl
  USING _rel_aulas x
  WHERE rl.aula_id = x.id
    AND NOT EXISTS (SELECT 1 FROM _rel_alunos al WHERE al.turma = x.turma AND al.n = rl.numero_chamada);

  CREATE TEMP TABLE IF NOT EXISTS _rel_ocorr (
    id text, turma text, relato text, data date, horario text, disciplina text,
    n integer, nome text, icone text, positiva boolean, texto text
  ) ON COMMIT DROP;
  TRUNCATE _rel_ocorr;

  INSERT INTO _rel_ocorr
  SELECT DISTINCT ON (oid)
    oid, turma, relato, data, horario, disciplina, n, nome, icone, positiva, texto
  FROM (
    SELECT md5(p_escola_slug || '|' || (o ->> 't') || '|' || (o ->> 'd') || '|' ||
               relatorio_normalizar_nome(o ->> 'nome') || '|' || relatorio_normalizar_nome(o ->> 'txt')) AS oid,
           o ->> 't' AS turma, NULLIF(o ->> 'r', '') AS relato, (o ->> 'd')::date AS data,
           NULLIF(o ->> 'h', '') AS horario, NULLIF(o ->> 'disc', '') AS disciplina,
           NULLIF(o ->> 'n', '')::int AS n, o ->> 'nome' AS nome, NULLIF(o ->> 'ic', '') AS icone,
           COALESCE((o ->> 'pos')::boolean, false) AS positiva, o ->> 'txt' AS texto
    FROM jsonb_array_elements(COALESCE(p_snapshot -> 'ocorrencias', '[]'::jsonb)) AS o
    WHERE COALESCE(o ->> 'nome', '') <> '' AND COALESCE(o ->> 'txt', '') <> ''
      AND (o ->> 'd') ~ '^\d{4}-\d{2}-\d{2}$'
  ) s;

  SELECT count(*) INTO v_ocorr_retrato FROM _rel_ocorr;
  SELECT count(*) INTO v_ocorr_existentes FROM relatorio_ocorrencias WHERE escola_id = v_escola_id AND NOT removida AND origem = 'relato';
  v_pode_remover_oc := v_pode_remover AND (v_ocorr_existentes < 10 OR v_ocorr_retrato >= v_ocorr_existentes * 0.8);

  -- Bimestre da ocorrência = bimestre da aula do mesmo relato; sem aula
  -- correspondente, o da última aula da turma (mesma disciplina, se houver)
  -- até aquela data.
  INSERT INTO relatorio_ocorrencias AS ro
    (id, escola_id, turma_codigo, relato_codigo, data, bimestre, horario, disciplina, numero_chamada,
     nome_relatorio, aluno_id, icone, positiva, texto, removida, publicada_em, atualizada_em)
  SELECT o.id, v_escola_id, o.turma, o.relato, o.data,
         COALESCE(
           (SELECT x.bimestre FROM _rel_aulas x WHERE x.codigo = o.relato LIMIT 1),
           (SELECT x.bimestre FROM _rel_aulas x
             WHERE x.turma = o.turma AND x.data <= o.data
             ORDER BY (x.disciplina = COALESCE(o.disciplina, '')) DESC, x.data DESC, x.codigo DESC LIMIT 1),
           1
         ),
         o.horario, o.disciplina,
         COALESCE(o.n, (SELECT al.n FROM _rel_alunos al WHERE al.turma = o.turma
                         AND relatorio_normalizar_nome(al.nome) = relatorio_normalizar_nome(o.nome) LIMIT 1)),
         o.nome,
         COALESCE(
           (SELECT al.aluno_id FROM _rel_alunos al WHERE al.turma = o.turma AND al.n = o.n),
           relatorio_resolver_aluno(v_escola_id, o.turma, regexp_replace(o.nome, '\s*\([^)]*\)', '', 'g'))
         ),
         o.icone, o.positiva, o.texto, false, now(), now()
  FROM _rel_ocorr o
  ON CONFLICT (id) DO UPDATE
    SET relato_codigo  = EXCLUDED.relato_codigo,
        bimestre       = EXCLUDED.bimestre,
        horario        = EXCLUDED.horario,
        disciplina     = EXCLUDED.disciplina,
        numero_chamada = EXCLUDED.numero_chamada,
        aluno_id       = EXCLUDED.aluno_id,
        icone          = EXCLUDED.icone,
        positiva       = EXCLUDED.positiva,
        removida       = false,
        atualizada_em  = now()
    WHERE (ro.relato_codigo, ro.bimestre, ro.horario, ro.disciplina, ro.numero_chamada, ro.aluno_id, ro.icone, ro.positiva, ro.removida)
      IS DISTINCT FROM
          (EXCLUDED.relato_codigo, EXCLUDED.bimestre, EXCLUDED.horario, EXCLUDED.disciplina, EXCLUDED.numero_chamada, EXCLUDED.aluno_id, EXCLUDED.icone, EXCLUDED.positiva, false);

  IF v_pode_remover_oc THEN
    UPDATE relatorio_ocorrencias ro SET removida = true, atualizada_em = now()
    WHERE ro.escola_id = v_escola_id AND NOT ro.removida AND ro.origem = 'relato'
      AND NOT EXISTS (SELECT 1 FROM _rel_ocorr o WHERE o.id = ro.id);
  END IF;

  SELECT COALESCE(jsonb_agg(DISTINCT al.turma || ' · ' || al.nome), '[]'::jsonb) INTO v_sem_vinculo
  FROM _rel_alunos al
  JOIN relatorio_turmas_diarias td ON td.escola_id = v_escola_id AND td.turma_codigo = al.turma
  JOIN relatorio_turmas t ON t.scope_key = ANY (td.scope_keys) AND t.grupo_turma_id IS NOT NULL
  WHERE al.aluno_id IS NULL AND NOT al.tr;

  RETURN jsonb_build_object(
    'escola', p_escola_slug,
    'aulas', v_aulas_retrato,
    'lancamentos_alterados', v_lancamentos,
    'ocorrencias', v_ocorr_retrato,
    'remocao_aplicada', v_pode_remover,
    'alunos_sem_vinculo', v_sem_vinculo
  );
END;
$function$;

-- Carga inicial. Os 8 alunos da Hermínio 3ª Série já estão na lista fixa (a
-- turma ainda não tem aula no banco); a publicação também os limparia.
DELETE FROM public.relatorio_alunos_adicionados
 WHERE turma_codigo = 't23' AND scope_key = 'herminio:panel:rh_alunos_3serie_2026_v1' AND desde = DATE '2026-09-16';
-- Carga inicial.
SELECT public.relatorio_registrar_alunos_novos(NULL) AS registrados;
SELECT turma_codigo, scope_key, nome, desde FROM public.relatorio_alunos_adicionados ORDER BY ordem;
