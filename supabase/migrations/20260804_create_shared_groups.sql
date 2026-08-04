begin;

create extension if not exists pgcrypto;

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 60),
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'editor', 'member')),
  display_name text not null default 'Kullanıcı',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.players add column if not exists group_id uuid references public.groups(id) on delete cascade;
alter table public.players add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.players add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.players add column if not exists updated_at timestamptz not null default now();

create index if not exists players_group_id_idx on public.players(group_id);
create index if not exists group_members_user_id_idx on public.group_members(user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists groups_touch_updated_at on public.groups;
create trigger groups_touch_updated_at before update on public.groups
for each row execute function public.touch_updated_at();

drop trigger if exists players_touch_updated_at on public.players;
create trigger players_touch_updated_at before update on public.players
for each row execute function public.touch_updated_at();

create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = target_group_id and user_id = auth.uid()
  );
$$;

create or replace function public.group_role(target_group_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.group_members
  where group_id = target_group_id and user_id = auth.uid();
$$;

create or replace function public.create_group(group_name text)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  created_group public.groups;
  member_name text;
begin
  if auth.uid() is null then raise exception 'Oturum açmanız gerekiyor.'; end if;
  if char_length(trim(group_name)) < 2 then raise exception 'Grup adı en az 2 karakter olmalıdır.'; end if;

  member_name := coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', split_part(auth.jwt() ->> 'email', '@', 1), 'Kullanıcı');
  insert into public.groups (name, owner_id) values (trim(group_name), auth.uid()) returning * into created_group;
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

  member_name := coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', split_part(auth.jwt() ->> 'email', '@', 1), 'Kullanıcı');
  insert into public.group_members (group_id, user_id, role, display_name)
  values (joined_group.id, auth.uid(), 'member', member_name)
  on conflict (group_id, user_id) do nothing;
  return joined_group;
end;
$$;

create or replace function public.set_group_member_role(target_group_id uuid, target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.group_role(target_group_id) <> 'owner' then raise exception 'Bu işlem için grup sahibi olmalısınız.'; end if;
  if new_role not in ('editor', 'member') then raise exception 'Geçersiz üye rolü.'; end if;
  if target_user_id = auth.uid() then raise exception 'Grup sahibi kendi rolünü değiştiremez.'; end if;
  update public.group_members set role = new_role
  where group_id = target_group_id and user_id = target_user_id and role <> 'owner';
end;
$$;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.players enable row level security;

do $$
declare policy_row record;
begin
  for policy_row in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('groups', 'group_members', 'players')
  loop
    execute format('drop policy if exists %I on public.%I', policy_row.policyname, policy_row.tablename);
  end loop;
end $$;

create policy groups_select_members on public.groups for select to authenticated
using (public.is_group_member(id));
create policy groups_update_owner on public.groups for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy group_members_select_members on public.group_members for select to authenticated
using (public.is_group_member(group_id));

create policy players_select_group on public.players for select to authenticated
using (
  (group_id is not null and public.is_group_member(group_id))
  or (group_id is null and user_id = auth.uid())
);
create policy players_insert_editors on public.players for insert to authenticated
with check (
  (group_id is not null and public.group_role(group_id) in ('owner', 'editor') and created_by = auth.uid())
  or (group_id is null and user_id = auth.uid())
);
create policy players_update_editors on public.players for update to authenticated
using (
  (group_id is not null and public.group_role(group_id) in ('owner', 'editor'))
  or (group_id is null and user_id = auth.uid())
)
with check (
  (group_id is not null and public.group_role(group_id) in ('owner', 'editor'))
  or (group_id is null and user_id = auth.uid())
);
create policy players_delete_editors on public.players for delete to authenticated
using (
  (group_id is not null and public.group_role(group_id) in ('owner', 'editor'))
  or (group_id is null and user_id = auth.uid())
);

revoke all on function public.create_group(text) from public;
revoke all on function public.join_group_by_code(text) from public;
revoke all on function public.set_group_member_role(uuid, uuid, text) from public;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group_by_code(text) to authenticated;
grant execute on function public.set_group_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.group_role(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'players'
  ) then
    alter publication supabase_realtime add table public.players;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'group_members'
  ) then
    alter publication supabase_realtime add table public.group_members;
  end if;
end $$;

commit;
