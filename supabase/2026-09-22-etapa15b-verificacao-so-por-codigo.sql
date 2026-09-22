-- Etapa 15B (22/09/2026): verificação do e-mail SÓ pelo código enviado ao
-- e-mail. Decisão do professor: desfazer a verificação de todas as contas do
-- RELATORIO SKIN (inclusive as do Google e as confirmadas pela regra antiga) e
-- pedir a cada uma que confirme com o código.
--
-- Muda em relação à Etapa 15: o Google e o "anterior" deixam de verificar. A
-- única prova aceita é a sessão aberta pelo código/link do e-mail (amr "otp"
-- ou "magiclink"), pedida pelo botão "Verificar e-mail" no perfil.

delete from public.conta_email_verificado;

alter table public.conta_email_verificado drop constraint if exists conta_email_verificado_metodo_check;
alter table public.conta_email_verificado
  add constraint conta_email_verificado_metodo_check check (metodo in ('codigo'));

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

  -- Só a sessão aberta pelo código (ou link) enviado ao e-mail prova o endereço.
  if v_row.user_id is null and exists (
    select 1 from jsonb_array_elements(v_amr) a
    where a ->> 'method' in ('otp', 'magiclink')
  ) then
    insert into public.conta_email_verificado (user_id, email, metodo)
    values (v_uid, v_email, 'codigo')
    on conflict (user_id) do update
      set email = excluded.email, metodo = 'codigo', verificado_em = now()
    returning * into v_row;
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
