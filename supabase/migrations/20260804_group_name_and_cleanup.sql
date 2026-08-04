begin;

create or replace function public.create_group(group_name text)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  created_group public.groups;
  member_name text;
  clean_name text;
begin
  if auth.uid() is null then raise exception 'Oturum açmanız gerekiyor.'; end if;
  clean_name := trim(group_name);
  if char_length(clean_name) < 2 then raise exception 'Grup adı en az 2 karakter olmalıdır.'; end if;

  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || lower(clean_name), 0));
  if exists (
    select 1
    from public.groups g
    join public.group_members gm on gm.group_id = g.id
    where gm.user_id = auth.uid() and lower(trim(g.name)) = lower(clean_name)
  ) then
    raise exception 'Bu isimle daha önce bir grup oluşturdunuz veya bu isimde bir gruba zaten üyesiniz.';
  end if;

  member_name := coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', split_part(auth.jwt() ->> 'email', '@', 1), 'Kullanıcı');
  insert into public.groups (name, owner_id) values (clean_name, auth.uid()) returning * into created_group;
  insert into public.group_members (group_id, user_id, role, display_name)
  values (created_group.id, auth.uid(), 'owner', member_name);

  update public.players
  set group_id = created_group.id,
      created_by = coalesce(created_by, user_id, auth.uid()),
      updated_by = auth.uid()
  where group_id is null and user_id = auth.uid();

  return created_group;
end;
$$;

create or replace function public.delete_empty_group(target_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Oturum açmanız gerekiyor.'; end if;
  if not exists (
    select 1 from public.groups where id = target_group_id and owner_id = auth.uid()
  ) then
    raise exception 'Bu grubu silmek için grup sahibi olmalısınız.';
  end if;
  if exists (select 1 from public.players where group_id = target_group_id) then
    raise exception 'Oyuncu bulunan bir grup silinemez.';
  end if;
  if (select count(*) from public.group_members where group_id = target_group_id) > 1 then
    raise exception 'Başka üyeleri bulunan bir grup silinemez.';
  end if;

  delete from public.groups where id = target_group_id and owner_id = auth.uid();
end;
$$;

revoke all on function public.delete_empty_group(uuid) from public;
grant execute on function public.delete_empty_group(uuid) to authenticated;

commit;
