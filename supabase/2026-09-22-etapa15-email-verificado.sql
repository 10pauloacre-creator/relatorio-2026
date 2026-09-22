-- Etapa 15 (22/09/2026): conta abre sem confirmar o e-mail; o perfil mostra
-- "verificar e-mail" até o dono provar que o endereço é dele.
--
-- Decisão do professor: o cadastro no RELATORIO SKIN abre a conta na hora,
-- sem esperar o e-mail de confirmação. Com "Confirm email" desligado no
-- Supabase (mailer_autoconfirm = true), o próprio Supabase preenche
-- auth.users.email_confirmed_at em todo cadastro, então essa coluna deixa de
-- dizer se o e-mail foi verificado. A verificação passa a ficar aqui.
--
-- Como a conta fica verificada:
--   * Google: o Google já garante o e-mail (identidade google com
--     email_verified = true e o mesmo endereço da conta).
--   * Link ou código enviado por e-mail (botão "Verificar e-mail" no perfil):
--     a sessão nasce de um OTP/link, e o token traz esse método em "amr".
-- Contas que já existiam antes desta etapa e tinham e-mail confirmado entram
-- como verificadas (a confirmação delas foi feita pelo link, na regra antiga).

create table if not exists public.conta_email_verificado (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  verificado_em timestamptz not null default now(),
  metodo       text not null check (metodo in ('google', 'link', 'anterior'))
);

alter table public.conta_email_verificado enable row level security;

drop policy if exists conta_email_verificado_ler_propria on public.conta_email_verificado;
create policy conta_email_verificado_ler_propria on public.conta_email_verificado
  for select to authenticated
  using (user_id = (select auth.uid()));
-- Sem INSERT/UPDATE/DELETE pela API: só a função abaixo grava.

revoke all on public.conta_email_verificado from anon;
grant select on public.conta_email_verificado to authenticated;

-- Situação do e-mail da conta logada. Marca como verificado quando a prova
-- está no próprio token (Google ou sessão aberta por link/código de e-mail).
create or replace function public.conta_email_status()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_email text;
  v_row   public.conta_email_verificado%rowtype;
  v_amr   jsonb := coalesce((select auth.jwt()) -> 'amr', '[]'::jsonb);
  v_metodo text;
begin
  if v_uid is null then
    return null;
  end if;

  select lower(u.email) into v_email from auth.users u where u.id = v_uid;

  select * into v_row from public.conta_email_verificado c where c.user_id = v_uid;
  -- Trocou o e-mail da conta: a verificação antiga não vale para o novo.
  if v_row.user_id is not null and v_row.email <> v_email then
    delete from public.conta_email_verificado where user_id = v_uid;
    v_row := null;
  end if;

  if v_row.user_id is null then
    if exists (
      select 1 from auth.identities i
      where i.user_id = v_uid
        and i.provider = 'google'
        and lower(coalesce(i.identity_data ->> 'email', '')) = v_email
        and coalesce(i.identity_data ->> 'email_verified', 'false') = 'true'
    ) then
      v_metodo := 'google';
    elsif exists (
      select 1 from jsonb_array_elements(v_amr) a
      where a ->> 'method' in ('otp', 'magiclink', 'email/signup', 'recovery', 'invite', 'email_change')
    ) then
      v_metodo := 'link';
    end if;

    if v_metodo is not null then
      insert into public.conta_email_verificado (user_id, email, metodo)
      values (v_uid, v_email, v_metodo)
      on conflict (user_id) do update
        set email = excluded.email, metodo = excluded.metodo, verificado_em = now()
      returning * into v_row;
    end if;
  end if;

  return jsonb_build_object(
    'email', v_email,
    'verificado', v_row.user_id is not null,
    'metodo', v_row.metodo,
    'verificado_em', v_row.verificado_em
  );
end;
$$;

revoke all on function public.conta_email_status() from public, anon;
grant execute on function public.conta_email_status() to authenticated;

-- Contas anteriores a esta etapa: e-mail já confirmado pela regra antiga.
insert into public.conta_email_verificado (user_id, email, metodo, verificado_em)
select u.id, lower(u.email),
       case when coalesce(u.raw_app_meta_data ->> 'provider', '') = 'google' then 'google' else 'anterior' end,
       u.email_confirmed_at
  from auth.users u
 where u.email is not null
   and u.email_confirmed_at is not null
   and u.created_at < '2026-09-22 14:00:00+00'
on conflict (user_id) do nothing;
