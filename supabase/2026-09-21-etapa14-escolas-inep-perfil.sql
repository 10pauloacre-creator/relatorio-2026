-- Etapa 14 (21/09/2026): escolas do INEP, perfil do professor e zona de perigo.
--
-- 1. Catálogo de escolas do INEP (Censo Escolar 2024, microdados abertos):
--    public.inep_escolas + public.inep_municipios. A carga dos dados é feita por
--    scripts/importar-escolas-inep.js (fora deste arquivo). Qualquer conta logada
--    consulta pelas funções inep_*; ninguém grava pela API.
-- 2. public.professor_escolas: escola do INEP ligada à conta do professor. Hoje
--    serve para o próprio professor; no futuro, a plataforma da escola usa esta
--    tabela para oferecer as turmas e os alunos matriculados.
-- 3. Bucket privado "professor-arquivos" (certificados do perfil): cada conta só
--    enxerga a própria pasta <user_id>/...
-- 4. conta_verificar_senha / conta_excluir: confirmação por senha antes de
--    excluir escola, turma ou a conta. A conta do administrador não se exclui.

-- ── 1. Catálogo do INEP ─────────────────────────────────────────────────
create table if not exists public.inep_escolas (
  codigo            integer primary key,          -- CO_ENTIDADE
  nome              text    not null,             -- NO_ENTIDADE
  nome_busca        text    not null,             -- sem acento, minúsculo
  uf                char(2) not null,
  municipio_codigo  integer not null,             -- código IBGE
  municipio         text    not null,
  rede              text,                         -- Federal/Estadual/Municipal/Privada
  localizacao       text,                         -- Urbana/Rural
  situacao          text,                         -- Em atividade/Paralisada
  endereco          text,
  bairro            text,
  cep               text,
  telefone          text,
  matriculas        integer,
  etapas            text,                         -- "Infantil, Fundamental, Médio, EJA"
  ano_censo         smallint not null default 2024
);
create index if not exists inep_escolas_municipio_idx on public.inep_escolas (municipio_codigo, nome_busca);

create table if not exists public.inep_municipios (
  codigo  integer primary key,
  uf      char(2) not null,
  nome    text    not null,
  escolas integer not null default 0
);
create index if not exists inep_municipios_uf_idx on public.inep_municipios (uf, nome);

alter table public.inep_escolas enable row level security;
alter table public.inep_municipios enable row level security;
-- Sem políticas: a leitura é só pelas funções abaixo (security definer).
revoke all on public.inep_escolas, public.inep_municipios from anon, authenticated;

create or replace function public.inep_municipios_da_uf(p_uf text)
returns table (codigo integer, nome text, escolas integer)
language sql stable security definer set search_path to ''
as $$
  select m.codigo, m.nome, m.escolas
    from public.inep_municipios m
   where (select auth.uid()) is not null
     and m.uf = upper(p_uf)
   order by m.nome;
$$;

-- Busca por município (obrigatório) e termo; o termo pode ser o código INEP.
create or replace function public.inep_buscar_escolas(p_municipio integer, p_termo text default '', p_limite integer default 60)
returns setof public.inep_escolas
language plpgsql stable security definer set search_path to ''
as $$
declare
  v_termo text := lower(public.unaccent(coalesce(trim(p_termo), '')));
  v_partes text[];
begin
  if (select auth.uid()) is null then return; end if;
  if v_termo ~ '^\d{8}$' then
    return query select * from public.inep_escolas e where e.codigo = v_termo::integer;
    return;
  end if;
  v_partes := array_remove(regexp_split_to_array(v_termo, '\s+'), '');
  return query
    select e.* from public.inep_escolas e
     where e.municipio_codigo = p_municipio
       and (coalesce(array_length(v_partes, 1), 0) = 0
            or not exists (select 1 from unnest(v_partes) p where e.nome_busca not like '%' || p || '%'))
     order by e.nome
     limit least(greatest(coalesce(p_limite, 60), 1), 300);
end;
$$;

create or replace function public.inep_escola(p_codigo integer)
returns setof public.inep_escolas
language sql stable security definer set search_path to ''
as $$
  select e.* from public.inep_escolas e
   where (select auth.uid()) is not null and e.codigo = p_codigo;
$$;

revoke all on function public.inep_municipios_da_uf(text) from public, anon;
revoke all on function public.inep_buscar_escolas(integer, text, integer) from public, anon;
revoke all on function public.inep_escola(integer) from public, anon;
grant execute on function public.inep_municipios_da_uf(text) to authenticated;
grant execute on function public.inep_buscar_escolas(integer, text, integer) to authenticated;
grant execute on function public.inep_escola(integer) to authenticated;

-- ── 2. Escolas ligadas ao professor ────────────────────────────────────
create table if not exists public.professor_escolas (
  user_id      uuid    not null references auth.users(id) on delete cascade,
  escola_local text    not null,                 -- id da escola no Meu Diário
  inep_codigo  integer,                          -- null = escola sem código INEP
  nome         text    not null,
  municipio    text,
  uf           char(2),
  criado_em    timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (user_id, escola_local)
);
create index if not exists professor_escolas_inep_idx on public.professor_escolas (inep_codigo);
alter table public.professor_escolas enable row level security;

drop policy if exists professor_escolas_dono on public.professor_escolas;
create policy professor_escolas_dono on public.professor_escolas
  for all to authenticated
  using (user_id = (select auth.uid()) or (select private.is_relatorio_admin()))
  with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.professor_escolas to authenticated;

-- ── 3. Arquivos do perfil (certificados) ───────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('professor-arquivos', 'professor-arquivos', false, 10485760,
        array['application/pdf',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists professor_arquivos_ler on storage.objects;
create policy professor_arquivos_ler on storage.objects for select to authenticated
  using (bucket_id = 'professor-arquivos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists professor_arquivos_gravar on storage.objects;
create policy professor_arquivos_gravar on storage.objects for insert to authenticated
  with check (bucket_id = 'professor-arquivos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists professor_arquivos_alterar on storage.objects;
create policy professor_arquivos_alterar on storage.objects for update to authenticated
  using (bucket_id = 'professor-arquivos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists professor_arquivos_apagar on storage.objects;
create policy professor_arquivos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'professor-arquivos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ── 4. Senha e exclusão da conta ───────────────────────────────────────
-- true = senha certa; false = errada; null = a conta não tem senha (entrou só
-- pelo Google): a página pede para digitar o e-mail no lugar.
create or replace function public.conta_verificar_senha(p_senha text)
returns boolean
language plpgsql stable security definer set search_path to ''
as $$
declare v_hash text;
begin
  if (select auth.uid()) is null then return false; end if;
  select u.encrypted_password into v_hash from auth.users u where u.id = (select auth.uid());
  if coalesce(v_hash, '') = '' then return null; end if;
  return v_hash = extensions.crypt(coalesce(p_senha, ''), v_hash);
end;
$$;

-- Exclui a conta de quem chama. Os arquivos do Storage são apagados antes pela
-- página (o Supabase não deixa apagar storage.objects por SQL). professor_dados,
-- o histórico, professor_escolas, a cota da IA e o perfil saem em cascata.
create or replace function public.conta_excluir(p_senha text, p_confirmacao text)
returns boolean
language plpgsql security definer set search_path to ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text := lower(coalesce((select auth.email()), ''));
  v_ok boolean;
begin
  if v_uid is null then raise exception 'Entre na conta para excluí-la.'; end if;
  if v_email = '10pauloacre@gmail.com' then
    raise exception 'A conta do administrador não pode ser excluída por aqui.';
  end if;
  v_ok := public.conta_verificar_senha(p_senha);
  if v_ok is null then
    v_ok := lower(trim(coalesce(p_confirmacao, ''))) = v_email;
  end if;
  if not v_ok then raise exception 'Senha incorreta.'; end if;
  delete from auth.users where id = v_uid;
  return true;
end;
$$;

revoke all on function public.conta_verificar_senha(text) from public, anon;
revoke all on function public.conta_excluir(text, text) from public, anon;
grant execute on function public.conta_verificar_senha(text) to authenticated;
grant execute on function public.conta_excluir(text, text) to authenticated;
