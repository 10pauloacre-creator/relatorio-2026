-- Etapa 15 (21/09/2026): alunos da Educação Especial (AEE) compartilhados.
--
-- O perfil do aluno NÃO fica nos dados particulares de uma conta: fica em
-- public.aee_alunos e é identificado por um CÓDIGO (ex.: AEE-7K3M-Q9TX).
-- Cada profissional (mediador, assistente, professor do AEE ou regente)
-- entra com o código e ganha um vínculo (aee_vinculos); todos os vinculados
-- enxergam exatamente o mesmo perfil, registros, boletim e documentos.
-- No futuro, o Conex-ED (gestão escolar) cadastra todos os alunos da escola
-- com esse mesmo código.
--
-- Quem edita o perfil: mediador, assistente e AEE. O regente lê o perfil e
-- escreve registros e notas da própria disciplina. Cada registro só é
-- alterado ou apagado por quem escreveu.
--
-- Dados de deficiência são dados pessoais sensíveis (LGPD, art. 11) de
-- menores: só os profissionais vinculados leem (RLS), nada é público.

-- ── Tabelas ─────────────────────────────────────────────────────────────
create table if not exists public.aee_alunos (
  id            uuid primary key default gen_random_uuid(),
  codigo        text not null unique,
  nome          text not null,
  nascimento    date,
  escola_inep   integer,
  escola_nome   text,
  municipio     text,
  uf            char(2),
  turma         text,
  serie         text,
  turno         text,
  deficiencias  text[] not null default '{}',
  cid           text,
  laudo         boolean,
  foto          text,
  perfil        jsonb not null default '{}'::jsonb,  -- necessidades, estratégias, responsáveis, disciplinas, PEI…
  criado_por    uuid references auth.users(id) on delete set null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  atualizado_por text,
  constraint aee_alunos_perfil_tamanho check (pg_column_size(perfil) < 1048576),
  constraint aee_alunos_foto_tamanho check (foto is null or length(foto) < 400000)
);
create index if not exists aee_alunos_escola_idx on public.aee_alunos (escola_inep);

create table if not exists public.aee_vinculos (
  aluno_id          uuid not null references public.aee_alunos(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  papel             text not null check (papel in ('mediador','assistente','aee','regente')),
  escola_local      text,          -- id da escola no Meu Diário de quem se vinculou
  nome_profissional text,
  disciplina        text,          -- regente: disciplina que leciona para o aluno
  criado_em         timestamptz not null default now(),
  primary key (aluno_id, user_id)
);
create index if not exists aee_vinculos_user_idx on public.aee_vinculos (user_id);

create table if not exists public.aee_registros (
  id         uuid primary key default gen_random_uuid(),
  aluno_id   uuid not null references public.aee_alunos(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  autor      text,
  papel      text,
  tipo       text not null check (tipo in ('diario','relatorio','ocorrencia','avaliacao','nota','comunicado','atendimento')),
  disciplina text,
  data       date not null default current_date,
  bimestre   smallint check (bimestre between 1 and 4),
  nota       numeric(4,2) check (nota is null or (nota >= 0 and nota <= 10)),
  titulo     text,
  texto      text,
  criado_em  timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists aee_registros_aluno_idx on public.aee_registros (aluno_id, data desc);

create table if not exists public.aee_documentos (
  id         uuid primary key default gen_random_uuid(),
  aluno_id   uuid not null references public.aee_alunos(id) on delete cascade,
  pasta      text not null,
  nome       text not null,
  caminho    text not null unique,
  tipo       text,
  tamanho    bigint,
  user_id    uuid references auth.users(id) on delete set null,
  autor      text,
  criado_em  timestamptz not null default now()
);
create index if not exists aee_documentos_aluno_idx on public.aee_documentos (aluno_id, pasta);

-- ── Quem pode o quê ────────────────────────────────────────────────────
create or replace function private.aee_vinculado(p_aluno uuid)
returns boolean language sql stable security definer set search_path to ''
as $$
  select exists (select 1 from public.aee_vinculos v where v.aluno_id = p_aluno and v.user_id = (select auth.uid()));
$$;
create or replace function private.aee_editor(p_aluno uuid)
returns boolean language sql stable security definer set search_path to ''
as $$
  select exists (select 1 from public.aee_vinculos v where v.aluno_id = p_aluno and v.user_id = (select auth.uid())
                  and v.papel in ('mediador','assistente','aee'));
$$;
grant execute on function private.aee_vinculado(uuid) to authenticated;
grant execute on function private.aee_editor(uuid) to authenticated;

alter table public.aee_alunos enable row level security;
alter table public.aee_vinculos enable row level security;
alter table public.aee_registros enable row level security;
alter table public.aee_documentos enable row level security;
revoke all on public.aee_alunos, public.aee_vinculos, public.aee_registros, public.aee_documentos from anon;
grant select, update on public.aee_alunos to authenticated;
grant select, delete on public.aee_vinculos to authenticated;
grant select, insert, update, delete on public.aee_registros, public.aee_documentos to authenticated;

drop policy if exists aee_alunos_ler on public.aee_alunos;
create policy aee_alunos_ler on public.aee_alunos for select to authenticated
  using ((select private.aee_vinculado(id)));
drop policy if exists aee_alunos_editar on public.aee_alunos;
create policy aee_alunos_editar on public.aee_alunos for update to authenticated
  using ((select private.aee_editor(id))) with check ((select private.aee_editor(id)));

drop policy if exists aee_vinculos_ler on public.aee_vinculos;
create policy aee_vinculos_ler on public.aee_vinculos for select to authenticated
  using ((select private.aee_vinculado(aluno_id)));
drop policy if exists aee_vinculos_sair on public.aee_vinculos;
create policy aee_vinculos_sair on public.aee_vinculos for delete to authenticated
  using (user_id = (select auth.uid()) or (select private.aee_editor(aluno_id)));

drop policy if exists aee_registros_ler on public.aee_registros;
create policy aee_registros_ler on public.aee_registros for select to authenticated
  using ((select private.aee_vinculado(aluno_id)));
drop policy if exists aee_registros_criar on public.aee_registros;
create policy aee_registros_criar on public.aee_registros for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.aee_vinculado(aluno_id)));
drop policy if exists aee_registros_alterar on public.aee_registros;
create policy aee_registros_alterar on public.aee_registros for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists aee_registros_apagar on public.aee_registros;
create policy aee_registros_apagar on public.aee_registros for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists aee_documentos_ler on public.aee_documentos;
create policy aee_documentos_ler on public.aee_documentos for select to authenticated
  using ((select private.aee_vinculado(aluno_id)));
drop policy if exists aee_documentos_criar on public.aee_documentos;
create policy aee_documentos_criar on public.aee_documentos for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.aee_vinculado(aluno_id)));
drop policy if exists aee_documentos_apagar on public.aee_documentos;
create policy aee_documentos_apagar on public.aee_documentos for delete to authenticated
  using (user_id = (select auth.uid()) or (select private.aee_editor(aluno_id)));

-- ── Funções ────────────────────────────────────────────────────────────
-- Código legível, sem letras que se confundem (0/O, 1/I/L).
create or replace function private.aee_novo_codigo()
returns text language plpgsql volatile set search_path to ''
as $$
declare
  alfabeto constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v text;
begin
  loop
    v := 'AEE-';
    for i in 1..8 loop
      v := v || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
      if i = 4 then v := v || '-'; end if;
    end loop;
    exit when not exists (select 1 from public.aee_alunos where codigo = v);
  end loop;
  return v;
end;
$$;

-- Cadastra o aluno e já vincula quem cadastrou.
create or replace function public.aee_criar_aluno(p_dados jsonb, p_papel text, p_escola_local text, p_nome_profissional text)
returns public.aee_alunos
language plpgsql security definer set search_path to ''
as $$
declare
  v public.aee_alunos;
begin
  if (select auth.uid()) is null then raise exception 'Entre na conta.'; end if;
  if p_papel not in ('mediador','assistente','aee') then raise exception 'Só mediador, assistente ou AEE cadastram alunos.'; end if;
  if coalesce(trim(p_dados->>'nome'), '') = '' then raise exception 'Informe o nome do aluno.'; end if;
  insert into public.aee_alunos (codigo, nome, nascimento, escola_inep, escola_nome, municipio, uf, turma, serie, turno,
                                 deficiencias, cid, laudo, foto, perfil, criado_por, atualizado_por)
  values (private.aee_novo_codigo(), trim(p_dados->>'nome'), nullif(p_dados->>'nascimento','')::date,
          nullif(p_dados->>'escola_inep','')::integer, p_dados->>'escola_nome', p_dados->>'municipio', nullif(p_dados->>'uf',''),
          p_dados->>'turma', p_dados->>'serie', p_dados->>'turno',
          coalesce(array(select jsonb_array_elements_text(p_dados->'deficiencias')), '{}'),
          p_dados->>'cid', (p_dados->>'laudo')::boolean, nullif(p_dados->>'foto',''),
          coalesce(p_dados->'perfil', '{}'::jsonb), (select auth.uid()), p_nome_profissional)
  returning * into v;
  insert into public.aee_vinculos (aluno_id, user_id, papel, escola_local, nome_profissional)
  values (v.id, (select auth.uid()), p_papel, p_escola_local, p_nome_profissional);
  return v;
end;
$$;

-- Entra no perfil de um aluno pelo código (ou troca o próprio papel).
create or replace function public.aee_vincular(p_codigo text, p_papel text, p_escola_local text, p_nome_profissional text, p_disciplina text default null)
returns public.aee_alunos
language plpgsql security definer set search_path to ''
as $$
declare
  v public.aee_alunos;
begin
  if (select auth.uid()) is null then raise exception 'Entre na conta.'; end if;
  if p_papel not in ('mediador','assistente','aee','regente') then raise exception 'Papel inválido.'; end if;
  select * into v from public.aee_alunos where codigo = upper(trim(p_codigo));
  if v.id is null then raise exception 'Código não encontrado. Confira com quem cadastrou o aluno.'; end if;
  insert into public.aee_vinculos (aluno_id, user_id, papel, escola_local, nome_profissional, disciplina)
  values (v.id, (select auth.uid()), p_papel, p_escola_local, p_nome_profissional, nullif(p_disciplina,''))
  on conflict (aluno_id, user_id) do update
    set papel = excluded.papel, escola_local = excluded.escola_local,
        nome_profissional = excluded.nome_profissional, disciplina = coalesce(excluded.disciplina, public.aee_vinculos.disciplina);
  return v;
end;
$$;

-- Apaga o aluno (perfil, vínculos, registros, documentos). Só mediador ou AEE,
-- com a senha da conta. Os arquivos do Storage saem antes, pela página.
create or replace function public.aee_excluir_aluno(p_aluno uuid, p_senha text, p_confirmacao text)
returns boolean
language plpgsql security definer set search_path to ''
as $$
declare v_ok boolean;
begin
  if not exists (select 1 from public.aee_vinculos where aluno_id = p_aluno and user_id = (select auth.uid()) and papel in ('mediador','aee')) then
    raise exception 'Só o mediador ou o professor do AEE excluem o aluno.';
  end if;
  v_ok := public.conta_verificar_senha(p_senha);
  if v_ok is null then v_ok := lower(trim(coalesce(p_confirmacao,''))) = lower(coalesce((select auth.email()),'')); end if;
  if not v_ok then raise exception 'Senha incorreta.'; end if;
  delete from public.aee_alunos where id = p_aluno;
  return true;
end;
$$;

revoke all on function public.aee_criar_aluno(jsonb, text, text, text) from public, anon;
revoke all on function public.aee_vincular(text, text, text, text, text) from public, anon;
revoke all on function public.aee_excluir_aluno(uuid, text, text) from public, anon;
grant execute on function public.aee_criar_aluno(jsonb, text, text, text) to authenticated;
grant execute on function public.aee_vincular(text, text, text, text, text) to authenticated;
grant execute on function public.aee_excluir_aluno(uuid, text, text) to authenticated;

-- Carimbo de alteração do perfil.
create or replace function private.aee_carimbo() returns trigger language plpgsql set search_path to ''
as $$ begin new.atualizado_em := now(); return new; end; $$;
drop trigger if exists aee_alunos_carimbo on public.aee_alunos;
create trigger aee_alunos_carimbo before update on public.aee_alunos for each row execute function private.aee_carimbo();
drop trigger if exists aee_registros_carimbo on public.aee_registros;
create trigger aee_registros_carimbo before update on public.aee_registros for each row execute function private.aee_carimbo();

-- ── Documentos do aluno (Storage privado: <aluno_id>/<pasta>/<arquivo>) ─
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('aee-arquivos', 'aee-arquivos', false, 15728640,
        array['application/pdf','application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','video/mp4'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.aee_pasta_vinculada(p_nome text)
returns boolean language sql stable security definer set search_path to ''
as $$
  select exists (select 1 from public.aee_vinculos v
                 where v.user_id = (select auth.uid()) and v.aluno_id::text = split_part(p_nome, '/', 1));
$$;
grant execute on function private.aee_pasta_vinculada(text) to authenticated;
create or replace function private.aee_pasta_editor(p_nome text)
returns boolean language sql stable security definer set search_path to ''
as $$
  select exists (select 1 from public.aee_vinculos v
                 where v.user_id = (select auth.uid()) and v.aluno_id::text = split_part(p_nome, '/', 1)
                   and v.papel in ('mediador','assistente','aee'));
$$;
grant execute on function private.aee_pasta_editor(text) to authenticated;

drop policy if exists aee_arquivos_ler on storage.objects;
create policy aee_arquivos_ler on storage.objects for select to authenticated
  using (bucket_id = 'aee-arquivos' and (select private.aee_pasta_vinculada(name)));
drop policy if exists aee_arquivos_gravar on storage.objects;
create policy aee_arquivos_gravar on storage.objects for insert to authenticated
  with check (bucket_id = 'aee-arquivos' and (select private.aee_pasta_vinculada(name)));
drop policy if exists aee_arquivos_apagar on storage.objects;
create policy aee_arquivos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'aee-arquivos' and (owner_id = (select auth.uid())::text or (select private.aee_pasta_editor(name))));
