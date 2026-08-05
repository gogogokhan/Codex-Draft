begin;

alter table public.group_members drop constraint if exists group_members_role_check;
alter table public.group_members add constraint group_members_role_check
  check (role in ('owner', 'admin', 'editor', 'member'));

alter table public.players add column if not exists linked_user_id uuid references auth.users(id) on delete cascade;
alter table public.players add column if not exists rating_status text not null default 'ready';
alter table public.players drop constraint if exists players_rating_status_check;
alter table public.players add constraint players_rating_status_check check (rating_status in ('pending', 'ready'));
update public.players set rating_status = 'ready' where rating_status is null;
create unique index if not exists players_group_linked_user_unique
  on public.players(group_id, linked_user_id) where group_id is not null and linked_user_id is not null;

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

  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if (select count(*) from public.group_members where user_id = auth.uid()) >= 3 then
    raise exception 'Aynı anda en fazla 3 topluluğa üye olabilirsiniz.';
  end if;
  if exists (
    select 1 from public.groups g join public.group_members gm on gm.group_id = g.id
    where gm.user_id = auth.uid() and lower(trim(g.name)) = lower(clean_name)
  ) then
    raise exception 'Bu isimde bir topluluğa zaten üyesiniz.';
  end if;

  member_name := coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', split_part(auth.jwt() ->> 'email', '@', 1), 'Kullanıcı');
  insert into public.groups (name, owner_id) values (clean_name, auth.uid()) returning * into created_group;
  insert into public.group_members (group_id, user_id, role, display_name)
  values (created_group.id, auth.uid(), 'owner', member_name);
  insert into public.players (user_id, group_id, created_by, updated_by, linked_user_id, name, overall, positions, rating_status)
  values (auth.uid(), created_group.id, auth.uid(), auth.uid(), auth.uid(), member_name, 50, array[]::text[], 'pending');
  return created_group;
end;
$$;

create or replace function public.join_group_by_code(join_code text)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  joined_group public.groups;
  member_name text;
begin
  if auth.uid() is null then raise exception 'Oturum açmanız gerekiyor.'; end if;
  select * into joined_group from public.groups where invite_code = upper(trim(join_code));
  if joined_group.id is null then raise exception 'Geçersiz veya süresi dolmuş davet kodu.'; end if;
  if exists (select 1 from public.group_members where group_id = joined_group.id and user_id = auth.uid()) then
    return joined_group;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if (select count(*) from public.group_members where user_id = auth.uid()) >= 3 then
    raise exception 'Aynı anda en fazla 3 topluluğa üye olabilirsiniz.';
  end if;

  member_name := coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', split_part(auth.jwt() ->> 'email', '@', 1), 'Kullanıcı');
  insert into public.group_members (group_id, user_id, role, display_name)
  values (joined_group.id, auth.uid(), 'member', member_name);
  insert into public.players (user_id, group_id, created_by, updated_by, linked_user_id, name, overall, positions, rating_status)
  values (auth.uid(), joined_group.id, auth.uid(), auth.uid(), auth.uid(), member_name, 50, array[]::text[], 'pending')
  on conflict (group_id, linked_user_id) where group_id is not null and linked_user_id is not null do nothing;
  return joined_group;
end;
$$;

create or replace function public.set_group_member_role(target_group_id uuid, target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  target_role text;
begin
  caller_role := public.group_role(target_group_id);
  select role into target_role from public.group_members where group_id = target_group_id and user_id = target_user_id;
  if caller_role not in ('owner', 'admin') then raise exception 'Bu işlem için Admin yetkisi gerekiyor.'; end if;
  if new_role not in ('admin', 'editor', 'member') then raise exception 'Geçersiz üye rolü.'; end if;
  if target_role = 'owner' then raise exception 'Kurucu Admin rolü değiştirilemez.'; end if;
  if target_user_id = auth.uid() then raise exception 'Kendi rolünüzü değiştiremezsiniz.'; end if;
  update public.group_members set role = new_role where group_id = target_group_id and user_id = target_user_id;
end;
$$;

create or replace function public.rename_group(target_group_id uuid, new_name text)
returns void language plpgsql security definer set search_path = public as $$
declare clean_name text;
begin
  if public.group_role(target_group_id) not in ('owner', 'admin', 'editor') then raise exception 'Bu işlem için Moderatör yetkisi gerekiyor.'; end if;
  clean_name := trim(new_name);
  if char_length(clean_name) < 2 or char_length(clean_name) > 60 then raise exception 'Topluluk adı 2 ile 60 karakter arasında olmalıdır.'; end if;
  if exists (select 1 from public.groups where id <> target_group_id and lower(trim(name)) = lower(clean_name)) then
    raise exception 'Bu isimde başka bir topluluk zaten bulunuyor.';
  end if;
  update public.groups set name = clean_name where id = target_group_id;
end;
$$;

create or replace function public.delete_group(target_group_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.group_role(target_group_id) not in ('owner', 'admin') then raise exception 'Topluluğu yalnızca Admin silebilir.'; end if;
  delete from public.groups where id = target_group_id;
end;
$$;

create or replace function public.remove_group_member(target_group_id uuid, target_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare caller_role text; target_role text;
begin
  caller_role := public.group_role(target_group_id);
  select role into target_role from public.group_members where group_id = target_group_id and user_id = target_user_id;
  if caller_role not in ('owner', 'admin', 'editor') then raise exception 'Bu işlem için Moderatör yetkisi gerekiyor.'; end if;
  if target_role = 'owner' then raise exception 'Kurucu Admin topluluktan çıkarılamaz.'; end if;
  if caller_role = 'editor' and target_role in ('admin', 'editor') then raise exception 'Moderatör, Admin veya Moderatör çıkaramaz.'; end if;
  if target_user_id = auth.uid() then raise exception 'Kendinizi topluluktan çıkaramazsınız.'; end if;
  delete from public.players where group_id = target_group_id and linked_user_id = target_user_id;
  delete from public.group_members where group_id = target_group_id and user_id = target_user_id;
end;
$$;

drop policy if exists players_insert_editors on public.players;
drop policy if exists players_update_editors on public.players;
drop policy if exists players_delete_editors on public.players;
create policy players_insert_editors on public.players for insert to authenticated with check (
  (group_id is not null and public.group_role(group_id) in ('owner', 'admin', 'editor') and created_by = auth.uid())
  or (group_id is null and user_id = auth.uid())
);
create policy players_update_editors on public.players for update to authenticated using (
  (group_id is not null and public.group_role(group_id) in ('owner', 'admin', 'editor')) or (group_id is null and user_id = auth.uid())
) with check (
  (group_id is not null and public.group_role(group_id) in ('owner', 'admin', 'editor')) or (group_id is null and user_id = auth.uid())
);
create policy players_delete_editors on public.players for delete to authenticated using (
  (group_id is not null and public.group_role(group_id) in ('owner', 'admin', 'editor')) or (group_id is null and user_id = auth.uid())
);

revoke all on function public.remove_group_member(uuid, uuid) from public;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group_by_code(text) to authenticated;
grant execute on function public.set_group_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.rename_group(uuid, text) to authenticated;
grant execute on function public.delete_group(uuid) to authenticated;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;

commit;
