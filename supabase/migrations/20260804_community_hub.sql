begin;

create or replace function public.rename_group(target_group_id uuid, new_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text;
begin
  if auth.uid() is null then raise exception 'Oturum açmanız gerekiyor.'; end if;
  if not exists (
    select 1 from public.groups where id = target_group_id and owner_id = auth.uid()
  ) then
    raise exception 'Topluluğun adını yalnızca kurucu değiştirebilir.';
  end if;

  clean_name := trim(new_name);
  if char_length(clean_name) < 2 or char_length(clean_name) > 60 then
    raise exception 'Topluluk adı 2 ile 60 karakter arasında olmalıdır.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || lower(clean_name), 0));
  if exists (
    select 1
    from public.groups g
    join public.group_members gm on gm.group_id = g.id
    where gm.user_id = auth.uid()
      and g.id <> target_group_id
      and lower(trim(g.name)) = lower(clean_name)
  ) then
    raise exception 'Bu isimde başka bir topluluğa zaten üyesiniz.';
  end if;

  update public.groups set name = clean_name where id = target_group_id;
end;
$$;

create or replace function public.delete_group(target_group_id uuid)
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
    raise exception 'Topluluğu yalnızca kurucu silebilir.';
  end if;

  delete from public.groups where id = target_group_id and owner_id = auth.uid();
end;
$$;

revoke all on function public.rename_group(uuid, text) from public;
revoke all on function public.delete_group(uuid) from public;
grant execute on function public.rename_group(uuid, text) to authenticated;
grant execute on function public.delete_group(uuid) to authenticated;

commit;
