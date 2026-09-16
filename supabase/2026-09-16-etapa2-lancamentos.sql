-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPA 2 — Tabelas oficiais de lançamentos (Relatório 2026)
-- ───────────────────────────────────────────────────────────────────────────
-- Até aqui presença, atividades e ocorrências viviam espalhadas entre o HTML
-- dos relatos, objetos fixos no código (PRESENCA/ATIVIDADES) e os cliques
-- guardados em report_sync_state. A página já sabe juntar tudo isso; agora ela
-- PUBLICA o resultado, aula por aula e aluno por aluno, nestas tabelas:
--
--   relatorio_bimestres       datas de início/fim de cada bimestre por escola
--   relatorio_turmas_diarias  turma do diário (t1, t23...) → painéis/vínculos
--   relatorio_aulas           uma linha por aula registrada
--   relatorio_lancamentos     presença e atividade de cada aluno em cada aula
--   relatorio_ocorrencias     observações de comportamento, com dia e horário
--
-- Campos que são DECISÃO DO PROFESSOR nunca são sobrescritos pela publicação:
--   relatorio_aulas.atividade_vale_ponto        (interruptor — Etapa 3)
--   relatorio_ocorrencias.gravidade*            (leve/médio/grave — Etapa 4)
--
-- Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Bimestres ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.relatorio_bimestres (
  escola_id  uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  ano        smallint NOT NULL,
  bimestre   smallint NOT NULL CHECK (bimestre BETWEEN 1 AND 4),
  inicio     date NOT NULL,
  fim        date NOT NULL,
  fonte      text,
  PRIMARY KEY (escola_id, ano, bimestre),
  CHECK (fim >= inicio)
);

-- Derivado do Calendário Escolar 2026 (SEE/AC), igual para as duas escolas:
-- 1º termina na semana de avaliação (23–28/04); 2º no fim do 1º semestre
-- (17/07); 3º na avaliação de 28/09–02/10; 4º no término do ano letivo.
INSERT INTO public.relatorio_bimestres (escola_id, ano, bimestre, inicio, fim, fonte)
SELECT e.id, 2026, b.bimestre, b.inicio, b.fim, 'Calendário Escolar 2026 — semanas de avaliação'
FROM public.escolas e
CROSS JOIN (VALUES
  (1, DATE '2026-02-23', DATE '2026-04-28'),
  (2, DATE '2026-04-29', DATE '2026-07-17'),
  (3, DATE '2026-08-03', DATE '2026-10-02'),
  (4, DATE '2026-10-05', DATE '2026-11-28')
) AS b(bimestre, inicio, fim)
WHERE e.slug IN ('padre-carlos-casavequia', 'raimundo-herminio-de-melo-2')
ON CONFLICT (escola_id, ano, bimestre) DO NOTHING;

-- Bimestre de uma data. Dias fora dos intervalos (recesso, sábado letivo antes
-- do início oficial) ficam no último bimestre que já começou.
CREATE OR REPLACE FUNCTION public.relatorio_bimestre_da_data(p_escola_id uuid, p_data date)
RETURNS smallint
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT b.bimestre FROM relatorio_bimestres b
      WHERE b.escola_id = p_escola_id AND p_data BETWEEN b.inicio AND b.fim
      ORDER BY b.ano DESC LIMIT 1),
    (SELECT b.bimestre FROM relatorio_bimestres b
      WHERE b.escola_id = p_escola_id AND b.inicio <= p_data AND b.ano = extract(year FROM p_data)
      ORDER BY b.inicio DESC LIMIT 1),
    1
  )::smallint;
$$;

-- ── 2. Turmas do diário ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.relatorio_turmas_diarias (
  escola_id     uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  turma_codigo  text NOT NULL,
  rotulo        text NOT NULL,
  scope_keys    text[] NOT NULL,
  PRIMARY KEY (escola_id, turma_codigo)
);

INSERT INTO public.relatorio_turmas_diarias (escola_id, turma_codigo, rotulo, scope_keys)
SELECT e.id, v.turma_codigo, v.rotulo, v.scope_keys
FROM (VALUES
  ('padre-carlos-casavequia',     't1',  '1ª Série',     ARRAY['casavequia:panel:pc_alunos_1serie_2026_v1']),
  ('padre-carlos-casavequia',     't2',  '2ª Série',     ARRAY['casavequia:panel:pc_alunos_2serie_2026_v1']),
  ('padre-carlos-casavequia',     't3',  '3ª Série',     ARRAY['casavequia:panel:pc_alunos_3serie_2026_v1']),
  ('padre-carlos-casavequia',     't6',  '6º Ano',       ARRAY['casavequia:panel:pc_alunos_6ano_2026_v1']),
  ('raimundo-herminio-de-melo-2', 't1',  '1ª Série',     ARRAY['herminio:panel:rh_alunos_1serie_2026_v1']),
  ('raimundo-herminio-de-melo-2', 't23', '2ª/3ª Série',  ARRAY['herminio:panel:rh_alunos_2serie_2026_v1', 'herminio:panel:rh_alunos_3serie_2026_v1']),
  ('raimundo-herminio-de-melo-2', 't89', '8º/9º Ano',    ARRAY['herminio:panel:rh_alunos_8e9ano_2026_v1'])
) AS v(escola_slug, turma_codigo, rotulo, scope_keys)
JOIN public.escolas e ON e.slug = v.escola_slug
ON CONFLICT (escola_id, turma_codigo) DO UPDATE
  SET rotulo = EXCLUDED.rotulo, scope_keys = EXCLUDED.scope_keys;

-- Aluno da Biblioteca a partir do nome escrito no diário, sem sair da turma:
-- primeiro pelos vínculos da Etapa 1; se não houver, pelo cadastro da mesma
-- escola/grupo/série. Nome ambíguo ou desconhecido → NULL.
CREATE OR REPLACE FUNCTION public.relatorio_resolver_aluno(p_escola_id uuid, p_turma_codigo text, p_nome text)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH alvo AS (SELECT relatorio_normalizar_nome(p_nome) AS nome),
  td AS (
    SELECT scope_keys FROM relatorio_turmas_diarias
    WHERE escola_id = p_escola_id AND turma_codigo = p_turma_codigo
  ),
  por_vinculo AS (
    SELECT DISTINCT v.aluno_id
    FROM relatorio_aluno_vinculo v, td, alvo
    WHERE v.scope_key = ANY (td.scope_keys)
      AND v.aluno_id IS NOT NULL
      AND relatorio_normalizar_nome(v.nome_relatorio) = alvo.nome
  ),
  por_cadastro AS (
    SELECT DISTINCT al.id AS aluno_id
    FROM td
    JOIN relatorio_turmas t ON t.scope_key = ANY (td.scope_keys) AND t.grupo_turma_id IS NOT NULL
    JOIN alunos al ON al.escola_id = t.escola_id AND al.grupo_turma_id = t.grupo_turma_id AND al.serie = ANY (t.series)
    CROSS JOIN alvo
    WHERE relatorio_normalizar_nome(al.nome_completo) = alvo.nome
  )
  SELECT CASE
    WHEN (SELECT count(*) FROM por_vinculo) = 1 THEN (SELECT aluno_id FROM por_vinculo)
    WHEN (SELECT count(*) FROM por_vinculo) = 0 AND (SELECT count(*) FROM por_cadastro) = 1 THEN (SELECT aluno_id FROM por_cadastro)
  END;
$$;

-- ── 3. Aulas ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.relatorio_aulas (
  id                    text PRIMARY KEY,               -- '<escola_slug>:<codigo>'
  escola_id             uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  turma_codigo          text NOT NULL,
  codigo                text NOT NULL,                  -- ex.: 't1-0629lp'
  disciplina            text NOT NULL DEFAULT '',
  data                  date NOT NULL,
  bimestre              smallint NOT NULL,
  horario               text,
  tema                  text,
  carga                 numeric(4,1) NOT NULL DEFAULT 1,
  tem_presenca          boolean NOT NULL DEFAULT false,
  tem_atividade         boolean NOT NULL DEFAULT false,
  atividade_vale_ponto  boolean NOT NULL DEFAULT true,  -- decisão do professor
  removida              boolean NOT NULL DEFAULT false,
  publicada_em          timestamptz NOT NULL DEFAULT now(),
  atualizada_em         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (escola_id, codigo)
);

CREATE INDEX IF NOT EXISTS relatorio_aulas_turma_idx
  ON public.relatorio_aulas (escola_id, turma_codigo, disciplina, bimestre) WHERE NOT removida;

-- ── 4. Lançamentos por aluno ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.relatorio_lancamentos (
  aula_id         text NOT NULL REFERENCES public.relatorio_aulas(id) ON DELETE CASCADE,
  numero_chamada  integer NOT NULL,
  nome_relatorio  text NOT NULL,
  transferido     boolean NOT NULL DEFAULT false,
  aluno_id        uuid NULL REFERENCES public.alunos(id) ON DELETE SET NULL,
  presenca        text CHECK (presenca IN ('presente', 'falta', 'falta_justificada')),
  atividade       text CHECK (atividade IN ('fez', 'nao_fez', 'aguardando', 'pendente')),
  PRIMARY KEY (aula_id, numero_chamada)
);

CREATE INDEX IF NOT EXISTS relatorio_lancamentos_aluno_idx
  ON public.relatorio_lancamentos (aluno_id);

-- ── 5. Ocorrências ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.relatorio_ocorrencias (
  id                    text PRIMARY KEY,               -- md5 estável do conteúdo
  escola_id             uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  turma_codigo          text NOT NULL,
  relato_codigo         text,
  data                  date NOT NULL,
  bimestre              smallint NOT NULL,
  horario               text,
  disciplina            text,
  numero_chamada        integer,
  nome_relatorio        text NOT NULL,
  aluno_id              uuid NULL REFERENCES public.alunos(id) ON DELETE SET NULL,
  icone                 text,
  positiva              boolean NOT NULL DEFAULT false,
  texto                 text NOT NULL,
  gravidade             text CHECK (gravidade IN ('leve', 'medio', 'grave', 'muito_grave')),
  gravidade_origem      text CHECK (gravidade_origem IN ('ia', 'professor')),
  gravidade_confirmada  boolean NOT NULL DEFAULT false,
  removida              boolean NOT NULL DEFAULT false,
  publicada_em          timestamptz NOT NULL DEFAULT now(),
  atualizada_em         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS relatorio_ocorrencias_aluno_idx
  ON public.relatorio_ocorrencias (aluno_id, data DESC) WHERE NOT removida;

-- ── 6. Publicação ───────────────────────────────────────────────────────────
-- Recebe o retrato completo de uma escola, montado pela página:
-- {
--   "turmas": [{"codigo":"t1","alunos":[[1,"Nome",false], ...]}],
--   "aulas":  [{"c":"t1-0629lp","t":"t1","d":"2026-06-29","disc":"Língua Portuguesa",
--               "h":"07:00–11:15","tema":"...","carga":2,
--               "p":{"1":"p","2":"f","3":"j"} | null,        -- presença
--               "a":{"1":"fz","2":"nf","3":"ag","4":"pd"} | null }],  -- atividade
--   "ocorrencias": [{"t":"t1","r":"t1-0410","d":"2026-04-10","h":"...","disc":"...",
--                    "nome":"...","n":2,"ic":"😶","pos":false,"txt":"..."}]
-- }
-- Proteção: se o retrato vier muito menor que o que já existe (página ainda
-- carregando), nada é marcado como removido.
CREATE OR REPLACE FUNCTION public.relatorio_publicar_lancamentos(p_escola_slug text, p_snapshot jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  CREATE TEMP TABLE IF NOT EXISTS _rel_alunos (turma text, n integer, nome text, tr boolean, aluno_id uuid) ON COMMIT DROP;
  CREATE TEMP TABLE IF NOT EXISTS _rel_aulas (
    id text, codigo text, turma text, data date, disciplina text, horario text, tema text,
    carga numeric, p jsonb, a jsonb
  ) ON COMMIT DROP;
  TRUNCATE _rel_alunos, _rel_aulas;

  -- Lista de alunos de cada turma, já com o aluno da Biblioteca resolvido.
  INSERT INTO _rel_alunos (turma, n, nome, tr, aluno_id)
  SELECT t ->> 'codigo', (al ->> 0)::int, al ->> 1, COALESCE((al ->> 2)::boolean, false),
         relatorio_resolver_aluno(v_escola_id, t ->> 'codigo', al ->> 1)
  FROM jsonb_array_elements(COALESCE(p_snapshot -> 'turmas', '[]'::jsonb)) AS t
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t -> 'alunos', '[]'::jsonb)) AS al
  WHERE (al ->> 0) ~ '^\d+$';

  INSERT INTO _rel_aulas
  SELECT p_escola_slug || ':' || (x ->> 'c'), x ->> 'c', x ->> 't', (x ->> 'd')::date,
         COALESCE(x ->> 'disc', ''), NULLIF(x ->> 'h', ''), NULLIF(x ->> 'tema', ''),
         COALESCE(NULLIF(x ->> 'carga', '')::numeric, 1),
         NULLIF(x -> 'p', 'null'::jsonb), NULLIF(x -> 'a', 'null'::jsonb)
  FROM jsonb_array_elements(COALESCE(p_snapshot -> 'aulas', '[]'::jsonb)) AS x
  WHERE COALESCE(x ->> 'c', '') <> '' AND (x ->> 'd') ~ '^\d{4}-\d{2}-\d{2}$';

  SELECT count(*) INTO v_aulas_retrato FROM _rel_aulas;
  SELECT count(*) INTO v_aulas_existentes FROM relatorio_aulas WHERE escola_id = v_escola_id AND NOT removida;
  v_pode_remover := v_aulas_existentes < 20 OR v_aulas_retrato >= v_aulas_existentes * 0.8;

  -- Aulas (atividade_vale_ponto fica intocado).
  INSERT INTO relatorio_aulas AS ra
    (id, escola_id, turma_codigo, codigo, disciplina, data, bimestre, horario, tema, carga,
     tem_presenca, tem_atividade, removida, publicada_em, atualizada_em)
  SELECT id, v_escola_id, turma, codigo, disciplina, data, relatorio_bimestre_da_data(v_escola_id, data),
         horario, tema, carga, p IS NOT NULL, a IS NOT NULL, false, now(), now()
  FROM _rel_aulas
  ON CONFLICT (id) DO UPDATE
    SET turma_codigo  = EXCLUDED.turma_codigo,
        disciplina    = EXCLUDED.disciplina,
        data          = EXCLUDED.data,
        bimestre      = EXCLUDED.bimestre,
        horario       = EXCLUDED.horario,
        tema          = EXCLUDED.tema,
        carga         = EXCLUDED.carga,
        tem_presenca  = EXCLUDED.tem_presenca,
        tem_atividade = EXCLUDED.tem_atividade,
        removida      = false,
        atualizada_em = now()
    WHERE (ra.turma_codigo, ra.disciplina, ra.data, ra.bimestre, ra.horario, ra.tema, ra.carga, ra.tem_presenca, ra.tem_atividade, ra.removida)
      IS DISTINCT FROM
          (EXCLUDED.turma_codigo, EXCLUDED.disciplina, EXCLUDED.data, EXCLUDED.bimestre, EXCLUDED.horario, EXCLUDED.tema, EXCLUDED.carga, EXCLUDED.tem_presenca, EXCLUDED.tem_atividade, false);

  IF v_pode_remover THEN
    UPDATE relatorio_aulas ra SET removida = true, atualizada_em = now()
    WHERE ra.escola_id = v_escola_id AND NOT ra.removida
      AND NOT EXISTS (SELECT 1 FROM _rel_aulas x WHERE x.id = ra.id);
  END IF;

  -- Lançamentos: um por aluno da turma em cada aula do retrato.
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

  -- Ocorrências (gravidade fica intocada).
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
  SELECT count(*) INTO v_ocorr_existentes FROM relatorio_ocorrencias WHERE escola_id = v_escola_id AND NOT removida;
  v_pode_remover_oc := v_pode_remover AND (v_ocorr_existentes < 10 OR v_ocorr_retrato >= v_ocorr_existentes * 0.8);

  INSERT INTO relatorio_ocorrencias AS ro
    (id, escola_id, turma_codigo, relato_codigo, data, bimestre, horario, disciplina, numero_chamada,
     nome_relatorio, aluno_id, icone, positiva, texto, removida, publicada_em, atualizada_em)
  SELECT o.id, v_escola_id, o.turma, o.relato, o.data, relatorio_bimestre_da_data(v_escola_id, o.data),
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
    WHERE ro.escola_id = v_escola_id AND NOT ro.removida
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
$$;

-- ── 7. Segurança ────────────────────────────────────────────────────────────
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['relatorio_bimestres', 'relatorio_turmas_diarias', 'relatorio_aulas', 'relatorio_lancamentos', 'relatorio_ocorrencias']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ((SELECT private.is_relatorio_admin())) WITH CHECK ((SELECT private.is_relatorio_admin()))', t || '_admin', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.relatorio_publicar_lancamentos(text, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_publicar_lancamentos(text, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.relatorio_resolver_aluno(uuid, text, text) FROM public, anon;
