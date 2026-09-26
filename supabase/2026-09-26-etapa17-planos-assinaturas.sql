-- ═══════════════════════════════════════════════════════════════════════
-- Etapa 17 (26/09/2026) — Planos, assinaturas, limites de uso, indicação,
-- consentimentos (LGPD) e funil de vendas do RELATORIO SKIN.
--
-- Planos (tabela public.planos, editável sem mexer no código):
--   gratis  R$ 0      · 1 diário por dia letivo · 30 pedidos à I.A./mês · 3 documentos/mês
--   pro     R$ 49,90  · 400 diários/mês · 500 pedidos à I.A./mês · 150 documentos/mês
--   plus    R$ 99,90  · sem limites + integração com a Biblioteca Digital
--                       (1º mês por R$ 1,00 no plano mensal, uma vez por conta)
--   anual   10% de desconto (R$ 538,92 e R$ 1.078,92).
--
-- Modo dos limites (public.planos_config.modo_limites):
--   "lancamento" (padrão até o gateway de pagamento entrar): o uso é contado e o
--                aviso de limite aparece, mas não bloqueia (a I.A. mantém o teto
--                diário antigo, private.ia_limite).
--   "ativo"      : ao passar do limite, a ação é bloqueada e o modal pede o upgrade.
--   Trocar: update public.planos_config set valor = '"ativo"' where chave = 'modo_limites';
--
-- Gateway (quando entrar): o webhook do pagamento chama
--   private.plano_ativar_pedido(pedido, gateway, id_no_gateway, valor_pago)
-- com a chave de serviço. Nada aqui recebe dado de cartão.
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Catálogo de planos ────────────────────────────────────────────────────
create table if not exists public.planos (
  id                 text primary key,
  nome               text not null,
  ordem              int  not null,
  preco_mensal       numeric(10,2) not null default 0,
  preco_anual        numeric(10,2) not null default 0,
  promo_primeiro_mes numeric(10,2),
  limites            jsonb not null default '{}'::jsonb,
  recursos           jsonb not null default '{}'::jsonb,
  ativo              boolean not null default true,
  atualizado_em      timestamptz not null default now()
);
alter table public.planos enable row level security;
drop policy if exists planos_leitura on public.planos;
create policy planos_leitura on public.planos for select using (true);
grant select on public.planos to anon, authenticated;

insert into public.planos (id, nome, ordem, preco_mensal, preco_anual, promo_primeiro_mes, limites, recursos) values
  ('gratis', 'Grátis', 0, 0, 0, null,
   '{"diario_dia":1,"diario_mes":null,"ia_mes":30,"documento_mes":3}',
   '{"biblioteca":false,"suporte":"comunidade"}'),
  ('pro', 'PRO', 1, 49.90, 538.92, null,
   '{"diario_dia":null,"diario_mes":400,"ia_mes":500,"documento_mes":150}',
   '{"biblioteca":false,"suporte":"email"}'),
  ('plus', 'Plus', 2, 99.90, 1078.92, 1.00,
   '{"diario_dia":null,"diario_mes":null,"ia_mes":null,"documento_mes":null}',
   '{"biblioteca":true,"suporte":"prioritario"}')
on conflict (id) do update set
  nome = excluded.nome, ordem = excluded.ordem, preco_mensal = excluded.preco_mensal,
  preco_anual = excluded.preco_anual, promo_primeiro_mes = excluded.promo_primeiro_mes,
  limites = excluded.limites, recursos = excluded.recursos, atualizado_em = now();

create table if not exists public.planos_config (
  chave         text primary key,
  valor         jsonb not null,
  atualizado_em timestamptz not null default now()
);
alter table public.planos_config enable row level security;
drop policy if exists planos_config_leitura on public.planos_config;
create policy planos_config_leitura on public.planos_config for select using (true);
grant select on public.planos_config to anon, authenticated;

insert into public.planos_config (chave, valor) values
  ('modo_limites', '"lancamento"'),
  ('desconto_anual', '0.10'),
  ('indicacao', '{"dias_indicador":30,"dias_indicado":7,"plano":"pro","max_por_ano":12,"janela_dias":30}'),
  ('gateway', 'null'),
  ('consentimento_versao', '"2026-09-26"')
on conflict (chave) do nothing;

-- ── Assinaturas (histórico; a vigente é a de maior plano ainda válida) ────
create table if not exists public.assinaturas (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  plano                text not null references public.planos(id),
  ciclo                text not null default 'mensal' check (ciclo in ('mensal','anual','cortesia')),
  status               text not null default 'ativa'
                         check (status in ('ativa','cortesia','teste','pendente','cancelada','expirada','inadimplente')),
  origem               text not null default 'pagamento',
  inicio               timestamptz not null default now(),
  fim                  timestamptz,
  valor                numeric(10,2),
  pedido_id            uuid,
  gateway              text,
  gateway_assinatura   text,
  gateway_cliente      text,
  renovacao_automatica boolean not null default true,
  cancelada_em         timestamptz,
  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now()
);
create index if not exists assinaturas_user_idx on public.assinaturas (user_id, status);
alter table public.assinaturas enable row level security;
drop policy if exists assinaturas_dono on public.assinaturas;
create policy assinaturas_dono on public.assinaturas for select using (user_id = (select auth.uid()));
grant select on public.assinaturas to authenticated;

-- Créditos (ex.: mês ganho por indicação de quem já paga): o gateway aplica
-- adiando a próxima cobrança. Para quem está no Grátis vira cortesia na hora.
create table if not exists public.plano_creditos (
  id        bigserial primary key,
  user_id   uuid not null references auth.users(id) on delete cascade,
  dias      int not null,
  plano     text not null default 'pro',
  origem    text not null,
  ref       text,
  status    text not null default 'pendente' check (status in ('pendente','aplicado','cancelado')),
  criado_em timestamptz not null default now(),
  aplicado_em timestamptz
);
alter table public.plano_creditos enable row level security;
drop policy if exists plano_creditos_dono on public.plano_creditos;
create policy plano_creditos_dono on public.plano_creditos for select using (user_id = (select auth.uid()));
grant select on public.plano_creditos to authenticated;

-- ── Pedidos (checkout; o gateway completa depois) ─────────────────────────
create table if not exists public.assinatura_pedidos (
  id               uuid primary key default gen_random_uuid(),
  codigo           text unique not null,
  user_id          uuid not null references auth.users(id) on delete cascade,
  plano            text not null references public.planos(id),
  ciclo            text not null check (ciclo in ('mensal','anual')),
  valor_primeira   numeric(10,2) not null,
  valor_recorrente numeric(10,2) not null,
  desconto         numeric(10,2) not null default 0,
  promocao         text,
  status           text not null default 'aguardando_gateway'
                     check (status in ('aguardando_gateway','aguardando_pagamento','pago','cancelado','expirado','falhou')),
  gateway          text,
  gateway_id       text,
  gateway_url      text,
  origem           text,
  dados            jsonb not null default '{}'::jsonb,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);
create index if not exists assinatura_pedidos_user_idx on public.assinatura_pedidos (user_id, criado_em desc);
alter table public.assinatura_pedidos enable row level security;
drop policy if exists assinatura_pedidos_dono on public.assinatura_pedidos;
create policy assinatura_pedidos_dono on public.assinatura_pedidos for select using (user_id = (select auth.uid()));
grant select on public.assinatura_pedidos to authenticated;

-- ── Uso por recurso (diario, ia, documento) ───────────────────────────────
create schema if not exists private;
create table if not exists private.plano_uso (
  id      bigserial primary key,
  user_id uuid not null,
  recurso text not null,
  dia     date not null,
  ref     text,
  qtd     int  not null default 1,
  em      timestamptz not null default now()
);
create index if not exists plano_uso_mes_idx on private.plano_uso (user_id, recurso, em);
create index if not exists plano_uso_dia_idx on private.plano_uso (user_id, recurso, dia);
create unique index if not exists plano_uso_ref_uidx on private.plano_uso (user_id, recurso, ref) where ref is not null;

-- ── Indicação ─────────────────────────────────────────────────────────────
create table if not exists public.indicacao_codigos (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  codigo    text unique not null,
  criado_em timestamptz not null default now()
);
alter table public.indicacao_codigos enable row level security;
drop policy if exists indicacao_codigos_dono on public.indicacao_codigos;
create policy indicacao_codigos_dono on public.indicacao_codigos for select using (user_id = (select auth.uid()));
grant select on public.indicacao_codigos to authenticated;

create table if not exists public.indicacoes (
  id            uuid primary key default gen_random_uuid(),
  indicador     uuid not null references auth.users(id) on delete cascade,
  indicado      uuid not null unique references auth.users(id) on delete cascade,
  codigo        text not null,
  status        text not null default 'pendente' check (status in ('pendente','confirmada','recusada')),
  recompensa    text,
  motivo        text,
  criado_em     timestamptz not null default now(),
  confirmada_em timestamptz
);
create index if not exists indicacoes_indicador_idx on public.indicacoes (indicador, status);
alter table public.indicacoes enable row level security;
drop policy if exists indicacoes_partes on public.indicacoes;
create policy indicacoes_partes on public.indicacoes for select
  using (indicador = (select auth.uid()) or indicado = (select auth.uid()));
grant select on public.indicacoes to authenticated;

-- ── Consentimentos (e-mail / WhatsApp), registro que só cresce ────────────
create table if not exists public.consentimentos (
  id        bigserial primary key,
  user_id   uuid not null references auth.users(id) on delete cascade,
  canal     text not null check (canal in ('email','whatsapp')),
  aceito    boolean not null,
  contato   text,
  versao    text not null,
  texto     text not null,
  origem    text,
  criado_em timestamptz not null default now()
);
create index if not exists consentimentos_user_idx on public.consentimentos (user_id, canal, criado_em desc);
alter table public.consentimentos enable row level security;
drop policy if exists consentimentos_dono on public.consentimentos;
create policy consentimentos_dono on public.consentimentos for select using (user_id = (select auth.uid()));
grant select on public.consentimentos to authenticated;

-- ── Funil (eventos) e leads de escolas/redes ──────────────────────────────
create table if not exists private.plano_eventos (
  id      bigserial primary key,
  user_id uuid,
  evento  text not null,
  dados   jsonb not null default '{}'::jsonb,
  em      timestamptz not null default now()
);
create index if not exists plano_eventos_idx on private.plano_eventos (evento, em);
create index if not exists plano_eventos_user_idx on private.plano_eventos (user_id, em);

create table if not exists private.leads_escolas (
  id            bigserial primary key,
  nome          text not null,
  email         text not null,
  telefone      text,
  escola        text,
  cargo         text,
  municipio     text,
  uf            text,
  professores   int,
  mensagem      text,
  aceita_contato boolean not null default false,
  origem        text,
  user_id       uuid,
  criado_em     timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════════
-- Funções internas
-- ═══════════════════════════════════════════════════════════════════════
create or replace function private.skin_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce((select auth.email()) = '10pauloacre@gmail.com', false) $$;

create or replace function private.plano_cfg(p_chave text)
returns jsonb language sql stable security definer set search_path = ''
as $$ select valor from public.planos_config where chave = p_chave $$;

create or replace function private.plano_rank(p_plano text)
returns int language sql immutable
as $$ select case p_plano when 'plus' then 2 when 'pro' then 1 else 0 end $$;

create or replace function private.hoje_acre()
returns date language sql stable
as $$ select (now() at time zone 'America/Rio_Branco')::date $$;

create or replace function private.mes_acre_inicio()
returns timestamptz language sql stable
as $$ select (date_trunc('month', now() at time zone 'America/Rio_Branco')) at time zone 'America/Rio_Branco' $$;

-- Assinatura vigente (a de maior plano ainda válida); sem nenhuma = Grátis.
create or replace function private.plano_efetivo(p_user uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select jsonb_build_object('plano', a.plano, 'status', a.status, 'origem', a.origem, 'ciclo', a.ciclo,
                               'inicio', a.inicio, 'fim', a.fim, 'id', a.id)
       from public.assinaturas a
      where a.user_id = p_user
        and a.status in ('ativa','cortesia','teste')
        and a.inicio <= now()
        and (a.fim is null or a.fim > now())
      order by private.plano_rank(a.plano) desc, a.fim desc nulls first
      limit 1),
    jsonb_build_object('plano', 'gratis', 'status', 'gratis', 'origem', null, 'ciclo', null, 'inicio', null, 'fim', null, 'id', null));
$$;

-- Concede dias de um plano (cortesia/teste), somando depois do que já existe.
create or replace function private.plano_conceder(p_user uuid, p_plano text, p_dias int, p_origem text, p_status text default 'cortesia')
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_base timestamptz;
  v_id   uuid;
begin
  select greatest(now(), coalesce(max(a.fim), now())) into v_base
    from public.assinaturas a
   where a.user_id = p_user and a.plano = p_plano and a.status in ('cortesia','teste') and a.fim > now();
  insert into public.assinaturas (user_id, plano, ciclo, status, origem, inicio, fim, valor, renovacao_automatica)
  values (p_user, p_plano, 'cortesia', p_status, p_origem, coalesce(v_base, now()), coalesce(v_base, now()) + make_interval(days => p_dias), 0, false)
  returning id into v_id;
  return v_id;
end;
$$;

-- Uso de um recurso no mês (e no dia, para o diário).
create or replace function private.plano_uso_resumo(p_user uuid, p_dia date default null)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'diario_mes',    coalesce(sum(u.qtd) filter (where u.recurso = 'diario' and u.em >= private.mes_acre_inicio()), 0),
    'diario_dia',    coalesce(sum(u.qtd) filter (where u.recurso = 'diario' and u.dia = coalesce(p_dia, private.hoje_acre())), 0),
    'ia_mes',        coalesce(sum(u.qtd) filter (where u.recurso = 'ia' and u.em >= private.mes_acre_inicio()), 0),
    'documento_mes', coalesce(sum(u.qtd) filter (where u.recurso = 'documento' and u.em >= private.mes_acre_inicio()), 0))
  from private.plano_uso u
  where u.user_id = p_user
    and (u.em >= private.mes_acre_inicio() or u.dia = coalesce(p_dia, private.hoje_acre()));
$$;

-- Consumo com conferência do limite do plano (base de todas as cotas).
create or replace function private.plano_consumir_de(p_user uuid, p_admin boolean, p_recurso text, p_ref text, p_dia date, p_qtd int)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_rec    text := lower(coalesce(nullif(btrim(p_recurso), ''), ''));
  v_dia    date := coalesce(p_dia, private.hoje_acre());
  v_qtd    int  := greatest(1, least(coalesce(p_qtd, 1), 50));
  v_modo   text := coalesce(private.plano_cfg('modo_limites') #>> '{}', 'lancamento');
  v_ef     jsonb;
  v_plano  text;
  v_lim    jsonb;
  v_lmes   int;
  v_ldia   int;
  v_umes   int;
  v_udia   int;
  v_excede boolean := false;
  v_motivo text;
begin
  if p_user is null then return jsonb_build_object('ok', false, 'motivo', 'sem-conta'); end if;
  if v_rec not in ('diario','ia','documento') then return jsonb_build_object('ok', false, 'motivo', 'recurso-invalido'); end if;
  if p_admin then return jsonb_build_object('ok', true, 'ilimitado', true, 'recurso', v_rec, 'plano', 'admin'); end if;

  perform pg_advisory_xact_lock(hashtext(p_user::text || ':' || v_rec));

  if p_ref is not null and exists (select 1 from private.plano_uso u where u.user_id = p_user and u.recurso = v_rec and u.ref = p_ref) then
    return jsonb_build_object('ok', true, 'repetido', true, 'recurso', v_rec);
  end if;

  v_ef := private.plano_efetivo(p_user);
  v_plano := v_ef ->> 'plano';
  select p.limites into v_lim from public.planos p where p.id = v_plano;
  v_lmes := nullif(v_lim ->> (v_rec || '_mes'), '')::int;
  v_ldia := case when v_rec = 'diario' then nullif(v_lim ->> 'diario_dia', '')::int end;

  select coalesce(sum(u.qtd), 0) into v_umes from private.plano_uso u
   where u.user_id = p_user and u.recurso = v_rec and u.em >= private.mes_acre_inicio();
  if v_ldia is not null then
    select coalesce(sum(u.qtd), 0) into v_udia from private.plano_uso u
     where u.user_id = p_user and u.recurso = v_rec and u.dia = v_dia;
  end if;

  if v_ldia is not null and coalesce(v_udia, 0) + v_qtd > v_ldia then v_excede := true; v_motivo := 'limite-dia';
  elsif v_lmes is not null and v_umes + v_qtd > v_lmes then v_excede := true; v_motivo := 'limite-mes';
  end if;

  if v_excede then
    insert into private.plano_eventos (user_id, evento, dados)
    values (p_user, 'limite_atingido', jsonb_build_object('recurso', v_rec, 'plano', v_plano, 'motivo', v_motivo, 'modo', v_modo));
    if v_modo = 'ativo' then
      return jsonb_build_object('ok', false, 'bloqueado', true, 'excedeu', true, 'motivo', v_motivo, 'recurso', v_rec,
        'plano', v_plano, 'modo', v_modo, 'usado_mes', v_umes, 'usado_dia', v_udia, 'limite_mes', v_lmes, 'limite_dia', v_ldia,
        'periodo', case when v_motivo = 'limite-dia' then 'dia' else 'mes' end);
    end if;
  end if;

  insert into private.plano_uso (user_id, recurso, dia, ref, qtd) values (p_user, v_rec, v_dia, p_ref, v_qtd)
  on conflict do nothing;

  return jsonb_build_object('ok', true, 'bloqueado', false, 'excedeu', v_excede, 'motivo', v_motivo, 'recurso', v_rec,
    'plano', v_plano, 'modo', v_modo, 'usado_mes', v_umes + v_qtd,
    'usado_dia', case when v_ldia is not null then coalesce(v_udia, 0) + v_qtd end,
    'limite_mes', v_lmes, 'limite_dia', v_ldia, 'ilimitado', v_lmes is null and v_ldia is null,
    'periodo', case when v_ldia is not null then 'dia' else 'mes' end);
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- API para as páginas
-- ═══════════════════════════════════════════════════════════════════════
create or replace function public.plano_consumir(p_recurso text, p_ref text default null, p_dia date default null, p_qtd int default 1)
returns jsonb language sql security definer set search_path = ''
as $$ select private.plano_consumir_de((select auth.uid()), private.skin_admin(), p_recurso, p_ref, p_dia, p_qtd) $$;

-- Tudo o que a página precisa: plano, limites, uso, indicação, consentimentos.
create or replace function public.plano_status(p_dia date default null)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_ef   jsonb;
  v_pl   public.planos%rowtype;
  v_cons jsonb;
  v_ind  jsonb;
  v_cod  text;
  v_promo boolean;
  v_criada timestamptz;
begin
  if v_uid is null then return jsonb_build_object('conta', false); end if;
  v_ef := private.plano_efetivo(v_uid);
  select * into v_pl from public.planos where id = v_ef ->> 'plano';
  select codigo into v_cod from public.indicacao_codigos where user_id = v_uid;
  select u.created_at into v_criada from auth.users u where u.id = v_uid;

  select jsonb_object_agg(c.canal, jsonb_build_object('aceito', c.aceito, 'contato', c.contato, 'em', c.criado_em)) into v_cons
    from (select distinct on (canal) canal, aceito, contato, criado_em
            from public.consentimentos where user_id = v_uid order by canal, criado_em desc, id desc) c;

  select jsonb_build_object(
    'codigo', v_cod,
    'pendentes',   count(*) filter (where i.status = 'pendente'),
    'confirmadas', count(*) filter (where i.status = 'confirmada'),
    'dias_ganhos', coalesce(sum(case when i.status = 'confirmada' and i.recompensa is not null then 30 else 0 end), 0),
    'fui_indicado', exists (select 1 from public.indicacoes x where x.indicado = v_uid))
    into v_ind
    from public.indicacoes i where i.indicador = v_uid;

  v_promo := not exists (select 1 from public.assinatura_pedidos p where p.user_id = v_uid and p.promocao = 'plus-1-real' and p.status = 'pago')
         and not exists (select 1 from public.assinaturas a where a.user_id = v_uid and a.plano = 'plus' and a.origem = 'pagamento');

  return jsonb_build_object(
    'conta', true,
    'admin', private.skin_admin(),
    'modo', coalesce(private.plano_cfg('modo_limites') #>> '{}', 'lancamento'),
    'plano', jsonb_build_object('id', v_pl.id, 'nome', v_pl.nome, 'limites', v_pl.limites, 'recursos', v_pl.recursos,
                                'preco_mensal', v_pl.preco_mensal, 'preco_anual', v_pl.preco_anual),
    'assinatura', v_ef,
    'uso', private.plano_uso_resumo(v_uid, p_dia),
    'renova_em', (date_trunc('month', now() at time zone 'America/Rio_Branco') + interval '1 month')::date,
    'indicacao', v_ind,
    'consentimentos', coalesce(v_cons, '{}'::jsonb),
    'promo_plus', v_promo,
    'conta_criada', v_criada,
    'creditos_pendentes', (select coalesce(sum(dias), 0) from public.plano_creditos c where c.user_id = v_uid and c.status = 'pendente'),
    'pedido_aberto', (select jsonb_build_object('id', p.id, 'codigo', p.codigo, 'plano', p.plano, 'ciclo', p.ciclo,
                              'valor_primeira', p.valor_primeira, 'status', p.status, 'criado_em', p.criado_em)
                        from public.assinatura_pedidos p
                       where p.user_id = v_uid and p.status in ('aguardando_gateway','aguardando_pagamento')
                       order by p.criado_em desc limit 1));
end;
$$;

-- Pedido de assinatura (checkout). Valores sempre calculados aqui.
create or replace function public.plano_criar_pedido(p_plano text, p_ciclo text, p_origem text default null, p_dados jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_pl    public.planos%rowtype;
  v_ciclo text := case when p_ciclo = 'anual' then 'anual' else 'mensal' end;
  v_prim  numeric(10,2);
  v_rec   numeric(10,2);
  v_desc  numeric(10,2) := 0;
  v_promo text;
  v_cod   text;
  v_ped   public.assinatura_pedidos%rowtype;
  v_ok_promo boolean;
begin
  if v_uid is null then raise exception 'Entre na sua conta para assinar.'; end if;
  select * into v_pl from public.planos where id = p_plano and ativo and id <> 'gratis';
  if v_pl.id is null then raise exception 'Plano inválido.'; end if;

  -- Um pedido aberto por vez: o anterior é substituído.
  update public.assinatura_pedidos set status = 'cancelado', atualizado_em = now()
   where user_id = v_uid and status in ('aguardando_gateway','aguardando_pagamento');

  if v_ciclo = 'anual' then
    v_rec := v_pl.preco_anual; v_prim := v_pl.preco_anual;
    v_desc := round(v_pl.preco_mensal * 12 - v_pl.preco_anual, 2);
  else
    v_rec := v_pl.preco_mensal; v_prim := v_pl.preco_mensal;
    v_ok_promo := v_pl.promo_primeiro_mes is not null
      and not exists (select 1 from public.assinatura_pedidos p where p.user_id = v_uid and p.promocao = 'plus-1-real' and p.status = 'pago')
      and not exists (select 1 from public.assinaturas a where a.user_id = v_uid and a.plano = v_pl.id and a.origem = 'pagamento');
    if v_ok_promo then
      v_prim := v_pl.promo_primeiro_mes; v_promo := 'plus-1-real';
      v_desc := round(v_pl.preco_mensal - v_pl.promo_primeiro_mes, 2);
    end if;
  end if;

  loop
    v_cod := 'SKN-' || to_char(now() at time zone 'America/Rio_Branco', 'YYMMDD') || '-'
          || upper(substr(translate(encode(extensions.gen_random_bytes(6), 'base64'), '+/=01OIl', 'ABCDEFGH'), 1, 5));
    exit when not exists (select 1 from public.assinatura_pedidos where codigo = v_cod);
  end loop;

  insert into public.assinatura_pedidos (codigo, user_id, plano, ciclo, valor_primeira, valor_recorrente, desconto, promocao, origem, dados,
                                         status)
  values (v_cod, v_uid, v_pl.id, v_ciclo, v_prim, v_rec, v_desc, v_promo, left(coalesce(p_origem, ''), 60),
          coalesce(p_dados, '{}'::jsonb) - 'cartao' - 'cpf',
          case when private.plano_cfg('gateway') is null or private.plano_cfg('gateway') = 'null'::jsonb
               then 'aguardando_gateway' else 'aguardando_pagamento' end)
  returning * into v_ped;

  insert into private.plano_eventos (user_id, evento, dados)
  values (v_uid, 'pedido_criado', jsonb_build_object('plano', v_pl.id, 'ciclo', v_ciclo, 'valor', v_prim, 'promo', v_promo, 'origem', p_origem));

  return jsonb_build_object('id', v_ped.id, 'codigo', v_ped.codigo, 'plano', v_ped.plano, 'nome', v_pl.nome, 'ciclo', v_ped.ciclo,
    'valor_primeira', v_ped.valor_primeira, 'valor_recorrente', v_ped.valor_recorrente, 'desconto', v_ped.desconto,
    'promocao', v_ped.promocao, 'status', v_ped.status, 'gateway', private.plano_cfg('gateway'));
end;
$$;

create or replace function public.plano_cancelar_pedido(p_id uuid)
returns boolean language sql security definer set search_path = ''
as $$
  with x as (
    update public.assinatura_pedidos set status = 'cancelado', atualizado_em = now()
     where id = p_id and user_id = (select auth.uid()) and status in ('aguardando_gateway','aguardando_pagamento')
    returning 1)
  select exists (select 1 from x);
$$;

-- Webhook do gateway (chave de serviço): pedido pago → assinatura ativa.
create or replace function private.plano_ativar_pedido(p_pedido uuid, p_gateway text, p_gateway_id text, p_valor numeric default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_ped public.assinatura_pedidos%rowtype;
  v_id  uuid;
begin
  select * into v_ped from public.assinatura_pedidos where id = p_pedido for update;
  if v_ped.id is null then raise exception 'Pedido não encontrado.'; end if;
  if v_ped.status = 'pago' then
    select id into v_id from public.assinaturas where pedido_id = v_ped.id limit 1;
    return v_id;
  end if;
  update public.assinatura_pedidos set status = 'pago', gateway = p_gateway, gateway_id = p_gateway_id, atualizado_em = now()
   where id = v_ped.id;
  -- Troca de plano: a assinatura paga anterior encerra.
  update public.assinaturas set status = 'cancelada', cancelada_em = now(), fim = now(), atualizado_em = now()
   where user_id = v_ped.user_id and origem = 'pagamento' and status = 'ativa';
  insert into public.assinaturas (user_id, plano, ciclo, status, origem, inicio, fim, valor, pedido_id, gateway, gateway_assinatura)
  values (v_ped.user_id, v_ped.plano, v_ped.ciclo, 'ativa', 'pagamento', now(),
          now() + case when v_ped.ciclo = 'anual' then interval '1 year' else interval '1 month' end,
          coalesce(p_valor, v_ped.valor_primeira), v_ped.id, p_gateway, p_gateway_id)
  returning id into v_id;
  insert into private.plano_eventos (user_id, evento, dados)
  values (v_ped.user_id, 'assinatura_ativada', jsonb_build_object('plano', v_ped.plano, 'ciclo', v_ped.ciclo, 'valor', coalesce(p_valor, v_ped.valor_primeira)));
  return v_id;
end;
$$;
revoke all on function private.plano_ativar_pedido(uuid, text, text, numeric) from public, anon, authenticated;

-- ── Indicação ─────────────────────────────────────────────────────────────
create or replace function private.indicacao_novo_codigo(p_user uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  v_cod  text;
  v_base text;
  v_nome text;
begin
  select codigo into v_cod from public.indicacao_codigos where user_id = p_user;
  if v_cod is not null then return v_cod; end if;
  select coalesce(nullif(u.raw_user_meta_data ->> 'nome', ''), nullif(u.raw_user_meta_data ->> 'full_name', ''), split_part(u.email, '@', 1))
    into v_nome from auth.users u where u.id = p_user;
  v_base := upper(regexp_replace(translate(split_part(coalesce(v_nome, 'PROF'), ' ', 1),
            'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'), '[^A-Za-z]', '', 'g'));
  v_base := left(coalesce(nullif(v_base, ''), 'PROF'), 8);
  loop
    v_cod := v_base || '-' || (select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
                                 from generate_series(1, 4));
    exit when not exists (select 1 from public.indicacao_codigos where codigo = v_cod);
  end loop;
  insert into public.indicacao_codigos (user_id, codigo) values (p_user, v_cod) on conflict (user_id) do nothing;
  select codigo into v_cod from public.indicacao_codigos where user_id = p_user;
  return v_cod;
end;
$$;

create or replace function public.indicacao_meu_codigo()
returns text language sql security definer set search_path = ''
as $$ select case when (select auth.uid()) is null then null else private.indicacao_novo_codigo((select auth.uid())) end $$;

-- Confirma a indicação quando o indicado verifica o e-mail (prova de conta real).
create or replace function private.indicacao_confirmar(p_indicado uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_ind   public.indicacoes%rowtype;
  v_cfg   jsonb := coalesce(private.plano_cfg('indicacao'), '{}'::jsonb);
  v_dias  int := coalesce((v_cfg ->> 'dias_indicador')::int, 30);
  v_dias2 int := coalesce((v_cfg ->> 'dias_indicado')::int, 7);
  v_max   int := coalesce((v_cfg ->> 'max_por_ano')::int, 12);
  v_plano text;
  v_ef    jsonb;
  v_ano   int;
begin
  select * into v_ind from public.indicacoes where indicado = p_indicado and status = 'pendente' for update;
  if v_ind.id is null then return; end if;
  if not exists (select 1 from public.conta_email_verificado c where c.user_id = p_indicado) then return; end if;

  select count(*) into v_ano from public.indicacoes
   where indicador = v_ind.indicador and status = 'confirmada' and recompensa is not null and confirmada_em > now() - interval '365 days';

  v_ef := private.plano_efetivo(v_ind.indicador);
  v_plano := case when v_ef ->> 'plano' = 'plus' then 'plus' else coalesce(v_cfg ->> 'plano', 'pro') end;

  if v_ano >= v_max then
    update public.indicacoes set status = 'confirmada', confirmada_em = now(), motivo = 'teto-anual' where id = v_ind.id;
  else
    if v_ef ->> 'origem' = 'pagamento' then
      -- Quem já paga: o mês vira crédito para o gateway adiar a próxima cobrança.
      insert into public.plano_creditos (user_id, dias, plano, origem, ref) values (v_ind.indicador, v_dias, v_plano, 'indicacao', v_ind.id::text);
    else
      perform private.plano_conceder(v_ind.indicador, v_plano, v_dias, 'indicacao', 'cortesia');
      insert into public.plano_creditos (user_id, dias, plano, origem, ref, status, aplicado_em)
      values (v_ind.indicador, v_dias, v_plano, 'indicacao', v_ind.id::text, 'aplicado', now());
    end if;
    update public.indicacoes set status = 'confirmada', confirmada_em = now(), recompensa = v_plano || '+' || v_dias || 'd' where id = v_ind.id;
  end if;
  -- Quem foi indicado ganha uma semana de PRO para conhecer.
  perform private.plano_conceder(p_indicado, 'pro', v_dias2, 'indicado', 'teste');
  insert into private.plano_eventos (user_id, evento, dados)
  values (v_ind.indicador, 'indicacao_confirmada', jsonb_build_object('indicado', p_indicado, 'teto', v_ano >= v_max));
end;
$$;

-- Registra quem indicou (no cadastro ou depois, até 30 dias após criar a conta).
create or replace function private.indicacao_registrar_de(p_user uuid, p_codigo text, p_origem text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_cod    text := upper(btrim(coalesce(p_codigo, '')));
  v_dono   uuid;
  v_criada timestamptz;
  v_janela int := coalesce((private.plano_cfg('indicacao') ->> 'janela_dias')::int, 30);
begin
  if p_user is null or v_cod = '' then return jsonb_build_object('ok', false, 'motivo', 'sem-codigo'); end if;
  select user_id into v_dono from public.indicacao_codigos where codigo = v_cod;
  if v_dono is null then return jsonb_build_object('ok', false, 'motivo', 'codigo-inexistente'); end if;
  if v_dono = p_user then return jsonb_build_object('ok', false, 'motivo', 'proprio-codigo'); end if;
  if exists (select 1 from public.indicacoes where indicado = p_user) then return jsonb_build_object('ok', false, 'motivo', 'ja-indicado'); end if;
  select created_at into v_criada from auth.users where id = p_user;
  if v_criada < now() - make_interval(days => v_janela) then return jsonb_build_object('ok', false, 'motivo', 'conta-antiga'); end if;
  insert into public.indicacoes (indicador, indicado, codigo) values (v_dono, p_user, v_cod) on conflict (indicado) do nothing;
  insert into private.plano_eventos (user_id, evento, dados) values (p_user, 'indicacao_registrada', jsonb_build_object('codigo', v_cod, 'origem', p_origem));
  perform private.indicacao_confirmar(p_user);
  return jsonb_build_object('ok', true, 'status', (select status from public.indicacoes where indicado = p_user));
end;
$$;

create or replace function public.indicacao_registrar(p_codigo text)
returns jsonb language sql security definer set search_path = ''
as $$ select private.indicacao_registrar_de((select auth.uid()), p_codigo, 'pagina') $$;

-- Gatilho: e-mail verificado → confirma a indicação pendente.
create or replace function private.trg_indicacao_email_verificado()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  begin
    perform private.indicacao_confirmar(new.user_id);
  exception when others then
    raise warning 'indicacao_confirmar falhou: %', sqlerrm;
  end;
  return new;
end;
$$;
drop trigger if exists trg_indicacao_email_verificado on public.conta_email_verificado;
create trigger trg_indicacao_email_verificado after insert or update on public.conta_email_verificado
  for each row execute function private.trg_indicacao_email_verificado();

-- ── Consentimentos ────────────────────────────────────────────────────────
create or replace function private.consentimento_texto(p_canal text)
returns text language sql immutable
as $$
  select case p_canal
    when 'email' then 'Autorizo a AXION PROEDUQ (RELATORIO SKIN) a me enviar por e-mail novidades, dicas de uso, avisos e ofertas sobre os planos. Posso cancelar quando quiser, no meu perfil ou pelo link no fim de cada e-mail.'
    when 'whatsapp' then 'Autorizo a AXION PROEDUQ (RELATORIO SKIN) a me enviar mensagens pelo WhatsApp, no número informado, com avisos, dicas e ofertas sobre os planos. Posso cancelar quando quiser, no meu perfil ou respondendo SAIR.'
  end
$$;

create or replace function private.consentimento_de(p_user uuid, p_canal text, p_aceito boolean, p_contato text, p_origem text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_canal   text := lower(coalesce(p_canal, ''));
  v_contato text := nullif(btrim(coalesce(p_contato, '')), '');
  v_email   text;
begin
  if p_user is null then return jsonb_build_object('ok', false, 'motivo', 'sem-conta'); end if;
  if v_canal not in ('email','whatsapp') then return jsonb_build_object('ok', false, 'motivo', 'canal-invalido'); end if;
  if v_canal = 'whatsapp' then
    v_contato := regexp_replace(coalesce(v_contato, ''), '\D', '', 'g');
    if length(v_contato) in (10, 11) then v_contato := '55' || v_contato; end if;
    if p_aceito and (length(v_contato) < 12 or length(v_contato) > 13) then
      return jsonb_build_object('ok', false, 'motivo', 'telefone-invalido');
    end if;
    v_contato := nullif(v_contato, '');
  else
    select lower(email) into v_email from auth.users where id = p_user;
    v_contato := v_email;
  end if;
  insert into public.consentimentos (user_id, canal, aceito, contato, versao, texto, origem)
  values (p_user, v_canal, coalesce(p_aceito, false), v_contato,
          coalesce(private.plano_cfg('consentimento_versao') #>> '{}', '2026-09-26'), private.consentimento_texto(v_canal),
          left(coalesce(p_origem, 'pagina'), 40));
  return jsonb_build_object('ok', true, 'canal', v_canal, 'aceito', coalesce(p_aceito, false), 'contato', v_contato);
end;
$$;

create or replace function public.consentimento_registrar(p_canal text, p_aceito boolean, p_contato text default null, p_origem text default 'pagina')
returns jsonb language sql security definer set search_path = ''
as $$ select private.consentimento_de((select auth.uid()), p_canal, p_aceito, p_contato, p_origem) $$;

-- ── Conta nova: código de indicação, indicação e consentimentos do cadastro ─
create or replace function private.trg_skin_conta_nova()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  -- Contas temporárias da Biblioteca Digital (alunos) não são professores.
  if coalesce(new.raw_app_meta_data ->> 'bdm_sombra', '') = 'true' or coalesce(m ->> 'bdm', '') = 'true' then
    return new;
  end if;
  begin
    perform private.indicacao_novo_codigo(new.id);
    if coalesce(m ->> 'skin_ref', '') <> '' then
      perform private.indicacao_registrar_de(new.id, m ->> 'skin_ref', 'cadastro');
    end if;
    if m ? 'skin_consent_email' then
      perform private.consentimento_de(new.id, 'email', (m ->> 'skin_consent_email')::boolean, null, 'cadastro');
    end if;
    if coalesce((m ->> 'skin_consent_whatsapp')::boolean, false) then
      perform private.consentimento_de(new.id, 'whatsapp', true, m ->> 'skin_whatsapp', 'cadastro');
    end if;
    insert into private.plano_eventos (user_id, evento, dados)
    values (new.id, 'conta_criada', jsonb_build_object('ref', m ->> 'skin_ref', 'origem', m ->> 'skin_origem'));
  exception when others then
    raise warning 'trg_skin_conta_nova: %', sqlerrm;
  end;
  return new;
end;
$$;
drop trigger if exists trg_skin_conta_nova on auth.users;
create trigger trg_skin_conta_nova after insert on auth.users
  for each row execute function private.trg_skin_conta_nova();

-- ── Funil e leads ─────────────────────────────────────────────────────────
create or replace function public.plano_evento(p_evento text, p_dados jsonb default '{}'::jsonb)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if p_evento !~ '^[a-z0-9_]{3,40}$' then return false; end if;
  if v_uid is not null and (select count(*) from private.plano_eventos where user_id = v_uid and em > now() - interval '1 day') > 300 then
    return false;
  end if;
  insert into private.plano_eventos (user_id, evento, dados)
  values (v_uid, p_evento, case when length(coalesce(p_dados, '{}'::jsonb)::text) > 2000 then '{}'::jsonb else coalesce(p_dados, '{}'::jsonb) end);
  return true;
end;
$$;
grant execute on function public.plano_evento(text, jsonb) to anon, authenticated;

create or replace function public.lead_escola_registrar(p_nome text, p_email text, p_telefone text, p_escola text, p_cargo text,
  p_municipio text, p_uf text, p_professores int, p_mensagem text, p_aceita_contato boolean, p_origem text default 'planos')
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if length(btrim(coalesce(p_nome, ''))) < 2 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'motivo', 'dados-invalidos');
  end if;
  if (select count(*) from private.leads_escolas where email = v_email and criado_em > now() - interval '1 day') >= 3 then
    return jsonb_build_object('ok', true, 'repetido', true);
  end if;
  insert into private.leads_escolas (nome, email, telefone, escola, cargo, municipio, uf, professores, mensagem, aceita_contato, origem, user_id)
  values (left(btrim(p_nome), 120), left(v_email, 160), left(regexp_replace(coalesce(p_telefone, ''), '[^\d+() -]', '', 'g'), 30),
          left(coalesce(p_escola, ''), 160), left(coalesce(p_cargo, ''), 80), left(coalesce(p_municipio, ''), 80), left(upper(coalesce(p_uf, '')), 2),
          greatest(0, least(coalesce(p_professores, 0), 100000)), left(coalesce(p_mensagem, ''), 1500), coalesce(p_aceita_contato, false),
          left(coalesce(p_origem, ''), 40), (select auth.uid()));
  insert into private.plano_eventos (user_id, evento, dados) values ((select auth.uid()), 'lead_escola', jsonb_build_object('uf', upper(coalesce(p_uf, '')), 'professores', p_professores));
  return jsonb_build_object('ok', true);
end;
$$;
grant execute on function public.lead_escola_registrar(text, text, text, text, text, text, text, int, text, boolean, text) to anon, authenticated;

-- Painel do administrador: funil, planos, pedidos, indicação, consentimentos e leads.
create or replace function public.plano_painel_admin(p_dias int default 30)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_desde timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_dias, 30), 730)));
begin
  if not private.skin_admin() then raise exception 'Só o administrador.'; end if;
  return jsonb_build_object(
    'desde', v_desde,
    'contas', (select count(*) from auth.users u where coalesce(u.raw_app_meta_data ->> 'bdm_sombra', '') <> 'true'),
    'contas_novas', (select count(*) from auth.users u where u.created_at >= v_desde and coalesce(u.raw_app_meta_data ->> 'bdm_sombra', '') <> 'true'),
    'por_plano', (select jsonb_object_agg(pl, n) from (
        select private.plano_efetivo(u.id) ->> 'plano' pl, count(*) n
          from auth.users u where coalesce(u.raw_app_meta_data ->> 'bdm_sombra', '') <> 'true' group by 1) x),
    'eventos', (select jsonb_object_agg(evento, n) from (
        select evento, count(*) n from private.plano_eventos where em >= v_desde group by 1) x),
    'pedidos', (select jsonb_object_agg(status, n) from (
        select status, count(*) n from public.assinatura_pedidos where criado_em >= v_desde group by 1) x),
    'indicacoes', (select jsonb_object_agg(status, n) from (
        select status, count(*) n from public.indicacoes where criado_em >= v_desde group by 1) x),
    'optin', (select jsonb_object_agg(canal, n) from (
        select canal, count(*) n from (
          select distinct on (user_id, canal) user_id, canal, aceito from public.consentimentos order by user_id, canal, criado_em desc, id desc) c
        where aceito group by canal) x),
    'leads', (select coalesce(jsonb_agg(l order by l.criado_em desc), '[]'::jsonb) from (
        select nome, email, telefone, escola, cargo, municipio, uf, professores, aceita_contato, criado_em
          from private.leads_escolas where criado_em >= v_desde order by criado_em desc limit 100) l));
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- Cotas da I.A. seguem o plano (as Edge Functions continuam chamando
-- ia_consumir_cota / ia_saldo, sem mudar de nome).
-- ═══════════════════════════════════════════════════════════════════════
create or replace function public.ia_consumir_cota(p_tipo text, p_limite integer default 20)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  uid      uuid := (select auth.uid());
  v_tipo   text := coalesce(nullif(btrim(p_tipo), ''), 'geral');
  v_modo   text := coalesce(private.plano_cfg('modo_limites') #>> '{}', 'lancamento');
  v_r      jsonb;
  v_ldia   int;
  v_udia   int;
  v_lim    int;
begin
  if uid is null then return jsonb_build_object('ok', false, 'motivo', 'sem-conta'); end if;
  if private.skin_admin() then return jsonb_build_object('ok', true, 'ilimitado', true); end if;
  -- Diário criado pela I.A. conta como diário (a página confere o plano ao salvar).
  if v_tipo = 'diarios' then return jsonb_build_object('ok', true, 'ilimitado', true, 'recurso', 'diario'); end if;

  if v_modo <> 'ativo' then
    -- Lançamento: o teto diário antigo continua valendo como proteção de custo.
    v_ldia := private.ia_limite(uid, v_tipo, p_limite);
    insert into private.ia_uso as u (user_id, dia, tipo, pedidos)
    values (uid, private.hoje_acre(), v_tipo, 1)
    on conflict (user_id, dia, tipo) do update set pedidos = u.pedidos + 1
    returning u.pedidos into v_udia;
    if v_udia > v_ldia then
      return jsonb_build_object('ok', false, 'motivo', 'limite-diario', 'periodo', 'dia', 'usado', v_udia, 'limite', v_ldia,
                                'restante', 0, 'ilimitado', false);
    end if;
  end if;

  v_r := private.plano_consumir_de(uid, false, 'ia', null, null, 1);
  v_lim := nullif(v_r ->> 'limite_mes', '')::int;
  return jsonb_build_object(
    'ok', coalesce((v_r ->> 'ok')::boolean, false),
    'motivo', case when coalesce((v_r ->> 'bloqueado')::boolean, false) then 'plano' else v_r ->> 'motivo' end,
    'periodo', 'mes', 'plano', v_r ->> 'plano', 'modo', v_modo,
    'excedeu', coalesce((v_r ->> 'excedeu')::boolean, false),
    'usado', coalesce((v_r ->> 'usado_mes')::int, 0), 'limite', v_lim,
    'restante', case when v_lim is null then null else greatest(0, v_lim - coalesce((v_r ->> 'usado_mes')::int, 0)) end,
    'ilimitado', v_lim is null);
end;
$$;

-- Versão antiga (organizar-relato): devolve verdadeiro/falso.
create or replace function public.ia_consumir_cota(p_limite integer default 40)
returns boolean language sql security definer set search_path = ''
as $$ select coalesce((public.ia_consumir_cota('geral', p_limite) ->> 'ok')::boolean, false) $$;

create or replace function public.ia_saldo(p_tipo text default 'assistente', p_limite integer default 20)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  uid   uuid := (select auth.uid());
  v_ef  jsonb;
  v_lim int;
  v_uso int;
begin
  if uid is null then return jsonb_build_object('ok', false, 'motivo', 'sem-conta'); end if;
  if private.skin_admin() then return jsonb_build_object('ok', true, 'ilimitado', true); end if;
  v_ef := private.plano_efetivo(uid);
  select nullif(p.limites ->> 'ia_mes', '')::int into v_lim from public.planos p where p.id = v_ef ->> 'plano';
  v_uso := coalesce((private.plano_uso_resumo(uid, null) ->> 'ia_mes')::int, 0);
  return jsonb_build_object('ok', v_lim is null or v_uso < v_lim, 'usado', v_uso, 'limite', v_lim, 'periodo', 'mes',
    'plano', v_ef ->> 'plano', 'modo', coalesce(private.plano_cfg('modo_limites') #>> '{}', 'lancamento'),
    'restante', case when v_lim is null then null else greatest(0, v_lim - v_uso) end, 'ilimitado', v_lim is null);
end;
$$;

-- ── Permissões ────────────────────────────────────────────────────────────
revoke all on function private.plano_consumir_de(uuid, boolean, text, text, date, int) from public, anon, authenticated;
revoke all on function private.plano_conceder(uuid, text, int, text, text) from public, anon, authenticated;
revoke all on function private.indicacao_confirmar(uuid) from public, anon, authenticated;
revoke all on function private.indicacao_registrar_de(uuid, text, text) from public, anon, authenticated;
revoke all on function private.consentimento_de(uuid, text, boolean, text, text) from public, anon, authenticated;
grant execute on function public.plano_consumir(text, text, date, int) to authenticated;
grant execute on function public.plano_status(date) to authenticated;
grant execute on function public.plano_criar_pedido(text, text, text, jsonb) to authenticated;
grant execute on function public.plano_cancelar_pedido(uuid) to authenticated;
grant execute on function public.indicacao_meu_codigo() to authenticated;
grant execute on function public.indicacao_registrar(text) to authenticated;
grant execute on function public.consentimento_registrar(text, boolean, text, text) to authenticated;
grant execute on function public.plano_painel_admin(int) to authenticated;
revoke execute on function public.plano_consumir(text, text, date, int) from anon;
revoke execute on function public.plano_status(date) from anon;
revoke execute on function public.plano_criar_pedido(text, text, text, jsonb) from anon;

-- Contas que já existem ganham o código de indicação.
select private.indicacao_novo_codigo(u.id)
  from auth.users u
 where coalesce(u.raw_app_meta_data ->> 'bdm_sombra', '') <> 'true'
   and coalesce(u.raw_user_meta_data ->> 'bdm', '') <> 'true';
