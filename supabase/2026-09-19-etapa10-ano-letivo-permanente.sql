BEGIN;

-- Etapa 10 (19/09/2026): ano letivo e dados permanentes.
--
-- Decisão do professor: todos os dados do diário ficam guardados para sempre
-- e podem ser recuperados e consultados a qualquer momento, por ano letivo.
--
--  1. Lixeira permanente: toda linha apagada das tabelas do diário vai antes
--     para relatorio_lixeira, que não aceita exclusão nem alteração. As funções
--     que já apagam (publicação, IA das observações) continuam iguais.
--  2. Histórico diário do estado das páginas (report_sync_state) e das contas
--     dos professores (professor_dados): a última versão de cada dia fica
--     guardada. O do professor segue a conta (sai junto se a conta for apagada,
--     como manda a LGPD); o do administrador é permanente.
--  3. Chamada por ano letivo (relatorio_chamada_historico).
--  4. Virada do ano sem perda: o id da aula passa a levar o ano a partir de
--     2027 (o código do relato só tem dia e mês), e a publicação compara e
--     remove apenas dentro dos anos do retrato.
--  5. Consultas do painel "📅 Ano letivo": anos com registros, exportação
--     completa de um ano, estado das páginas até uma data (arquivo do ano) e
--     restauração de uma versão.

-- ── Datas no fuso do Acre ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.relatorio_hoje()
RETURNS date LANGUAGE sql STABLE
AS $$ SELECT (now() AT TIME ZONE 'America/Rio_Branco')::date $$;

CREATE OR REPLACE FUNCTION public.relatorio_ano_atual()
RETURNS integer LANGUAGE sql STABLE
AS $$ SELECT extract(year FROM public.relatorio_hoje())::int $$;

-- 2026 mantém o id antigo (escola:código); os anos seguintes ganham o ano no
-- meio (escola:2027:código), para não colidir com o relato do mesmo dia/mês.
CREATE OR REPLACE FUNCTION public.relatorio_id_aula(p_escola_slug text, p_codigo text, p_data date)
RETURNS text LANGUAGE sql IMMUTABLE
AS $$
  SELECT p_escola_slug || ':'
      || CASE WHEN p_data IS NULL OR extract(year FROM p_data) = 2026 THEN ''
              ELSE extract(year FROM p_data)::int::text || ':' END
      || p_codigo
$$;

-- ── 1. Lixeira permanente ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.relatorio_lixeira (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tabela       text        NOT NULL,
  dados        jsonb       NOT NULL,
  removido_em  timestamptz NOT NULL DEFAULT now(),
  removido_por uuid
);
CREATE INDEX IF NOT EXISTS relatorio_lixeira_tabela_idx ON public.relatorio_lixeira (tabela, removido_em);
ALTER TABLE public.relatorio_lixeira ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.relatorio_lixeira FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.relatorio_guardar_na_lixeira()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO relatorio_lixeira (tabela, dados, removido_por)
  VALUES (TG_TABLE_NAME, to_jsonb(OLD), auth.uid());
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.relatorio_bloquear_exclusao()
RETURNS trigger LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'O arquivo do diário é permanente: % não aceita exclusão nem alteração.', TG_TABLE_NAME
    USING ERRCODE = '42501';
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['relatorio_aulas', 'relatorio_lancamentos', 'relatorio_ocorrencias', 'relatorio_observacoes',
                           'relatorio_chamada', 'relatorio_alunos_adicionados', 'relatorio_metas_bimestrais',
                           'report_sync_state']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_lixeira ON public.%1$I', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_lixeira BEFORE DELETE ON public.%1$I
                    FOR EACH ROW EXECUTE FUNCTION public.relatorio_guardar_na_lixeira()', t);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS trg_relatorio_lixeira_permanente ON public.relatorio_lixeira;
CREATE TRIGGER trg_relatorio_lixeira_permanente BEFORE UPDATE OR DELETE ON public.relatorio_lixeira
  FOR EACH ROW EXECUTE FUNCTION public.relatorio_bloquear_exclusao();

-- ── 2. Histórico diário do estado das páginas ──────────────────────────
CREATE TABLE IF NOT EXISTS public.relatorio_estado_historico (
  scope_key   text        NOT NULL,
  dia         date        NOT NULL,
  school_slug text,
  payload     jsonb       NOT NULL,
  gravado_em  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope_key, dia)
);
CREATE INDEX IF NOT EXISTS relatorio_estado_historico_escola_idx ON public.relatorio_estado_historico (school_slug, dia);
ALTER TABLE public.relatorio_estado_historico ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.relatorio_estado_historico FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.relatorio_guardar_estado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.payload IS NOT DISTINCT FROM OLD.payload THEN
    RETURN NEW;
  END IF;
  INSERT INTO relatorio_estado_historico AS h (scope_key, dia, school_slug, payload, gravado_em)
  VALUES (NEW.scope_key, relatorio_hoje(), NEW.school_slug, NEW.payload, now())
  ON CONFLICT (scope_key, dia) DO UPDATE
    SET payload = EXCLUDED.payload, school_slug = EXCLUDED.school_slug, gravado_em = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_report_sync_state_historico ON public.report_sync_state;
CREATE TRIGGER trg_report_sync_state_historico AFTER INSERT OR UPDATE ON public.report_sync_state
  FOR EACH ROW EXECUTE FUNCTION public.relatorio_guardar_estado();

-- Só a versão do dia é reescrita (pelo gatilho acima); versões de dias
-- anteriores nunca mudam, e nada é apagado.
CREATE OR REPLACE FUNCTION public.relatorio_estado_historico_protegido()
RETURNS trigger LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' OR OLD.dia <> relatorio_hoje() OR NEW.scope_key <> OLD.scope_key OR NEW.dia <> OLD.dia THEN
    RAISE EXCEPTION 'O histórico do diário é permanente: versões anteriores não podem ser alteradas nem apagadas.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_relatorio_estado_historico_protegido ON public.relatorio_estado_historico;
CREATE TRIGGER trg_relatorio_estado_historico_protegido BEFORE UPDATE OR DELETE ON public.relatorio_estado_historico
  FOR EACH ROW EXECUTE FUNCTION public.relatorio_estado_historico_protegido();

INSERT INTO public.relatorio_estado_historico (scope_key, dia, school_slug, payload)
SELECT scope_key, public.relatorio_hoje(), school_slug, payload FROM public.report_sync_state
ON CONFLICT (scope_key, dia) DO NOTHING;

-- Contas dos professores: histórico visível só para o dono; sai junto com a
-- conta (ON DELETE CASCADE), porque a exclusão da conta é um direito dele.
CREATE TABLE IF NOT EXISTS public.professor_dados_historico (
  user_id    uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  scope_key  text        NOT NULL,
  dia        date        NOT NULL,
  payload    jsonb       NOT NULL,
  gravado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, scope_key, dia)
);
ALTER TABLE public.professor_dados_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professor_dados_historico FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.professor_dados_historico FROM anon, authenticated, public;
GRANT SELECT ON public.professor_dados_historico TO authenticated;
DROP POLICY IF EXISTS professor_dados_historico_dono ON public.professor_dados_historico;
CREATE POLICY professor_dados_historico_dono ON public.professor_dados_historico
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.professor_guardar_estado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.payload IS NOT DISTINCT FROM OLD.payload THEN
    RETURN NEW;
  END IF;
  INSERT INTO professor_dados_historico AS h (user_id, scope_key, dia, payload, gravado_em)
  VALUES (NEW.user_id, NEW.scope_key, relatorio_hoje(), NEW.payload, now())
  ON CONFLICT (user_id, scope_key, dia) DO UPDATE SET payload = EXCLUDED.payload, gravado_em = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_professor_dados_historico ON public.professor_dados;
CREATE TRIGGER trg_professor_dados_historico AFTER INSERT OR UPDATE ON public.professor_dados
  FOR EACH ROW EXECUTE FUNCTION public.professor_guardar_estado();

INSERT INTO public.professor_dados_historico (user_id, scope_key, dia, payload)
SELECT user_id, scope_key, public.relatorio_hoje(), payload FROM public.professor_dados
ON CONFLICT DO NOTHING;

-- ── 3. Chamada de cada ano letivo ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.relatorio_chamada_historico (
  ano            integer     NOT NULL,
  escola_id      uuid        NOT NULL,
  turma_codigo   text        NOT NULL,
  numero_chamada integer     NOT NULL,
  nome           text,
  transferido    boolean     NOT NULL DEFAULT false,
  adicionado     boolean     NOT NULL DEFAULT false,
  na_lista       boolean     NOT NULL DEFAULT true,
  atualizada_em  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ano, escola_id, turma_codigo, numero_chamada)
);
ALTER TABLE public.relatorio_chamada_historico ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.relatorio_chamada_historico FROM anon, authenticated, public;
DROP TRIGGER IF EXISTS trg_relatorio_chamada_historico_permanente ON public.relatorio_chamada_historico;
CREATE TRIGGER trg_relatorio_chamada_historico_permanente BEFORE DELETE ON public.relatorio_chamada_historico
  FOR EACH ROW EXECUTE FUNCTION public.relatorio_bloquear_exclusao();

INSERT INTO public.relatorio_chamada_historico
  (ano, escola_id, turma_codigo, numero_chamada, nome, transferido, adicionado)
SELECT 2026, escola_id, turma_codigo, numero_chamada, nome, transferido, adicionado FROM public.relatorio_chamada
ON CONFLICT DO NOTHING;

-- ── 4. Publicação e vale-ponto sabendo o ano ────────────────────────────
CREATE OR REPLACE FUNCTION public.relatorio_aplicar_vale_ponto(p_escola_slug text, p_snapshot jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_alteradas integer;
BEGIN
  IF COALESCE(auth.role(), 'service_role') <> 'service_role' AND NOT COALESCE((SELECT private.is_relatorio_admin()), false) THEN
    RAISE EXCEPTION 'Apenas o administrador pode alterar atividades.' USING ERRCODE = '42501';
  END IF;

  UPDATE relatorio_aulas ra
     SET atividade_vale_ponto = (x ->> 'vp')::boolean,
         atualizada_em = now()
    FROM jsonb_array_elements(COALESCE(p_snapshot -> 'aulas', '[]'::jsonb)) AS x
   WHERE ra.id = relatorio_id_aula(p_escola_slug, x ->> 'c',
                   CASE WHEN (x ->> 'd') ~ '^\d{4}-\d{2}-\d{2}$' THEN (x ->> 'd')::date END)
     AND (x ->> 'vp') IN ('true', 'false')
     AND ra.atividade_vale_ponto IS DISTINCT FROM (x ->> 'vp')::boolean;
  GET DIAGNOSTICS v_alteradas = ROW_COUNT;
  RETURN v_alteradas;
END;
$function$;

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
  v_ano              integer;
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
  SELECT relatorio_id_aula(p_escola_slug, x ->> 'c', (x ->> 'd')::date), x ->> 'c', x ->> 't', (x ->> 'd')::date,
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

  -- Etapa 10: a chamada de cada ano letivo fica guardada para sempre. O ano
  -- vem da página (data-ano-letivo); sem ele, o das aulas do retrato.
  v_ano := COALESCE(NULLIF(p_snapshot ->> 'ano', '')::int,
                    (SELECT max(extract(year FROM x.data))::int FROM _rel_aulas x),
                    relatorio_ano_atual());
  INSERT INTO relatorio_chamada_historico AS h
    (ano, escola_id, turma_codigo, numero_chamada, nome, transferido, adicionado, na_lista, atualizada_em)
  SELECT DISTINCT ON (turma, n) v_ano, v_escola_id, turma, n, nome, tr, adicionado, true, now()
  FROM _rel_alunos ORDER BY turma, n
  ON CONFLICT (ano, escola_id, turma_codigo, numero_chamada) DO UPDATE
    SET nome = EXCLUDED.nome, transferido = EXCLUDED.transferido, adicionado = EXCLUDED.adicionado,
        na_lista = true, atualizada_em = now()
    WHERE (h.nome, h.transferido, h.adicionado, h.na_lista)
      IS DISTINCT FROM (EXCLUDED.nome, EXCLUDED.transferido, EXCLUDED.adicionado, true);
  UPDATE relatorio_chamada_historico h SET na_lista = false, atualizada_em = now()
   WHERE h.ano = v_ano AND h.escola_id = v_escola_id AND h.na_lista
     AND EXISTS (SELECT 1 FROM _rel_alunos x WHERE x.turma = h.turma_codigo)
     AND NOT EXISTS (SELECT 1 FROM _rel_alunos x WHERE x.turma = h.turma_codigo AND x.n = h.numero_chamada);

  SELECT count(*) INTO v_aulas_retrato FROM _rel_aulas;
  -- Só compara com as aulas dos mesmos anos do retrato: a página de um ano
  -- novo nunca marca como removidas as aulas dos anos anteriores.
  SELECT count(*) INTO v_aulas_existentes FROM relatorio_aulas
   WHERE escola_id = v_escola_id AND NOT removida AND extract(year FROM data) IN (SELECT DISTINCT extract(year FROM x.data) FROM _rel_aulas x);
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
      AND extract(year FROM ra.data) IN (SELECT DISTINCT extract(year FROM x.data) FROM _rel_aulas x)
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
  SELECT count(*) INTO v_ocorr_existentes FROM relatorio_ocorrencias
   WHERE escola_id = v_escola_id AND NOT removida AND origem = 'relato' AND extract(year FROM data) IN (SELECT DISTINCT extract(year FROM x.data) FROM _rel_aulas x);
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
      AND extract(year FROM ro.data) IN (SELECT DISTINCT extract(year FROM x.data) FROM _rel_aulas x)
      AND NOT EXISTS (SELECT 1 FROM _rel_ocorr o WHERE o.id = ro.id);
  END IF;

  SELECT COALESCE(jsonb_agg(DISTINCT al.turma || ' · ' || al.nome), '[]'::jsonb) INTO v_sem_vinculo
  FROM _rel_alunos al
  JOIN relatorio_turmas_diarias td ON td.escola_id = v_escola_id AND td.turma_codigo = al.turma
  JOIN relatorio_turmas t ON t.scope_key = ANY (td.scope_keys) AND t.grupo_turma_id IS NOT NULL
  WHERE al.aluno_id IS NULL AND NOT al.tr;

  RETURN jsonb_build_object(
    'escola', p_escola_slug,
    'ano', v_ano,
    'aulas', v_aulas_retrato,
    'lancamentos_alterados', v_lancamentos,
    'ocorrencias', v_ocorr_retrato,
    'remocao_aplicada', v_pode_remover,
    'alunos_sem_vinculo', v_sem_vinculo
  );
END;
$function$;

-- ── 5. Consultas do painel "📅 Ano letivo" (só o administrador) ─────────
-- O estado das páginas guarda school_slug sem o sufixo da escola
-- ("raimundo-herminio-de-melo" x "raimundo-herminio-de-melo-2").
CREATE OR REPLACE FUNCTION public.relatorio_escola_do_estado(p_escola_slug text, p_school_slug text)
RETURNS boolean LANGUAGE sql IMMUTABLE
AS $$ SELECT p_school_slug = p_escola_slug OR p_escola_slug LIKE p_school_slug || '-%' $$;

CREATE OR REPLACE FUNCTION public.relatorio_exigir_admin()
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.role(), 'service_role') <> 'service_role' AND NOT COALESCE((SELECT private.is_relatorio_admin()), false) THEN
    RAISE EXCEPTION 'Apenas o administrador pode consultar o arquivo do diário.' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- Anos com registros, do mais novo para o mais antigo.
CREATE OR REPLACE FUNCTION public.relatorio_anos_letivos(p_escola_slug text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_escola uuid;
  v_saida  jsonb;
BEGIN
  PERFORM relatorio_exigir_admin();
  SELECT id INTO v_escola FROM escolas WHERE slug = p_escola_slug;
  IF v_escola IS NULL THEN RAISE EXCEPTION 'Escola % não encontrada.', p_escola_slug; END IF;

  WITH a AS (
    SELECT extract(year FROM data)::int AS ano, count(*) AS aulas, count(DISTINCT data) AS dias,
           sum(COALESCE(horas_disciplina, carga, 1)) AS horas, count(DISTINCT turma_codigo) AS turmas,
           min(data) AS primeira, max(data) AS ultima
    FROM relatorio_aulas WHERE escola_id = v_escola AND NOT removida GROUP BY 1
  ), o AS (
    SELECT extract(year FROM data)::int AS ano, count(*) AS n
    FROM relatorio_ocorrencias WHERE escola_id = v_escola AND NOT removida GROUP BY 1
  ), ob AS (
    SELECT extract(year FROM data)::int AS ano, count(*) AS n
    FROM relatorio_observacoes WHERE escola_id = v_escola AND NOT removida GROUP BY 1
  ), c AS (
    SELECT ano, count(*) FILTER (WHERE na_lista AND NOT transferido) AS n
    FROM relatorio_chamada_historico WHERE escola_id = v_escola GROUP BY 1
  ), h AS (
    SELECT extract(year FROM dia)::int AS ano, count(DISTINCT dia) AS dias_salvos, max(gravado_em) AS ultima_gravacao
    FROM relatorio_estado_historico WHERE relatorio_escola_do_estado(p_escola_slug, school_slug) GROUP BY 1
  ), anos AS (
    SELECT ano FROM a UNION SELECT ano FROM o UNION SELECT ano FROM ob UNION SELECT ano FROM c UNION SELECT ano FROM h
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'ano', anos.ano,
           'aulas', COALESCE(a.aulas, 0), 'dias', COALESCE(a.dias, 0), 'horas', COALESCE(a.horas, 0),
           'turmas', COALESCE(a.turmas, 0), 'alunos', COALESCE(c.n, 0),
           'ocorrencias', COALESCE(o.n, 0), 'observacoes', COALESCE(ob.n, 0),
           'primeira', a.primeira, 'ultima', a.ultima,
           'dias_salvos', COALESCE(h.dias_salvos, 0), 'ultima_gravacao', h.ultima_gravacao
         ) ORDER BY anos.ano DESC), '[]'::jsonb)
    INTO v_saida
  FROM anos
  LEFT JOIN a USING (ano) LEFT JOIN o USING (ano) LEFT JOIN ob USING (ano)
  LEFT JOIN c USING (ano) LEFT JOIN h USING (ano);
  RETURN v_saida;
END;
$$;

-- Tudo o que existe de um ano letivo, num arquivo só (botão "Baixar dados").
CREATE OR REPLACE FUNCTION public.relatorio_exportar_ano(p_escola_slug text, p_ano integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_escola uuid;
BEGIN
  PERFORM relatorio_exigir_admin();
  SELECT id INTO v_escola FROM escolas WHERE slug = p_escola_slug;
  IF v_escola IS NULL THEN RAISE EXCEPTION 'Escola % não encontrada.', p_escola_slug; END IF;

  RETURN jsonb_build_object(
    'formato', 'relatorio-ano-letivo-v1',
    'escola', p_escola_slug,
    'ano', p_ano,
    'gerado_em', now(),
    'aulas', (SELECT COALESCE(jsonb_agg(to_jsonb(ra) ORDER BY ra.data, ra.codigo), '[]'::jsonb)
                FROM relatorio_aulas ra WHERE ra.escola_id = v_escola AND extract(year FROM ra.data) = p_ano),
    'lancamentos', (SELECT COALESCE(jsonb_agg(to_jsonb(rl) ORDER BY rl.aula_id, rl.numero_chamada), '[]'::jsonb)
                      FROM relatorio_lancamentos rl JOIN relatorio_aulas ra ON ra.id = rl.aula_id
                     WHERE ra.escola_id = v_escola AND extract(year FROM ra.data) = p_ano),
    'ocorrencias', (SELECT COALESCE(jsonb_agg(to_jsonb(ro) ORDER BY ro.data, ro.horario), '[]'::jsonb)
                      FROM relatorio_ocorrencias ro WHERE ro.escola_id = v_escola AND extract(year FROM ro.data) = p_ano),
    'observacoes', (SELECT COALESCE(jsonb_agg(to_jsonb(ob) ORDER BY ob.data, ob.horario), '[]'::jsonb)
                      FROM relatorio_observacoes ob WHERE ob.escola_id = v_escola AND extract(year FROM ob.data) = p_ano),
    'chamada', (SELECT COALESCE(jsonb_agg(to_jsonb(ch) ORDER BY ch.turma_codigo, ch.numero_chamada), '[]'::jsonb)
                  FROM relatorio_chamada_historico ch WHERE ch.escola_id = v_escola AND ch.ano = p_ano),
    'metas', (SELECT COALESCE(jsonb_agg(to_jsonb(mb)), '[]'::jsonb)
                FROM relatorio_metas_bimestrais mb WHERE mb.escola_id = v_escola),
    'estado_paginas', (SELECT COALESCE(jsonb_object_agg(u.scope_key, jsonb_build_object('dia', u.dia, 'payload', u.payload)), '{}'::jsonb)
                         FROM (SELECT DISTINCT ON (h.scope_key) h.scope_key, h.dia, h.payload
                                 FROM relatorio_estado_historico h
                                WHERE relatorio_escola_do_estado(p_escola_slug, h.school_slug)
                                  AND extract(year FROM h.dia) = p_ano
                                ORDER BY h.scope_key, h.dia DESC) u),
    'lixeira', (SELECT COALESCE(jsonb_agg(jsonb_build_object('tabela', lx.tabela, 'removido_em', lx.removido_em, 'dados', lx.dados)
                                          ORDER BY lx.id), '[]'::jsonb)
                  FROM relatorio_lixeira lx
                 WHERE extract(year FROM lx.removido_em AT TIME ZONE 'America/Rio_Branco') = p_ano
                   AND (lx.dados ->> 'escola_id' = v_escola::text
                        OR lx.dados ->> 'aula_id' LIKE p_escola_slug || ':%'
                        OR relatorio_escola_do_estado(p_escola_slug, lx.dados ->> 'school_slug')))
  );
END;
$$;

-- Estado de uma página como estava até uma data (páginas de arquivo do ano).
CREATE OR REPLACE FUNCTION public.relatorio_estado_ate(p_scope_key text, p_ate date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  PERFORM relatorio_exigir_admin();
  SELECT jsonb_build_object('payload', h.payload, 'dia', h.dia, 'updated_at', h.gravado_em) INTO v
    FROM relatorio_estado_historico h
   WHERE h.scope_key = p_scope_key AND h.dia <= p_ate
   ORDER BY h.dia DESC LIMIT 1;
  RETURN v;
END;
$$;

-- Versões guardadas de uma página (para escolher o que restaurar).
CREATE OR REPLACE FUNCTION public.relatorio_versoes_estado(p_scope_key text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM relatorio_exigir_admin();
  RETURN (SELECT COALESCE(jsonb_agg(jsonb_build_object('dia', h.dia, 'gravado_em', h.gravado_em,
                                                       'bytes', pg_column_size(h.payload)) ORDER BY h.dia DESC), '[]'::jsonb)
            FROM relatorio_estado_historico h WHERE h.scope_key = p_scope_key);
END;
$$;

-- Volta uma página para a versão de um dia. A versão atual vai antes para a
-- lixeira, então a restauração também pode ser desfeita.
CREATE OR REPLACE FUNCTION public.relatorio_restaurar_estado(p_scope_key text, p_dia date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_payload jsonb;
BEGIN
  PERFORM relatorio_exigir_admin();
  SELECT payload INTO v_payload FROM relatorio_estado_historico WHERE scope_key = p_scope_key AND dia = p_dia;
  IF v_payload IS NULL THEN RAISE EXCEPTION 'Não há versão de % em %.', p_scope_key, p_dia; END IF;

  INSERT INTO relatorio_lixeira (tabela, dados, removido_por)
  SELECT 'report_sync_state:antes-de-restaurar', to_jsonb(s), auth.uid()
    FROM report_sync_state s WHERE s.scope_key = p_scope_key;

  UPDATE report_sync_state SET payload = v_payload, updated_at = now(), source = 'restauracao:' || p_dia
   WHERE scope_key = p_scope_key;
  RETURN jsonb_build_object('scope_key', p_scope_key, 'restaurado_de', p_dia);
END;
$$;

REVOKE ALL ON FUNCTION public.relatorio_anos_letivos(text) FROM public, anon;
REVOKE ALL ON FUNCTION public.relatorio_exportar_ano(text, integer) FROM public, anon;
REVOKE ALL ON FUNCTION public.relatorio_estado_ate(text, date) FROM public, anon;
REVOKE ALL ON FUNCTION public.relatorio_versoes_estado(text) FROM public, anon;
REVOKE ALL ON FUNCTION public.relatorio_restaurar_estado(text, date) FROM public, anon;
REVOKE ALL ON FUNCTION public.relatorio_exigir_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_anos_letivos(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.relatorio_exportar_ano(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.relatorio_estado_ate(text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.relatorio_versoes_estado(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.relatorio_restaurar_estado(text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.relatorio_exigir_admin() TO authenticated;

COMMIT;
