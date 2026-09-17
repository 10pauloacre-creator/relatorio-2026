-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPA 4B — Observações nos relatos e classificação de conduta pela IA
-- ───────────────────────────────────────────────────────────────────────────
-- 1. OBSERVAÇÕES: em cada relato o professor escreve uma observação livre com
--    o horário do fato. A IA identifica os alunos citados, cria uma tag por
--    envolvido (autor, vítima, testemunha, envolvido, destaque) e classifica
--    a conduta de quem praticou o ato. Cada envolvido vira uma linha em
--    relatorio_ocorrencias (origem = 'observacao'), ligada ao aluno da
--    Biblioteca: é daí que sai o relatório individual.
--
-- 2. GRAVIDADE SEM CONFIRMAÇÃO (decisão do professor, 17/09/2026): a IA
--    interpreta, liga ao aluno e ESTABELECE a gravidade. O professor ainda
--    pode trocar; a troca dele nunca é sobrescrita.
--
-- 3. REGRAS DE CONDUTA (tabela e regras operacionais do professor):
--    - a IA classifica o ATO (nivel_base), sem olhar o histórico do aluno;
--    - o BANCO aplica a reincidência depois: 2 ou mais registros da MESMA
--      categoria nos 60 dias anteriores sobem no máximo UM nível;
--    - conversa, celular, atividade, material e desatenção não passam de
--      médio só por repetição (grave só com outro ato: insulto, cola...);
--    - cola/fraude acadêmica é grave de saída e não sobe por histórico;
--    - acidente não é infração (sem_infracao);
--    - interferência na aula: nenhuma, baixa, moderada ou alta.
--
-- 4. SEGUNDO PLANO: pg_cron chama a Edge Function classificar-ocorrencias a
--    cada minuto, só quando há trabalho. A chamada leva um token gerado aqui
--    dentro (private.relatorio_ia_config), que nunca sai do banco.
--
-- Comportamento NÃO desconta nota. Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── 1. Colunas novas nas ocorrências ────────────────────────────────────────
ALTER TABLE public.relatorio_ocorrencias
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'relato',
  ADD COLUMN IF NOT EXISTS observacao_id uuid,
  ADD COLUMN IF NOT EXISTS papel text NOT NULL DEFAULT 'autor',
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS nivel_base text,
  ADD COLUMN IF NOT EXISTS interferencia text,
  ADD COLUMN IF NOT EXISTS sem_infracao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fraude_academica boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reincidencia_anteriores integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reincidencia_aplicada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contexto jsonb,
  ADD COLUMN IF NOT EXISTS ia_tentativas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ia_ultima_tentativa timestamptz;

CREATE OR REPLACE FUNCTION public.relatorio_categorias_conduta()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY[
    'conversa', 'celular_eletronico', 'atividade', 'material', 'desatencao',
    'saida_sem_autorizacao', 'interrupcao_barulho', 'desobediencia', 'desrespeito',
    'palavrao', 'ofensa', 'bullying_discriminacao', 'conteudo_sexual', 'exposicao_imagem',
    'brincadeira_fisica', 'agressao', 'ameaca', 'arma', 'dano_material', 'furto',
    'fraude_academica', 'seguranca', 'acidente', 'positivo', 'outro'
  ]::text[];
$$;

DO $$
BEGIN
  ALTER TABLE public.relatorio_ocorrencias DROP CONSTRAINT IF EXISTS relatorio_ocorrencias_origem_check;
  ALTER TABLE public.relatorio_ocorrencias ADD CONSTRAINT relatorio_ocorrencias_origem_check
    CHECK (origem IN ('relato', 'observacao'));
  ALTER TABLE public.relatorio_ocorrencias DROP CONSTRAINT IF EXISTS relatorio_ocorrencias_papel_check;
  ALTER TABLE public.relatorio_ocorrencias ADD CONSTRAINT relatorio_ocorrencias_papel_check
    CHECK (papel IN ('autor', 'vitima', 'testemunha', 'envolvido', 'destaque'));
  ALTER TABLE public.relatorio_ocorrencias DROP CONSTRAINT IF EXISTS relatorio_ocorrencias_nivel_base_check;
  ALTER TABLE public.relatorio_ocorrencias ADD CONSTRAINT relatorio_ocorrencias_nivel_base_check
    CHECK (nivel_base IN ('leve', 'medio', 'grave', 'muito_grave'));
  ALTER TABLE public.relatorio_ocorrencias DROP CONSTRAINT IF EXISTS relatorio_ocorrencias_interferencia_check;
  ALTER TABLE public.relatorio_ocorrencias ADD CONSTRAINT relatorio_ocorrencias_interferencia_check
    CHECK (interferencia IN ('nenhuma', 'baixa', 'moderada', 'alta'));
  ALTER TABLE public.relatorio_ocorrencias DROP CONSTRAINT IF EXISTS relatorio_ocorrencias_categoria_check;
  ALTER TABLE public.relatorio_ocorrencias ADD CONSTRAINT relatorio_ocorrencias_categoria_check
    CHECK (categoria IS NULL OR categoria = ANY (public.relatorio_categorias_conduta()));
END;
$$;

CREATE INDEX IF NOT EXISTS relatorio_ocorrencias_observacao_idx
  ON public.relatorio_ocorrencias (observacao_id) WHERE observacao_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS relatorio_ocorrencias_reincidencia_idx
  ON public.relatorio_ocorrencias (escola_id, categoria, data) WHERE NOT removida AND papel = 'autor';

-- ── 2. Observações ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.relatorio_observacoes (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id            uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  turma_codigo         text NOT NULL,
  relato_codigo        text,
  data                 date NOT NULL,
  bimestre             smallint NOT NULL DEFAULT 1,
  horario              text CHECK (horario IS NULL OR horario ~ '^\d{2}:\d{2}$'),
  disciplina           text,
  texto                text NOT NULL CHECK (length(btrim(texto)) BETWEEN 3 AND 4000),
  status               text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'concluida', 'erro')),
  resumo               text,
  aviso                text,
  erro                 text,
  modelo               text,
  ia_tentativas        integer NOT NULL DEFAULT 0,
  ia_ultima_tentativa  timestamptz,
  removida             boolean NOT NULL DEFAULT false,
  criada_em            timestamptz NOT NULL DEFAULT now(),
  atualizada_em        timestamptz NOT NULL DEFAULT now(),
  processada_em        timestamptz
);

CREATE INDEX IF NOT EXISTS relatorio_observacoes_relato_idx
  ON public.relatorio_observacoes (escola_id, relato_codigo) WHERE NOT removida;

ALTER TABLE public.relatorio_observacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS relatorio_observacoes_admin ON public.relatorio_observacoes;
CREATE POLICY relatorio_observacoes_admin ON public.relatorio_observacoes FOR ALL TO authenticated
  USING ((SELECT private.is_relatorio_admin())) WITH CHECK ((SELECT private.is_relatorio_admin()));
REVOKE ALL ON public.relatorio_observacoes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relatorio_observacoes TO authenticated;

-- ── 3. Utilitários ──────────────────────────────────────────────────────────
-- Espera crescente entre tentativas da IA (2, 4, 8, 16 min; desiste na 5ª).
CREATE OR REPLACE FUNCTION public.relatorio_ia_pode_tentar(p_tentativas integer, p_ultima timestamptz)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT p_tentativas < 5
     AND (p_ultima IS NULL OR p_ultima < now() - make_interval(mins => power(2, p_tentativas)::int));
$$;

CREATE OR REPLACE FUNCTION public.relatorio_nivel_acima(p_nivel text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_nivel WHEN 'leve' THEN 'medio' WHEN 'medio' THEN 'grave' WHEN 'grave' THEN 'muito_grave' ELSE p_nivel END;
$$;

-- Alunos ativos de uma turma do diário, como aparecem nos lançamentos.
CREATE OR REPLACE FUNCTION public.relatorio_alunos_da_turma(p_escola_id uuid, p_turma text)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('n', s.numero_chamada, 'nome', s.nome_relatorio) ORDER BY s.numero_chamada), '[]'::jsonb)
  FROM (
    SELECT DISTINCT ON (l.numero_chamada) l.numero_chamada, l.nome_relatorio, l.transferido
    FROM relatorio_lancamentos l
    JOIN relatorio_aulas a ON a.id = l.aula_id
    WHERE a.escola_id = p_escola_id AND a.turma_codigo = p_turma AND NOT a.removida
    ORDER BY l.numero_chamada, a.data DESC
  ) s
  WHERE NOT s.transferido;
$$;

-- ── 4. Núcleo: aplica a classificação da IA numa ocorrência ─────────────────
-- p_c: {categoria, nivel_base (leve|medio|grave|muito_grave|sem_infracao),
--       interferencia, fraude_academica, justificativa, contexto{...}}
-- Nunca mexe no que o professor definiu.
CREATE OR REPLACE FUNCTION public.relatorio_aplicar_classificacao(p_id text, p_c jsonb, p_modelo text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  REINCIDENCIA_MINIMA constant integer := 2;
  JANELA_DIAS constant integer := 60;
  o          relatorio_ocorrencias%ROWTYPE;
  v_nivel    text := p_c ->> 'nivel_base';
  v_cat      text := COALESCE(NULLIF(p_c ->> 'categoria', ''), 'outro');
  v_interf   text := p_c ->> 'interferencia';
  v_fraude   boolean;
  v_just     text := left(regexp_replace(COALESCE(p_c ->> 'justificativa', ''), '\s+', ' ', 'g'), 240);
  v_ant      integer := 0;
  v_sobe     boolean := false;
BEGIN
  SELECT * INTO o FROM relatorio_ocorrencias WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR o.gravidade_origem = 'professor' OR o.gravidade_confirmada THEN
    RETURN false;
  END IF;
  IF v_nivel IS NULL OR v_nivel NOT IN ('leve', 'medio', 'grave', 'muito_grave', 'sem_infracao') THEN
    RETURN false;
  END IF;
  IF NOT (v_cat = ANY (relatorio_categorias_conduta())) THEN v_cat := 'outro'; END IF;
  IF v_interf IS NULL OR v_interf NOT IN ('nenhuma', 'baixa', 'moderada', 'alta') THEN v_interf := NULL; END IF;
  v_fraude := COALESCE((p_c ->> 'fraude_academica')::boolean, false) OR v_cat = 'fraude_academica';

  IF v_nivel = 'sem_infracao' THEN
    UPDATE relatorio_ocorrencias
       SET gravidade = NULL, gravidade_origem = 'ia', nivel_base = NULL, sem_infracao = true,
           categoria = v_cat, interferencia = v_interf, fraude_academica = false,
           reincidencia_anteriores = 0, reincidencia_aplicada = false,
           contexto = p_c -> 'contexto', gravidade_justificativa = NULLIF(v_just, ''),
           gravidade_modelo = p_modelo, classificada_em = now(), atualizada_em = now()
     WHERE id = p_id;
    RETURN true;
  END IF;

  -- Cola/fraude compromete a avaliação: grave de saída.
  IF v_fraude AND v_nivel IN ('leve', 'medio') THEN v_nivel := 'grave'; END IF;

  -- Reincidência: mesma categoria, mesmo aluno, janela limitada, só antes deste fato.
  IF v_nivel <> 'muito_grave' AND v_cat NOT IN ('outro', 'fraude_academica', 'acidente', 'positivo') THEN
    SELECT count(*) INTO v_ant
    FROM relatorio_ocorrencias h
    WHERE h.escola_id = o.escola_id AND h.id <> o.id
      AND NOT h.removida AND NOT h.positiva AND NOT h.sem_infracao AND h.papel = 'autor'
      AND h.categoria = v_cat
      AND (CASE WHEN o.aluno_id IS NOT NULL THEN h.aluno_id = o.aluno_id
                ELSE h.turma_codigo = o.turma_codigo
                 AND relatorio_normalizar_nome(h.nome_relatorio) = relatorio_normalizar_nome(o.nome_relatorio) END)
      AND h.data >= o.data - JANELA_DIAS
      AND (h.data < o.data
           OR (h.data = o.data AND COALESCE(h.observacao_id::text, h.relato_codigo, '') <> COALESCE(o.observacao_id::text, o.relato_codigo, '')
               AND COALESCE(h.horario, '') < COALESCE(o.horario, '')));
    -- Teto: pelas distinções do professor, conversa, celular, atividade,
    -- material e desatenção só chegam a grave com outro ato (insulto, cola,
    -- filmagem...). Repetição sozinha leva no máximo a médio.
    v_sobe := v_ant >= REINCIDENCIA_MINIMA
      AND NOT (v_cat IN ('conversa', 'celular_eletronico', 'atividade', 'material', 'desatencao') AND v_nivel <> 'leve');
  END IF;

  UPDATE relatorio_ocorrencias
     SET gravidade = CASE WHEN v_sobe THEN relatorio_nivel_acima(v_nivel) ELSE v_nivel END,
         gravidade_origem = 'ia',
         gravidade_confirmada = false,
         nivel_base = v_nivel,
         sem_infracao = false,
         categoria = v_cat,
         interferencia = v_interf,
         fraude_academica = v_fraude,
         reincidencia_anteriores = v_ant,
         reincidencia_aplicada = v_sobe,
         contexto = p_c -> 'contexto',
         gravidade_justificativa = NULLIF(v_just
           || CASE WHEN v_sobe THEN ' Reincidência: ' || v_ant || ' registro(s) semelhante(s) em ' || JANELA_DIAS || ' dias (+1 nível).' ELSE '' END, ''),
         gravidade_modelo = p_modelo,
         classificada_em = now(),
         atualizada_em = now()
   WHERE id = p_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.relatorio_aplicar_classificacao(text, jsonb, text) FROM public, anon, authenticated;

-- ── 5. Professor troca a gravidade (ou marca "sem infração") ────────────────
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
  IF p_gravidade IS NOT NULL AND p_gravidade NOT IN ('leve', 'medio', 'grave', 'muito_grave', 'sem_infracao') THEN
    RAISE EXCEPTION 'Gravidade inválida: %', p_gravidade USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_atual FROM relatorio_ocorrencias WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ocorrência não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF p_gravidade IS NULL THEN
    -- Volta para a classificação da IA (reclassifica na próxima rodada).
    UPDATE relatorio_ocorrencias
       SET gravidade = NULL, gravidade_origem = NULL, gravidade_confirmada = false, confirmada_em = NULL,
           sem_infracao = false, classificada_em = NULL, ia_tentativas = 0, ia_ultima_tentativa = NULL,
           atualizada_em = now()
     WHERE id = p_id
    RETURNING * INTO v_atual;
  ELSE
    UPDATE relatorio_ocorrencias
       SET gravidade = NULLIF(p_gravidade, 'sem_infracao'),
           sem_infracao = (p_gravidade = 'sem_infracao'),
           gravidade_origem = 'professor',
           gravidade_confirmada = true,
           confirmada_em = now(),
           atualizada_em = now()
     WHERE id = p_id
    RETURNING * INTO v_atual;
  END IF;

  RETURN to_jsonb(v_atual) - 'texto';
END;
$$;

REVOKE ALL ON FUNCTION public.relatorio_definir_gravidade(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_definir_gravidade(text, text) TO authenticated;

-- ── 6. Observações: registrar e remover ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.relatorio_registrar_observacao(
  p_escola_slug text, p_turma text, p_relato text, p_data date, p_horario text, p_disciplina text, p_texto text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escola_id uuid;
  v_bimestre  smallint;
  v_obs       relatorio_observacoes%ROWTYPE;
BEGIN
  IF COALESCE(auth.role(), 'service_role') <> 'service_role' AND NOT COALESCE((SELECT private.is_relatorio_admin()), false) THEN
    RAISE EXCEPTION 'Apenas o administrador pode registrar observações.' USING ERRCODE = '42501';
  END IF;
  SELECT id INTO v_escola_id FROM escolas WHERE slug = p_escola_slug;
  IF v_escola_id IS NULL THEN
    RAISE EXCEPTION 'Escola % não encontrada.', p_escola_slug USING ERRCODE = 'P0002';
  END IF;
  IF p_data IS NULL THEN
    RAISE EXCEPTION 'Data da observação ausente.' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(
    (SELECT a.bimestre FROM relatorio_aulas a WHERE a.escola_id = v_escola_id AND a.codigo = p_relato AND NOT a.removida),
    (SELECT a.bimestre FROM relatorio_aulas a
      WHERE a.escola_id = v_escola_id AND a.turma_codigo = p_turma AND a.data <= p_data AND NOT a.removida
      ORDER BY (a.disciplina = COALESCE(p_disciplina, '')) DESC, a.data DESC LIMIT 1),
    1) INTO v_bimestre;

  INSERT INTO relatorio_observacoes (escola_id, turma_codigo, relato_codigo, data, bimestre, horario, disciplina, texto)
  VALUES (v_escola_id, p_turma, NULLIF(p_relato, ''), p_data, v_bimestre,
          CASE WHEN p_horario ~ '^\d{2}:\d{2}$' THEN p_horario END, NULLIF(p_disciplina, ''), btrim(p_texto))
  RETURNING * INTO v_obs;

  RETURN to_jsonb(v_obs);
END;
$$;

REVOKE ALL ON FUNCTION public.relatorio_registrar_observacao(text, text, text, date, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_registrar_observacao(text, text, text, date, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.relatorio_remover_observacao(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.role(), 'service_role') <> 'service_role' AND NOT COALESCE((SELECT private.is_relatorio_admin()), false) THEN
    RAISE EXCEPTION 'Apenas o administrador pode remover observações.' USING ERRCODE = '42501';
  END IF;
  UPDATE relatorio_observacoes SET removida = true, atualizada_em = now() WHERE id = p_id;
  UPDATE relatorio_ocorrencias SET removida = true, atualizada_em = now() WHERE observacao_id = p_id;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.relatorio_remover_observacao(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_remover_observacao(uuid) TO authenticated;

-- ── 7. Fila da IA (usada pela Edge Function) ────────────────────────────────
DROP FUNCTION IF EXISTS public.relatorio_ocorrencias_pendentes(integer);
DROP FUNCTION IF EXISTS public.relatorio_registrar_sugestao_gravidade(jsonb, text);

-- Reserva observações para análise (marca a tentativa antes de chamar a IA).
CREATE OR REPLACE FUNCTION public.relatorio_ia_reservar_observacoes(p_limite integer DEFAULT 2)
RETURNS TABLE (id uuid, escola text, turma text, data date, horario text, disciplina text, texto text, alunos jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF COALESCE(auth.role(), 'service_role') <> 'service_role' AND NOT COALESCE((SELECT private.is_relatorio_admin()), false) THEN
    RAISE EXCEPTION 'Apenas o administrador pode acionar a IA.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH alvo AS (
    SELECT o.id FROM relatorio_observacoes o
    WHERE NOT o.removida AND o.status <> 'concluida'
      AND relatorio_ia_pode_tentar(o.ia_tentativas, o.ia_ultima_tentativa)
    ORDER BY o.criada_em
    LIMIT LEAST(GREATEST(COALESCE(p_limite, 2), 1), 5)
    FOR UPDATE SKIP LOCKED
  ),
  marcadas AS (
    UPDATE relatorio_observacoes o
       SET status = 'processando', ia_tentativas = o.ia_tentativas + 1, ia_ultima_tentativa = now(), atualizada_em = now()
      FROM alvo WHERE o.id = alvo.id
    RETURNING o.*
  )
  SELECT m.id, e.nome_curto, m.turma_codigo, m.data, m.horario, m.disciplina, m.texto,
         relatorio_alunos_da_turma(m.escola_id, m.turma_codigo)
  FROM marcadas m JOIN escolas e ON e.id = m.escola_id;
END;
$$;

-- Reserva ocorrências dos relatos (.oi) ainda sem classificação.
CREATE OR REPLACE FUNCTION public.relatorio_ia_reservar_ocorrencias(p_limite integer DEFAULT 15)
RETURNS TABLE (id text, turma text, data date, horario text, disciplina text, texto text, alunos jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF COALESCE(auth.role(), 'service_role') <> 'service_role' AND NOT COALESCE((SELECT private.is_relatorio_admin()), false) THEN
    RAISE EXCEPTION 'Apenas o administrador pode acionar a IA.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH alvo AS (
    SELECT o.id FROM relatorio_ocorrencias o
    WHERE o.origem = 'relato' AND o.papel = 'autor' AND NOT o.removida AND NOT o.positiva
      AND o.gravidade IS NULL AND NOT o.sem_infracao AND o.classificada_em IS NULL
      AND o.gravidade_origem IS DISTINCT FROM 'professor'
      AND relatorio_ia_pode_tentar(o.ia_tentativas, o.ia_ultima_tentativa)
    ORDER BY o.data, o.horario, o.id
    LIMIT LEAST(GREATEST(COALESCE(p_limite, 15), 1), 30)
    FOR UPDATE SKIP LOCKED
  ),
  marcadas AS (
    UPDATE relatorio_ocorrencias o
       SET ia_tentativas = o.ia_tentativas + 1, ia_ultima_tentativa = now()
      FROM alvo WHERE o.id = alvo.id
    RETURNING o.*
  ),
  turmas AS (
    SELECT DISTINCT m.escola_id, m.turma_codigo FROM marcadas m
  ),
  rosters AS (
    SELECT t.escola_id, t.turma_codigo, relatorio_alunos_da_turma(t.escola_id, t.turma_codigo) AS alunos FROM turmas t
  )
  SELECT m.id, m.turma_codigo, m.data, m.horario, m.disciplina, m.texto, r.alunos
  FROM marcadas m
  JOIN rosters r ON r.escola_id = m.escola_id AND r.turma_codigo = m.turma_codigo
  ORDER BY m.data, m.horario, m.id;
END;
$$;

-- Grava a classificação das ocorrências dos relatos, em ordem cronológica
-- (a reincidência de cada uma enxerga as anteriores já classificadas).
CREATE OR REPLACE FUNCTION public.relatorio_ia_salvar_ocorrencias(p_itens jsonb, p_modelo text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item  record;
  v_total integer := 0;
BEGIN
  IF COALESCE(auth.role(), 'service_role') <> 'service_role' AND NOT COALESCE((SELECT private.is_relatorio_admin()), false) THEN
    RAISE EXCEPTION 'Apenas o administrador pode classificar ocorrências.' USING ERRCODE = '42501';
  END IF;

  FOR v_item IN
    SELECT i.value AS c, o.id
    FROM jsonb_array_elements(COALESCE(p_itens, '[]'::jsonb)) AS i
    JOIN relatorio_ocorrencias o ON o.id = i.value ->> 'id'
    WHERE NOT o.positiva AND o.origem = 'relato'
    ORDER BY o.data, o.horario, o.id
  LOOP
    IF relatorio_aplicar_classificacao(v_item.id, v_item.c, p_modelo) THEN
      v_total := v_total + 1;
    END IF;
  END LOOP;
  RETURN v_total;
END;
$$;

-- Grava a análise de uma observação: uma ocorrência (tag) por envolvido.
-- p_analise: {resumo, aviso, envolvidos:[{n, nome, papel, descricao, categoria,
--             nivel_base, interferencia, fraude_academica, justificativa, contexto}]}
CREATE OR REPLACE FUNCTION public.relatorio_ia_salvar_observacao(p_id uuid, p_analise jsonb, p_modelo text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_obs     relatorio_observacoes%ROWTYPE;
  v_alunos  jsonb;
  v_env     jsonb;
  v_n       integer;
  v_nome    text;
  v_papel   text;
  v_pos     boolean;
  v_oid     text;
  v_total   integer := 0;
  v_vistos  text[] := ARRAY[]::text[];
BEGIN
  IF COALESCE(auth.role(), 'service_role') <> 'service_role' AND NOT COALESCE((SELECT private.is_relatorio_admin()), false) THEN
    RAISE EXCEPTION 'Apenas o administrador pode gravar análises.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_obs FROM relatorio_observacoes WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR v_obs.removida THEN
    RETURN 0;
  END IF;
  v_alunos := relatorio_alunos_da_turma(v_obs.escola_id, v_obs.turma_codigo);

  -- Reanálise: some o que a IA tinha criado; o que o professor ajustou fica.
  DELETE FROM relatorio_ocorrencias
   WHERE observacao_id = p_id AND gravidade_origem IS DISTINCT FROM 'professor';

  FOR v_env IN SELECT value FROM jsonb_array_elements(COALESCE(p_analise -> 'envolvidos', '[]'::jsonb))
  LOOP
    v_n := CASE WHEN (v_env ->> 'n') ~ '^\d+$' THEN (v_env ->> 'n')::int END;
    v_nome := NULL;
    IF v_n IS NOT NULL THEN
      SELECT a ->> 'nome' INTO v_nome FROM jsonb_array_elements(v_alunos) a WHERE (a ->> 'n')::int = v_n;
      IF v_nome IS NULL THEN v_n := NULL; END IF;
    END IF;
    v_nome := COALESCE(v_nome, NULLIF(btrim(v_env ->> 'nome'), ''));
    CONTINUE WHEN v_nome IS NULL;

    v_oid := 'obs:' || p_id || ':' || COALESCE(v_n::text, relatorio_normalizar_nome(v_nome));
    CONTINUE WHEN v_oid = ANY (v_vistos);
    v_vistos := v_vistos || v_oid;

    v_papel := COALESCE(v_env ->> 'papel', 'envolvido');
    IF v_papel NOT IN ('autor', 'vitima', 'testemunha', 'envolvido', 'destaque') THEN v_papel := 'envolvido'; END IF;
    v_pos := v_papel = 'destaque';

    INSERT INTO relatorio_ocorrencias
      (id, escola_id, turma_codigo, relato_codigo, data, bimestre, horario, disciplina, numero_chamada,
       nome_relatorio, aluno_id, icone, positiva, texto, origem, observacao_id, papel, contexto,
       removida, publicada_em, atualizada_em)
    VALUES
      (v_oid, v_obs.escola_id, v_obs.turma_codigo, v_obs.relato_codigo, v_obs.data, v_obs.bimestre, v_obs.horario,
       v_obs.disciplina, v_n, v_nome,
       CASE WHEN v_n IS NOT NULL THEN relatorio_resolver_aluno(v_obs.escola_id, v_obs.turma_codigo, v_nome) END,
       CASE WHEN v_pos THEN '⭐' ELSE '📝' END, v_pos, v_obs.texto, 'observacao', p_id, v_papel,
       -- Contexto pedagógico só para quem praticou o ato; os demais guardam o que fizeram/sofreram.
       jsonb_strip_nulls(CASE WHEN v_papel = 'autor' THEN COALESCE(v_env -> 'contexto', '{}'::jsonb) ELSE '{}'::jsonb END
                         || jsonb_build_object('descricao', NULLIF(v_env ->> 'descricao', ''))),
       false, now(), now())
    ON CONFLICT (id) DO UPDATE SET removida = false, atualizada_em = now();

    IF v_papel = 'autor' THEN
      PERFORM relatorio_aplicar_classificacao(v_oid, v_env, p_modelo);
    ELSE
      UPDATE relatorio_ocorrencias
         SET categoria = CASE WHEN v_pos THEN 'positivo' ELSE NULL END,
             gravidade_justificativa = NULLIF(left(COALESCE(v_env ->> 'justificativa', ''), 240), ''),
             gravidade_modelo = p_modelo, classificada_em = now()
       WHERE id = v_oid AND gravidade_origem IS DISTINCT FROM 'professor';
    END IF;
    v_total := v_total + 1;
  END LOOP;

  UPDATE relatorio_observacoes
     SET status = 'concluida',
         resumo = NULLIF(left(COALESCE(p_analise ->> 'resumo', ''), 400), ''),
         aviso = COALESCE(NULLIF(left(COALESCE(p_analise ->> 'aviso', ''), 300), ''),
                          CASE WHEN v_total = 0 THEN 'Nenhum aluno da turma foi identificado. Escreva o nome como está na chamada e envie de novo.' END),
         erro = NULL, modelo = p_modelo, processada_em = now(), atualizada_em = now()
   WHERE id = p_id;
  RETURN v_total;
END;
$$;

CREATE OR REPLACE FUNCTION public.relatorio_ia_falha_observacao(p_id uuid, p_erro text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.role(), 'service_role') <> 'service_role' AND NOT COALESCE((SELECT private.is_relatorio_admin()), false) THEN
    RAISE EXCEPTION 'Apenas o administrador pode acionar a IA.' USING ERRCODE = '42501';
  END IF;
  UPDATE relatorio_observacoes
     SET status = CASE WHEN ia_tentativas >= 5 THEN 'erro' ELSE 'pendente' END,
         erro = left(p_erro, 300), atualizada_em = now()
   WHERE id = p_id AND status <> 'concluida';
END;
$$;

DO $$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.relatorio_ia_reservar_observacoes(integer)',
    'public.relatorio_ia_reservar_ocorrencias(integer)',
    'public.relatorio_ia_salvar_ocorrencias(jsonb, text)',
    'public.relatorio_ia_salvar_observacao(uuid, jsonb, text)',
    'public.relatorio_ia_falha_observacao(uuid, text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM public, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
END;
$$;

-- ── 8. Segundo plano: pg_cron → Edge Function ───────────────────────────────
CREATE TABLE IF NOT EXISTS private.relatorio_ia_config (
  id     integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  url    text NOT NULL,
  token  text NOT NULL
);
INSERT INTO private.relatorio_ia_config (id, url, token)
VALUES (1, 'https://vgceathgwvtmjxbdpecr.supabase.co/functions/v1/classificar-ocorrencias',
        encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (id) DO NOTHING;
REVOKE ALL ON private.relatorio_ia_config FROM public, anon, authenticated;

-- A Edge Function confere o token do cron (só com a chave de serviço).
CREATE OR REPLACE FUNCTION public.relatorio_ia_token_confere(p_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(length(p_token) = 64 AND p_token = (SELECT token FROM private.relatorio_ia_config WHERE id = 1), false);
$$;
REVOKE ALL ON FUNCTION public.relatorio_ia_token_confere(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.relatorio_ia_token_confere(text) TO service_role;

CREATE OR REPLACE FUNCTION private.relatorio_disparar_ia()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg private.relatorio_ia_config%ROWTYPE;
BEGIN
  IF NOT EXISTS (
       SELECT 1 FROM relatorio_observacoes o
        WHERE NOT o.removida AND o.status <> 'concluida'
          AND relatorio_ia_pode_tentar(o.ia_tentativas, o.ia_ultima_tentativa))
     AND NOT EXISTS (
       SELECT 1 FROM relatorio_ocorrencias o
        WHERE o.origem = 'relato' AND o.papel = 'autor' AND NOT o.removida AND NOT o.positiva
          AND o.gravidade IS NULL AND NOT o.sem_infracao AND o.classificada_em IS NULL
          AND o.gravidade_origem IS DISTINCT FROM 'professor'
          AND relatorio_ia_pode_tentar(o.ia_tentativas, o.ia_ultima_tentativa)) THEN
    RETURN;
  END IF;

  SELECT * INTO v_cfg FROM private.relatorio_ia_config WHERE id = 1;
  PERFORM net.http_post(
    url := v_cfg.url,
    body := '{"origem":"cron"}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-relatorio-cron', v_cfg.token),
    timeout_milliseconds := 150000
  );
END;
$$;
REVOKE ALL ON FUNCTION private.relatorio_disparar_ia() FROM public, anon, authenticated;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'relatorio-ia-conduta';
SELECT cron.schedule('relatorio-ia-conduta', '* * * * *', 'SELECT private.relatorio_disparar_ia();');

-- ── 9. Publicação dos relatos não apaga observações ────────────────────────
-- Mesma função em produção, com duas mudanças: a regra dos 80% e a marcação
-- de removidas só olham ocorrências de origem 'relato'.
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

  CREATE TEMP TABLE IF NOT EXISTS _rel_alunos (turma text, n integer, nome text, tr boolean, aluno_id uuid) ON COMMIT DROP;
  CREATE TEMP TABLE IF NOT EXISTS _rel_aulas (
    id text, codigo text, turma text, data date, bimestre smallint, disciplina text, horario text, tema text,
    carga numeric, horas_disciplina numeric, p jsonb, a jsonb
  ) ON COMMIT DROP;
  TRUNCATE _rel_alunos, _rel_aulas;

  INSERT INTO _rel_alunos (turma, n, nome, tr, aluno_id)
  SELECT t ->> 'codigo', (al ->> 0)::int, al ->> 1, COALESCE((al ->> 2)::boolean, false),
         relatorio_resolver_aluno(v_escola_id, t ->> 'codigo', al ->> 1)
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

REVOKE ALL ON FUNCTION public.relatorio_publicar_lancamentos(text, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_publicar_lancamentos(text, jsonb) TO authenticated;

-- ── 10. Reclassificação com as novas regras ────────────────────────────────
-- Nenhuma gravidade foi confirmada pelo professor até aqui; as sugestões da
-- Etapa 4 voltam para a fila e são refeitas em ordem cronológica.
UPDATE public.relatorio_ocorrencias
   SET gravidade = NULL, gravidade_origem = NULL, gravidade_justificativa = NULL, gravidade_modelo = NULL,
       classificada_em = NULL, ia_tentativas = 0, ia_ultima_tentativa = NULL
 WHERE origem = 'relato' AND gravidade_origem = 'ia' AND NOT gravidade_confirmada AND categoria IS NULL;

-- Aplica o teto às classificações feitas antes dele.
UPDATE public.relatorio_ocorrencias
   SET gravidade = nivel_base, reincidencia_aplicada = false,
       gravidade_justificativa = regexp_replace(gravidade_justificativa, ' Reincidência: .*$', ''), atualizada_em = now()
 WHERE reincidencia_aplicada AND gravidade_origem = 'ia' AND nivel_base <> 'leve'
   AND categoria IN ('conversa', 'celular_eletronico', 'atividade', 'material', 'desatencao');
