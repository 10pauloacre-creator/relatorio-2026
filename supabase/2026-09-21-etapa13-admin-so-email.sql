-- Etapa 13 (21/09/2026): administrador = SÓ a conta 10pauloacre@gmail.com.
--
-- Contexto: o RELATORIO SKIN abriu cadastro para professores (e-mail e Google)
-- no mesmo Supabase da Biblioteca Digital. Toda conta nova ganha uma linha em
-- profiles com role 'aluno' (handle_new_user). O gatilho profiles_trava_role já
-- impede que alguém se promova a 'admin', mas as checagens de admin confiavam
-- só na coluna role. Agora exigem as duas coisas: o e-mail do token E o papel.
-- Assim, nem um erro futuro em profiles dá acesso de administrador a outra conta.
--
-- Decisão do professor: por enquanto os novos usuários do RELATORIO SKIN não
-- têm nenhuma integração com a Biblioteca; alunos só os pré-cadastrados.

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce((select auth.email()), '') = '10pauloacre@gmail.com'
     and exists (
       select 1 from public.profiles
       where id = (select auth.uid()) and role = 'admin'
     );
$$;

create or replace function private.is_relatorio_admin()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce((select auth.email()), '') = '10pauloacre@gmail.com'
     and (select auth.uid()) is not null;
$$;

create or replace function public.bdm_e_professor()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select auth.uid() is not null
     and coalesce(auth.email(), '') = '10pauloacre@gmail.com';
$$;

-- Nenhuma outra conta pode ficar com role 'admin' em profiles.
update public.profiles p
   set role = 'aluno'
 where p.role = 'admin'
   and not exists (
     select 1 from auth.users u
     where u.id = p.id and lower(u.email) = '10pauloacre@gmail.com'
   );

-- ── Contas novas não entram na Biblioteca ───────────────────────────────
-- Até 21/09/2026 o gatilho criava um perfil 'aluno' para TODA conta nova do
-- Supabase Auth, então cada professor do RELATORIO SKIN aparecia como "aluno"
-- nos painéis da Biblioteca. Os alunos de verdade ficam em public.alunos
-- (pré-cadastro do professor) e não usam Supabase Auth. Agora só a conta do
-- administrador ganha perfil. O corpo abaixo é o mesmo de antes, com o retorno
-- antecipado para qualquer outro e-mail.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
DECLARE
  v_roster public.student_roster%ROWTYPE;
  v_norm   TEXT;
  v_escola_slug TEXT;
  v_grupo_slug  TEXT;
BEGIN
  IF lower(coalesce(NEW.email, '')) <> '10pauloacre@gmail.com' THEN
    RETURN NEW;
  END IF;

  v_norm := lower(trim(regexp_replace(public.unaccent(COALESCE(NEW.raw_user_meta_data->>'nome_completo', '')), '\s+', ' ', 'g')));
  v_escola_slug := NULLIF(NEW.raw_user_meta_data->>'escola_slug', '');
  v_grupo_slug := NULLIF(NEW.raw_user_meta_data->>'grupo_turma_slug', '');

  SELECT sr.*
    INTO v_roster
  FROM public.student_roster sr
  LEFT JOIN public.escolas e
    ON e.id = sr.escola_id
  LEFT JOIN public.grupos_turma gt
    ON gt.id = sr.grupo_turma_id
  WHERE sr.nome_normalizado = v_norm
    AND (
      v_escola_slug IS NULL
      OR e.slug = v_escola_slug
    )
    AND (
      v_grupo_slug IS NULL
      OR gt.slug = v_grupo_slug
    )
  ORDER BY escola_id NULLS LAST, numero_chamada NULLS LAST
  LIMIT 1;

  INSERT INTO public.profiles (
    id, nome_completo, role, serie, turma, numero_chamada,
    escola_id, grupo_turma_id, turma_original, segmento
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', ''),
    'admin',
    v_roster.serie, v_roster.turma_original, v_roster.numero_chamada,
    v_roster.escola_id, v_roster.grupo_turma_id, v_roster.turma_original, v_roster.segmento
  )
  ON CONFLICT (id) DO UPDATE
  SET
    nome_completo = EXCLUDED.nome_completo,
    serie = COALESCE(public.profiles.serie, EXCLUDED.serie),
    turma = COALESCE(public.profiles.turma, EXCLUDED.turma),
    numero_chamada = COALESCE(public.profiles.numero_chamada, EXCLUDED.numero_chamada),
    escola_id = COALESCE(public.profiles.escola_id, EXCLUDED.escola_id),
    grupo_turma_id = COALESCE(public.profiles.grupo_turma_id, EXCLUDED.grupo_turma_id),
    turma_original = COALESCE(public.profiles.turma_original, EXCLUDED.turma_original),
    segmento = COALESCE(public.profiles.segmento, EXCLUDED.segmento);

  RETURN NEW;
END;
$function$;

-- Ninguém além do administrador cria ou altera perfil pela API.
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id and (select auth.email()) = '10pauloacre@gmail.com');

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin on public.profiles
  for update to authenticated
  using ((select auth.email()) = '10pauloacre@gmail.com')
  with check ((select auth.email()) = '10pauloacre@gmail.com');

-- Perfil vazio criado pelo gatilho antigo para a conta de teste do RELATORIO
-- SKIN (valerian.lima03, role 'aluno', sem nome, sem mensagens, jogos nem
-- avisos ligados). A conta continua existindo no Relatório.
delete from public.profiles p
 using auth.users u
 where u.id = p.id
   and lower(u.email) <> '10pauloacre@gmail.com'
   and p.role = 'aluno'
   and coalesce(p.nome_completo, '') = ''
   and p.escola_id is null;
