-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPA 18 (26/09/2026) — Correções de segurança da auditoria
-- ───────────────────────────────────────────────────────────────────────────
-- Rodar UMA vez no SQL Editor do Supabase (projeto vgceathgwvtmjxbdpecr),
-- depois das etapas 9–17. Idempotente. Regras em SEGURANCA.md.
-- Testado em Postgres 16 com as etapas 9, 12, 14, 15, 15B e 17 reais
-- (ambiente que imita o Supabase: papéis anon/authenticated, auth.uid()).
--
--  1. AEE: quem entra pelo código não escolhe mais a própria função quando o
--     aluno já tem mediador ou professor do AEE (entra como regente; a equipe
--     libera outra função pela aba Equipe). Código com gerador criptográfico,
--     troca de código, gestão da equipe só por mediador/AEE.
--  2. AEE: autor, função e disciplina dos registros carimbados pelo banco;
--     registro não muda de aluno; documento só na pasta do próprio aluno;
--     foto só como imagem embutida (sem URL externa que rastreia IP).
--  3. E-mail verificado: trocar o e-mail da conta invalida a verificação e
--     exige um código novo enviado ao endereço novo.
--  4. Senha de confirmação: 5 erros seguidos bloqueiam por 15 minutos.
--  5. Limites contra spam/abuso: eventos do funil de visitantes, leads,
--     pedidos de assinatura, espaço por conta em professor_dados e teto
--     diário global da I.A. da plataforma.
--  6. Assinaturas: o webhook só ativa pedido com valor pago >= valor do
--     pedido; indicação recusa a mesma caixa de e-mail (pontos/+tag).
--  7. Permissões: visitante (anon) sem acesso a funções que não são dele.
--
-- Para desfazer um item, rode de novo a definição da etapa original
-- (15, 15B, 14 ou 17) da função correspondente.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. AEE: vínculo pelo código sem escalada de função ─────────────────────

-- Mediador ou professor do AEE do aluno: quem gerencia a equipe.
create or replace function private.aee_gestor(p_aluno uuid)
returns boolean language sql stable security definer set search_path to ''
as $$
  select exists (select 1 from public.aee_vinculos v where v.aluno_id = p_aluno and v.user_id = (select auth.uid())
                  and v.papel in ('mediador','aee'));
$$;
revoke all on function private.aee_gestor(uuid) from public, anon;
grant execute on function private.aee_gestor(uuid) to authenticated;

-- Código com bytes aleatórios criptográficos (antes: random()).
create or replace function private.aee_novo_codigo()
returns text language plpgsql volatile set search_path to ''
as $$
declare
  alfabeto constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  b bytea;
  v text;
begin
  loop
    b := extensions.gen_random_bytes(8);
    v := 'AEE-';
    for i in 0..7 loop
      v := v || substr(alfabeto, 1 + (get_byte(b, i) % 31), 1);
      if i = 3 then v := v || '-'; end if;
    end loop;
    exit when not exists (select 1 from public.aee_alunos where codigo = v);
  end loop;
  return v;
end;
$$;
revoke all on function private.aee_novo_codigo() from public, anon, authenticated;

-- Entra no perfil pelo código. Se o aluno já tem mediador/AEE, a pessoa entra
-- como regente (lê o perfil e escreve os próprios registros); a função pedida
-- é liberada por um mediador/AEE na aba Equipe (aee_definir_papel).
-- Quem já é vinculado não muda a própria função por aqui.
create or replace function public.aee_vincular(p_codigo text, p_papel text, p_escola_local text, p_nome_profissional text, p_disciplina text default null)
returns public.aee_alunos
language plpgsql security definer set search_path to ''
as $$
declare
  v       public.aee_alunos;
  v_uid   uuid := (select auth.uid());
  v_papel text;
begin
  if v_uid is null then raise exception 'Entre na conta.'; end if;
  if p_papel not in ('mediador','assistente','aee','regente') then raise exception 'Papel inválido.'; end if;
  select * into v from public.aee_alunos where codigo = upper(trim(coalesce(p_codigo, '')));
  if v.id is null then raise exception 'Código não encontrado. Confira com quem cadastrou o aluno.'; end if;
  v_papel := case
    when exists (select 1 from public.aee_vinculos x where x.aluno_id = v.id and x.user_id <> v_uid and x.papel in ('mediador','aee'))
      then 'regente'
    else p_papel end;
  insert into public.aee_vinculos (aluno_id, user_id, papel, escola_local, nome_profissional, disciplina)
  values (v.id, v_uid, v_papel, left(p_escola_local, 80), left(p_nome_profissional, 120), nullif(left(p_disciplina, 80), ''))
  on conflict (aluno_id, user_id) do update
    set escola_local = excluded.escola_local,
        nome_profissional = excluded.nome_profissional,
        disciplina = coalesce(excluded.disciplina, public.aee_vinculos.disciplina);
  return v;
end;
$$;
revoke all on function public.aee_vincular(text, text, text, text, text) from public, anon;
grant execute on function public.aee_vincular(text, text, text, text, text) to authenticated;

-- Mediador/AEE define a função de alguém da equipe. O aluno nunca fica sem
-- ao menos um mediador ou professor do AEE.
create or replace function public.aee_definir_papel(p_aluno uuid, p_user uuid, p_papel text)
returns boolean
language plpgsql security definer set search_path to ''
as $$
begin
  if p_papel not in ('mediador','assistente','aee','regente') then raise exception 'Papel inválido.'; end if;
  if not private.aee_gestor(p_aluno) then
    raise exception 'Só o mediador ou o professor do AEE definem funções.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.aee_vinculos where aluno_id = p_aluno and user_id = p_user) then
    raise exception 'A pessoa não está na equipe deste aluno.';
  end if;
  if p_papel not in ('mediador','aee') and not exists (
    select 1 from public.aee_vinculos where aluno_id = p_aluno and user_id <> p_user and papel in ('mediador','aee')) then
    raise exception 'O aluno precisa de ao menos um mediador ou professor do AEE.';
  end if;
  update public.aee_vinculos set papel = p_papel where aluno_id = p_aluno and user_id = p_user;
  return true;
end;
$$;
revoke all on function public.aee_definir_papel(uuid, uuid, text) from public, anon;
grant execute on function public.aee_definir_papel(uuid, uuid, text) to authenticated;

-- Mediador/AEE troca o código (ex.: vazou num papel impresso). Quem já está na
-- equipe continua; o código antigo deixa de funcionar.
create or replace function public.aee_trocar_codigo(p_aluno uuid)
returns text
language plpgsql security definer set search_path to ''
as $$
declare c text;
begin
  if not private.aee_gestor(p_aluno) then
    raise exception 'Só o mediador ou o professor do AEE trocam o código.' using errcode = '42501';
  end if;
  update public.aee_alunos set codigo = private.aee_novo_codigo() where id = p_aluno returning codigo into c;
  return c;
end;
$$;
revoke all on function public.aee_trocar_codigo(uuid) from public, anon;
grant execute on function public.aee_trocar_codigo(uuid) to authenticated;

-- Quem remove alguém da equipe: a própria pessoa ou um mediador/AEE.
drop policy if exists aee_vinculos_sair on public.aee_vinculos;
create policy aee_vinculos_sair on public.aee_vinculos for delete to authenticated
  using (user_id = (select auth.uid()) or (select private.aee_gestor(aluno_id)));

-- ── 2. AEE: registros, documentos e foto ───────────────────────────────────

-- O banco carimba quem escreveu e com que função; o navegador não escolhe.
create or replace function private.aee_carimbar_registro()
returns trigger language plpgsql security definer set search_path to ''
as $$
declare v public.aee_vinculos;
begin
  if (select auth.uid()) is null then return new; end if;  -- manutenção pelo SQL Editor / service_role
  if tg_op = 'UPDATE' and new.aluno_id is distinct from old.aluno_id then
    raise exception 'O registro não pode mudar de aluno.' using errcode = '42501';
  end if;
  select * into v from public.aee_vinculos where aluno_id = new.aluno_id and user_id = (select auth.uid());
  if v.user_id is null then raise exception 'Sem vínculo com este aluno.' using errcode = '42501'; end if;
  new.user_id := v.user_id;
  new.papel := v.papel;
  new.autor := left(coalesce(nullif(v.nome_profissional, ''), new.autor), 120);
  if new.tipo = 'nota' and v.papel = 'regente' and v.disciplina is not null
     and new.disciplina is distinct from v.disciplina then
    raise exception 'O professor regente lança nota só da própria disciplina (%).', v.disciplina using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.aee_carimbar_registro() from public, anon, authenticated;
drop trigger if exists aee_registros_carimbar on public.aee_registros;
create trigger aee_registros_carimbar before insert or update on public.aee_registros
  for each row execute function private.aee_carimbar_registro();

-- Documento só na pasta do próprio aluno (<aluno_id>/…).
drop policy if exists aee_documentos_criar on public.aee_documentos;
create policy aee_documentos_criar on public.aee_documentos for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.aee_vinculado(aluno_id))
              and split_part(caminho, '/', 1) = aluno_id::text);

-- Foto só como imagem embutida (data:image/…), nunca URL externa.
alter table public.aee_alunos drop constraint if exists aee_alunos_foto_embutida;
alter table public.aee_alunos add constraint aee_alunos_foto_embutida
  check (foto is null or foto like 'data:image/%') not valid;

-- ── 3. E-mail verificado ───────────────────────────────────────────────────
-- Quando o e-mail da conta muda, a verificação antiga cai e o código usado
-- antes da troca não vale para o endereço novo.
create table if not exists private.conta_email_trocado (
  user_id uuid primary key,
  em      timestamptz not null
);
revoke all on private.conta_email_trocado from public, anon, authenticated;

create or replace function private.trg_conta_email_trocado()
returns trigger language plpgsql security definer set search_path to ''
as $$
begin
  if new.email is distinct from old.email then
    insert into private.conta_email_trocado (user_id, em) values (new.id, now())
    on conflict (user_id) do update set em = excluded.em;
    delete from public.conta_email_verificado where user_id = new.id;
  end if;
  return null;
end;
$$;
revoke all on function private.trg_conta_email_trocado() from public, anon, authenticated;
drop trigger if exists trg_conta_email_trocado on auth.users;
create trigger trg_conta_email_trocado after update of email on auth.users
  for each row execute function private.trg_conta_email_trocado();

create or replace function public.conta_email_status()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_email  text;
  v_row    public.conta_email_verificado%rowtype;
  v_amr    jsonb := coalesce((select auth.jwt()) -> 'amr', '[]'::jsonb);
  v_troca  timestamptz;
begin
  if v_uid is null then
    return null;
  end if;

  select lower(u.email) into v_email from auth.users u where u.id = v_uid;
  select t.em into v_troca from private.conta_email_trocado t where t.user_id = v_uid;

  select * into v_row from public.conta_email_verificado c where c.user_id = v_uid;
  -- Trocou o e-mail da conta: a verificação antiga não vale para o novo.
  if v_row.user_id is not null and v_row.email <> v_email then
    delete from public.conta_email_verificado where user_id = v_uid;
    v_row := null;
  end if;

  -- Só a sessão aberta pelo código (ou link) enviado ao e-mail ATUAL prova o
  -- endereço: o código precisa ser posterior à última troca de e-mail.
  if v_row.user_id is null and exists (
    select 1 from jsonb_array_elements(v_amr) a
    where a ->> 'method' in ('otp', 'magiclink')
      and (v_troca is null
           or (a ->> 'timestamp') ~ '^[0-9]+$' and to_timestamp((a ->> 'timestamp')::bigint) > v_troca)
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

-- ── 4. Senha de confirmação com limite de tentativas ───────────────────────
create table if not exists private.conta_senha_tentativas (
  user_id       uuid primary key,
  falhas        int not null default 0,
  bloqueado_ate timestamptz
);
revoke all on private.conta_senha_tentativas from public, anon, authenticated;

create or replace function public.conta_verificar_senha(p_senha text)
returns boolean
language plpgsql volatile security definer set search_path to ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_hash text;
  v_t    private.conta_senha_tentativas%rowtype;
  v_ok   boolean;
begin
  if v_uid is null then return false; end if;
  select u.encrypted_password into v_hash from auth.users u where u.id = v_uid;
  if coalesce(v_hash, '') = '' then return null; end if;  -- conta só do Google: a página pede o e-mail
  select * into v_t from private.conta_senha_tentativas where user_id = v_uid;
  if v_t.bloqueado_ate is not null and v_t.bloqueado_ate > now() then
    raise exception 'Muitas tentativas com a senha errada. Tente de novo depois das %.',
      to_char(v_t.bloqueado_ate at time zone 'America/Rio_Branco', 'HH24:MI') using errcode = '42501';
  end if;
  v_ok := v_hash = extensions.crypt(coalesce(p_senha, ''), v_hash);
  if v_ok then
    delete from private.conta_senha_tentativas where user_id = v_uid;
  else
    insert into private.conta_senha_tentativas as t (user_id, falhas) values (v_uid, 1)
    on conflict (user_id) do update
      set falhas = case when t.bloqueado_ate is not null and t.bloqueado_ate <= now() then 1 else t.falhas + 1 end,
          bloqueado_ate = case when t.bloqueado_ate is not null and t.bloqueado_ate <= now() then null
                               when t.falhas + 1 >= 5 then now() + interval '15 minutes' else t.bloqueado_ate end;
  end if;
  return v_ok;
end;
$$;
revoke all on function public.conta_verificar_senha(text) from public, anon;
grant execute on function public.conta_verificar_senha(text) to authenticated;

-- ── 5. Limites contra spam e abuso ─────────────────────────────────────────

-- Eventos do funil. Visitante (sem conta): no máximo 60 por minuto no total.
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
  if v_uid is null and (select count(*) from private.plano_eventos where user_id is null and em > now() - interval '1 minute') >= 60 then
    return false;
  end if;
  insert into private.plano_eventos (user_id, evento, dados)
  values (v_uid, p_evento, case when length(coalesce(p_dados, '{}'::jsonb)::text) > 1000 or jsonb_typeof(coalesce(p_dados, '{}'::jsonb)) <> 'object'
                                then '{}'::jsonb else coalesce(p_dados, '{}'::jsonb) end);
  return true;
end;
$$;
revoke all on function public.plano_evento(text, jsonb) from public;
grant execute on function public.plano_evento(text, jsonb) to anon, authenticated; -- seguranca:ok funil da página pública de planos, com limite por minuto

-- Leads de escolas: além do limite por e-mail, no máximo 30 por hora no total.
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
  if (select count(*) from private.leads_escolas where criado_em > now() - interval '1 hour') >= 30 then
    return jsonb_build_object('ok', false, 'motivo', 'tente-mais-tarde');
  end if;
  insert into private.leads_escolas (nome, email, telefone, escola, cargo, municipio, uf, professores, mensagem, aceita_contato, origem, user_id)
  values (left(btrim(p_nome), 120), left(v_email, 160), left(regexp_replace(coalesce(p_telefone, ''), '[^\d+() -]', '', 'g'), 30),
          left(coalesce(p_escola, ''), 160), left(coalesce(p_cargo, ''), 80), left(coalesce(p_municipio, ''), 80), left(upper(coalesce(p_uf, '')), 2),
          greatest(0, least(coalesce(p_professores, 0), 100000)), left(coalesce(p_mensagem, ''), 1500), coalesce(p_aceita_contato, false),
          left(coalesce(p_origem, ''), 40), (select auth.uid()));
  insert into private.plano_eventos (user_id, evento, dados) values ((select auth.uid()), 'lead_escola', jsonb_build_object('uf', left(upper(coalesce(p_uf, '')), 2), 'professores', p_professores));
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.lead_escola_registrar(text, text, text, text, text, text, text, int, text, boolean, text) from public;
grant execute on function public.lead_escola_registrar(text, text, text, text, text, text, text, int, text, boolean, text) to anon, authenticated; -- seguranca:ok formulário público de escolas, com limite por e-mail e por hora

-- Pedido de assinatura: só os campos conhecidos de p_dados e até 20 por dia.
create or replace function private.plano_pedido_dados(p_dados jsonb)
returns jsonb language sql immutable set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'termos_versao', left(coalesce(p_dados, '{}'::jsonb) ->> 'termos_versao', 20),
    'termos_aceite_em', case when (coalesce(p_dados, '{}'::jsonb) ->> 'termos_aceite_em') ~ '^\d{4}-\d{2}-\d{2}T[0-9:.]+Z?$' then left(p_dados ->> 'termos_aceite_em', 30) end,
    'pagina',        left(coalesce(p_dados, '{}'::jsonb) ->> 'pagina', 80),
    'consent_email', case when (coalesce(p_dados, '{}'::jsonb) ->> 'consent_email') in ('true','false') then (p_dados ->> 'consent_email')::boolean end,
    'consent_whatsapp', case when (coalesce(p_dados, '{}'::jsonb) ->> 'consent_whatsapp') in ('true','false') then (p_dados ->> 'consent_whatsapp')::boolean end,
    'aceite_servidor', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')))
$$;
revoke all on function private.plano_pedido_dados(jsonb) from public, anon;

create or replace function private.trg_plano_pedido_limites()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.assinatura_pedidos p where p.user_id = new.user_id and p.criado_em > now() - interval '1 day') >= 20 then
    raise exception 'Muitos pedidos hoje. Tente de novo amanhã ou fale com o suporte.' using errcode = '54000';
  end if;
  new.dados := private.plano_pedido_dados(new.dados);
  return new;
end;
$$;
revoke all on function private.trg_plano_pedido_limites() from public, anon, authenticated;
drop trigger if exists trg_plano_pedido_limites on public.assinatura_pedidos;
create trigger trg_plano_pedido_limites before insert on public.assinatura_pedidos
  for each row execute function private.trg_plano_pedido_limites();

-- Espaço por conta em professor_dados: até 40 escopos e 50 MB (o de cada
-- escopo continua 4 MB). O administrador não tem limite.
create or replace function private.professor_dados_cota()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  n int;
  t bigint;
begin
  if coalesce((select auth.email()) = '10pauloacre@gmail.com', false) then return new; end if;
  select count(*), coalesce(sum(pg_column_size(d.payload)), 0) into n, t
    from public.professor_dados d where d.user_id = new.user_id and d.scope_key <> new.scope_key;
  if n >= 40 then raise exception 'Limite de áreas de dados da conta atingido.' using errcode = '54000'; end if;
  if t + pg_column_size(new.payload) > 50 * 1024 * 1024 then
    raise exception 'Limite de armazenamento da conta atingido (50 MB).' using errcode = '54000';
  end if;
  return new;
end;
$$;
revoke all on function private.professor_dados_cota() from public, anon, authenticated;
drop trigger if exists professor_dados_cota on public.professor_dados;
create trigger professor_dados_cota before insert or update of payload on public.professor_dados
  for each row execute function private.professor_dados_cota();

-- Teto diário GLOBAL da I.A. da plataforma (protege o crédito pago do
-- OpenRouter contra muitas contas criadas de uma vez). Ajuste em
-- planos_config.ia_teto_global_dia. O administrador não conta.
insert into public.planos_config (chave, valor) values ('ia_teto_global_dia', '3000')
on conflict (chave) do nothing;

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
  v_teto   int := coalesce(nullif(private.plano_cfg('ia_teto_global_dia') #>> '{}', '')::int, 3000);
begin
  if uid is null then return jsonb_build_object('ok', false, 'motivo', 'sem-conta'); end if;
  if private.skin_admin() then return jsonb_build_object('ok', true, 'ilimitado', true); end if;
  -- Diário criado pela I.A. conta como diário (a página confere o plano ao salvar).
  if v_tipo = 'diarios' then return jsonb_build_object('ok', true, 'ilimitado', true, 'recurso', 'diario'); end if;

  if (select coalesce(sum(u.pedidos), 0) from private.ia_uso u where u.dia = private.hoje_acre()) >= v_teto then
    return jsonb_build_object('ok', false, 'motivo', 'teto-global', 'periodo', 'dia', 'restante', 0, 'ilimitado', false);
  end if;

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
  else
    insert into private.ia_uso as u (user_id, dia, tipo, pedidos)
    values (uid, private.hoje_acre(), v_tipo, 1)
    on conflict (user_id, dia, tipo) do update set pedidos = u.pedidos + 1;
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

-- ── 6. Assinaturas e indicação ─────────────────────────────────────────────

-- Webhook do gateway: só ativa se o valor pago cobre o pedido.
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
  if v_ped.status in ('falhou', 'expirado') then
    raise exception 'Pedido % não pode ser ativado (%).', v_ped.codigo, v_ped.status;
  end if;
  if p_valor is null or round(p_valor, 2) < v_ped.valor_primeira then
    insert into private.plano_eventos (user_id, evento, dados)
    values (v_ped.user_id, 'pagamento_divergente', jsonb_build_object('pedido', v_ped.codigo, 'esperado', v_ped.valor_primeira, 'pago', p_valor));
    raise exception 'Valor pago (%) menor que o do pedido % (%).', p_valor, v_ped.codigo, v_ped.valor_primeira;
  end if;
  update public.assinatura_pedidos set status = 'pago', gateway = p_gateway, gateway_id = p_gateway_id, atualizado_em = now()
   where id = v_ped.id;
  -- Troca de plano: a assinatura paga anterior encerra.
  update public.assinaturas set status = 'cancelada', cancelada_em = now(), fim = now(), atualizado_em = now()
   where user_id = v_ped.user_id and origem = 'pagamento' and status = 'ativa';
  insert into public.assinaturas (user_id, plano, ciclo, status, origem, inicio, fim, valor, pedido_id, gateway, gateway_assinatura)
  values (v_ped.user_id, v_ped.plano, v_ped.ciclo, 'ativa', 'pagamento', now(),
          now() + case when v_ped.ciclo = 'anual' then interval '1 year' else interval '1 month' end,
          round(p_valor, 2), v_ped.id, p_gateway, p_gateway_id)
  returning id into v_id;
  insert into private.plano_eventos (user_id, evento, dados)
  values (v_ped.user_id, 'assinatura_ativada', jsonb_build_object('plano', v_ped.plano, 'ciclo', v_ped.ciclo, 'valor', round(p_valor, 2)));
  return v_id;
end;
$$;
revoke all on function private.plano_ativar_pedido(uuid, text, text, numeric) from public, anon, authenticated;

-- E-mail "canônico": gmail sem pontos e sem +tag (mesma caixa de entrada).
create or replace function private.email_canonico(p_email text)
returns text language sql immutable set search_path = ''
as $$
  select case
    when split_part(lower(btrim(coalesce(p_email, ''))), '@', 2) in ('gmail.com', 'googlemail.com')
      then replace(split_part(split_part(lower(btrim(p_email)), '@', 1), '+', 1), '.', '') || '@gmail.com'
    else split_part(split_part(lower(btrim(coalesce(p_email, ''))), '@', 1), '+', 1) || '@' || split_part(lower(btrim(coalesce(p_email, ''))), '@', 2)
  end
$$;
revoke all on function private.email_canonico(text) from public, anon;

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
  if (select private.email_canonico(email) from auth.users where id = v_dono)
     = (select private.email_canonico(email) from auth.users where id = p_user) then
    return jsonb_build_object('ok', false, 'motivo', 'proprio-codigo');
  end if;
  if exists (select 1 from public.indicacoes where indicado = p_user) then return jsonb_build_object('ok', false, 'motivo', 'ja-indicado'); end if;
  select created_at into v_criada from auth.users where id = p_user;
  if v_criada < now() - make_interval(days => v_janela) then return jsonb_build_object('ok', false, 'motivo', 'conta-antiga'); end if;
  insert into public.indicacoes (indicador, indicado, codigo) values (v_dono, p_user, v_cod) on conflict (indicado) do nothing;
  insert into private.plano_eventos (user_id, evento, dados) values (p_user, 'indicacao_registrada', jsonb_build_object('codigo', v_cod, 'origem', left(p_origem, 40)));
  perform private.indicacao_confirmar(p_user);
  return jsonb_build_object('ok', true, 'status', (select status from public.indicacoes where indicado = p_user));
end;
$$;
revoke all on function private.indicacao_registrar_de(uuid, text, text) from public, anon, authenticated;

-- ── 7. Permissões: visitante (anon) só no que é público de propósito ───────
-- O Supabase dá EXECUTE a anon em toda função nova do schema public; estas
-- exigem conta e passam a recusar o visitante já na entrada.
do $$
declare f text;
begin
  foreach f in array array[
    'public.plano_cancelar_pedido(uuid)', 'public.indicacao_meu_codigo()', 'public.indicacao_registrar(text)',
    'public.consentimento_registrar(text, boolean, text, text)', 'public.plano_painel_admin(int)',
    'public.ia_consumir_cota(text, integer)', 'public.ia_consumir_cota(integer)', 'public.ia_saldo(text, integer)',
    'public.plano_consumir(text, text, date, int)', 'public.plano_status(date)', 'public.plano_criar_pedido(text, text, text, jsonb)',
    'public.conta_excluir(text, text)', 'public.aee_criar_aluno(jsonb, text, text, text)', 'public.aee_excluir_aluno(uuid, text, text)'
  ] loop
    if to_regprocedure(f) is not null then
      execute format('revoke all on function %s from public, anon', f);
      execute format('grant execute on function %s to authenticated', f);
    end if;
  end loop;
  -- Funções internas (schema private): nunca para visitante.
  foreach f in array array[
    'private.plano_efetivo(uuid)', 'private.plano_uso_resumo(uuid, date)', 'private.indicacao_novo_codigo(uuid)',
    'private.plano_cfg(text)', 'private.skin_admin()', 'private.ia_limite(uuid, text, integer)',
    'private.relatorio_escola_excluida(uuid)', 'private.plano_rank(text)', 'private.hoje_acre()', 'private.mes_acre_inicio()'
  ] loop
    if to_regprocedure(f) is not null then
      execute format('revoke all on function %s from public, anon', f);
      execute format('grant execute on function %s to authenticated', f);
    end if;
  end loop;
end;
$$;

-- ── Conferência (rode e olhe o resultado; nada aqui muda dados) ────────────
-- Funções security definer que o visitante ainda pode chamar (devem ser só
-- as públicas de propósito: plano_evento, lead_escola_registrar,
-- get_meu_boletim, relatorio_individual e as da Biblioteca):
--   select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname in ('public','private') and p.prosecdef and has_function_privilege('anon', p.oid, 'execute');
-- Tabelas do public sem RLS (devem ser zero):
--   select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
--    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
-- Policies liberando tudo (conferir uma a uma):
--   select schemaname, tablename, policyname, roles, cmd, qual, with_check from pg_policies
--    where schemaname in ('public','storage') and (qual in ('true','(true)') or with_check in ('true','(true)'));
