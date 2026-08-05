begin;

create table if not exists public.community_match_states (
  group_id uuid primary key references public.groups(id) on delete cascade,
  team_config jsonb not null default '{"teamSize":7,"formation":"1-2-3-1","teamAName":"Codex Red","teamBName":"Codex Blue"}'::jsonb,
  attendance jsonb not null default '[]'::jsonb,
  draft_mode text not null default 'overall' check (draft_mode in ('overall', 'positional', 'random')),
  draft_result jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.community_match_states enable row level security;
grant select, insert, update on table public.community_match_states to authenticated;

drop policy if exists community_match_states_select_members on public.community_match_states;
drop policy if exists community_match_states_insert_managers on public.community_match_states;
drop policy if exists community_match_states_update_managers on public.community_match_states;

create policy community_match_states_select_members
on public.community_match_states for select to authenticated
using (public.is_group_member(group_id));

create policy community_match_states_insert_managers
on public.community_match_states for insert to authenticated
with check (
  public.group_role(group_id) in ('owner', 'admin', 'editor')
  and updated_by = auth.uid()
);

create policy community_match_states_update_managers
on public.community_match_states for update to authenticated
using (public.group_role(group_id) in ('owner', 'admin', 'editor'))
with check (
  public.group_role(group_id) in ('owner', 'admin', 'editor')
  and updated_by = auth.uid()
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'community_match_states'
  ) then
    alter publication supabase_realtime add table public.community_match_states;
  end if;
end $$;

commit;
