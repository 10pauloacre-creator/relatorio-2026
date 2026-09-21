-- Etapa 16 (21/09/2026): "Excluir a escola" também na Casavequia e na Hermínio.
--
-- Decisão do professor: apagar do banco TODOS os registros da escola, com
-- cópia. Cada linha apagada vai antes para relatorio_lixeira (gatilhos da
-- Etapa 10; as tabelas sem gatilho são copiadas aqui). O histórico diário do
-- estado das páginas (relatorio_estado_historico) e o da chamada continuam
-- guardados. Os relatos escritos no HTML ficam no código até serem removidos
-- num commit.
--
-- Trava: a escola entra em relatorio_escolas_excluidas. Enquanto estiver lá,
-- nada da página volta ao banco (publicação, estados e demais tabelas são
-- ignorados), senão a página republicaria os relatos do HTML na próxima vez
-- que fosse aberta.
--
-- Para desfazer: delete from relatorio_escolas_excluidas where slug = '...';
-- e restaurar as linhas de relatorio_lixeira (removido_em da exclusão).

create table if not exists public.relatorio_escolas_excluidas (
  escola_id    uuid primary key,
  slug         text not null,
  prefixo      text not null,          -- prefixo dos escopos: casavequia / herminio
  excluida_em  timestamptz not null default now(),
  excluida_por text,
  contagem     jsonb
);
alter table public.relatorio_escolas_excluidas enable row level security;
drop policy if exists relatorio_escolas_excluidas_admin on public.relatorio_escolas_excluidas;
create policy relatorio_escolas_excluidas_admin on public.relatorio_escolas_excluidas
  for select to authenticated using ((select private.is_relatorio_admin()));
revoke all on public.relatorio_escolas_excluidas from anon;
grant select on public.relatorio_escolas_excluidas to authenticated;

-- ── Trava contra a volta dos registros ─────────────────────────────────
create or replace function private.relatorio_escola_excluida(p_escola uuid)
returns boolean language sql stable security definer set search_path to ''
as $$ select exists (select 1 from public.relatorio_escolas_excluidas where escola_id = p_escola); $$;

create or replace function private.relatorio_bloquear_escola_excluida()
returns trigger language plpgsql security definer set search_path to ''
as $$
begin
  if private.relatorio_escola_excluida(new.escola_id) then return null; end if;
  return new;
end;
$$;

create or replace function private.relatorio_bloquear_escopo_excluido()
returns trigger language plpgsql security definer set search_path to ''
as $$
begin
  if exists (select 1 from public.relatorio_escolas_excluidas e where split_part(new.scope_key, ':', 1) = e.prefixo) then
    return null;
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['relatorio_aulas','relatorio_ocorrencias','relatorio_observacoes','relatorio_chamada',
                           'relatorio_metas_bimestrais','relatorio_alunos_adicionados','relatorio_turmas','relatorio_turmas_diarias']
  loop
    execute format('drop trigger if exists trg_%1$s_escola_excluida on public.%1$I', t);
    execute format('create trigger trg_%1$s_escola_excluida before insert or update on public.%1$I for each row execute function private.relatorio_bloquear_escola_excluida()', t);
  end loop;
end $$;

drop trigger if exists trg_report_sync_state_escola_excluida on public.report_sync_state;
create trigger trg_report_sync_state_escola_excluida before insert or update on public.report_sync_state
  for each row execute function private.relatorio_bloquear_escopo_excluido();
drop trigger if exists trg_relatorio_aluno_vinculo_escola_excluida on public.relatorio_aluno_vinculo;
create trigger trg_relatorio_aluno_vinculo_escola_excluida before insert or update on public.relatorio_aluno_vinculo
  for each row execute function private.relatorio_bloquear_escopo_excluido();

-- ── Apagar (interno, sem conferência de conta) ─────────────────────────
create or replace function private.relatorio_apagar_escola(p_escola uuid, p_slug text, p_prefixo text, p_por text)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare
  c jsonb := '{}'::jsonb;
  n integer;
begin
  -- Tabelas sem gatilho de lixeira: cópia manual antes de apagar.
  insert into public.relatorio_lixeira (tabela, dados, removido_por)
    select 'relatorio_turmas', to_jsonb(t), (select auth.uid()) from public.relatorio_turmas t where t.escola_id = p_escola;
  insert into public.relatorio_lixeira (tabela, dados, removido_por)
    select 'relatorio_turmas_diarias', to_jsonb(t), (select auth.uid()) from public.relatorio_turmas_diarias t where t.escola_id = p_escola;
  insert into public.relatorio_lixeira (tabela, dados, removido_por)
    select 'relatorio_aluno_vinculo', to_jsonb(v), (select auth.uid()) from public.relatorio_aluno_vinculo v where split_part(v.scope_key, ':', 1) = p_prefixo;
  insert into public.relatorio_lixeira (tabela, dados, removido_por)
    select 'relatorio_regras_escola', to_jsonb(r), (select auth.uid()) from public.relatorio_regras_escola r where r.escola_id = p_escola;

  delete from public.relatorio_lancamentos l using public.relatorio_aulas a where l.aula_id = a.id and a.escola_id = p_escola;
  get diagnostics n = row_count; c := c || jsonb_build_object('lancamentos', n);
  delete from public.relatorio_ocorrencias where escola_id = p_escola;       get diagnostics n = row_count; c := c || jsonb_build_object('ocorrencias', n);
  delete from public.relatorio_observacoes where escola_id = p_escola;      get diagnostics n = row_count; c := c || jsonb_build_object('observacoes', n);
  delete from public.relatorio_aulas where escola_id = p_escola;            get diagnostics n = row_count; c := c || jsonb_build_object('aulas', n);
  delete from public.relatorio_chamada where escola_id = p_escola;          get diagnostics n = row_count; c := c || jsonb_build_object('chamada', n);
  delete from public.relatorio_alunos_adicionados where escola_id = p_escola; get diagnostics n = row_count; c := c || jsonb_build_object('alunos_adicionados', n);
  delete from public.relatorio_metas_bimestrais where escola_id = p_escola; get diagnostics n = row_count; c := c || jsonb_build_object('metas', n);
  delete from public.relatorio_aluno_vinculo where split_part(scope_key, ':', 1) = p_prefixo; get diagnostics n = row_count; c := c || jsonb_build_object('vinculos', n);
  delete from public.relatorio_turmas_diarias where escola_id = p_escola;   get diagnostics n = row_count; c := c || jsonb_build_object('turmas_diarias', n);
  delete from public.relatorio_turmas where escola_id = p_escola;           get diagnostics n = row_count; c := c || jsonb_build_object('turmas', n);
  delete from public.relatorio_regras_escola where escola_id = p_escola;    get diagnostics n = row_count; c := c || jsonb_build_object('regras', n);
  delete from public.report_sync_state where split_part(scope_key, ':', 1) = p_prefixo; get diagnostics n = row_count; c := c || jsonb_build_object('estados', n);

  insert into public.relatorio_escolas_excluidas (escola_id, slug, prefixo, excluida_por, contagem)
  values (p_escola, p_slug, p_prefixo, p_por, c)
  on conflict (escola_id) do update set excluida_em = now(), excluida_por = excluded.excluida_por, contagem = excluded.contagem;
  return c;
end;
$$;

-- ── RPC da página (só o administrador, com a senha) ────────────────────
create or replace function public.relatorio_excluir_escola_admin(p_escola text, p_senha text, p_confirmacao text)
returns jsonb
language plpgsql security definer set search_path to ''
as $$
declare
  v_slug text; v_prefixo text; v_id uuid; v_ok boolean;
begin
  if not coalesce((select private.is_relatorio_admin()), false) then
    raise exception 'Só o administrador exclui esta escola.' using errcode = '42501';
  end if;
  if p_escola = 'casavequia' then v_slug := 'padre-carlos-casavequia'; v_prefixo := 'casavequia';
  elsif p_escola = 'herminio' then v_slug := 'raimundo-herminio-de-melo-2'; v_prefixo := 'herminio';
  else raise exception 'Escola desconhecida: %', p_escola; end if;
  select id into v_id from public.escolas where slug = v_slug;
  if v_id is null then raise exception 'Escola % não encontrada.', v_slug; end if;
  v_ok := public.conta_verificar_senha(p_senha);
  if v_ok is null then v_ok := lower(trim(coalesce(p_confirmacao, ''))) = lower(coalesce((select auth.email()), '')); end if;
  if not v_ok then raise exception 'Senha incorreta.'; end if;
  return private.relatorio_apagar_escola(v_id, v_slug, v_prefixo, (select auth.email()));
end;
$$;
revoke all on function public.relatorio_excluir_escola_admin(text, text, text) from public, anon;
grant execute on function public.relatorio_excluir_escola_admin(text, text, text) to authenticated;
revoke all on function private.relatorio_apagar_escola(uuid, text, text, text) from public, anon, authenticated;

-- ── Publicação: não republica escola excluída (mesmo corpo de antes + a trava) ──
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

  -- Etapa 16: escola excluída pelo professor não volta ao banco.
  IF private.relatorio_escola_excluida(v_escola_id) THEN
    RETURN jsonb_build_object('ok', false, 'excluida', true);
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
