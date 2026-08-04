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
  if char_length(clean_name) < 2 then raise exception 'Topluluk adı en az 2 karakter olmalıdır.'; end if;

  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || lower(clean_name), 0));
  if exists (
    select 1
    from public.groups g
    join public.group_members gm on gm.group_id = g.id
    where gm.user_id = auth.uid() and lower(trim(g.name)) = lower(clean_name)
  ) then
    raise exception 'Bu isimde bir topluluğa zaten üyesiniz.';
  end if;

  member_name := coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', split_part(auth.jwt() ->> 'email', '@', 1), 'Kullanıcı');
  insert into public.groups (name, owner_id) values (clean_name, auth.uid()) returning * into created_group;
  insert into public.group_members (group_id, user_id, role, display_name)
  values (created_group.id, auth.uid(), 'owner', member_name);

  return created_group;
end;
$$;

revoke all on function public.create_group(text) from public;
grant execute on function public.create_group(text) to authenticated;

commit;
