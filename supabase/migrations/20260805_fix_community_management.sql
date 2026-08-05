begin;

create or replace function public.leave_group(target_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_role text;
begin
  if auth.uid() is null then raise exception 'Oturum açmanız gerekiyor.'; end if;
  select role into current_role
  from public.group_members
  where group_id = target_group_id and user_id = auth.uid();

  if current_role is null then raise exception 'Bu topluluğun üyesi değilsiniz.'; end if;
  if current_role = 'owner' then raise exception 'Kurucu Admin topluluktan ayrılamaz. Topluluğu silebilirsiniz.'; end if;

  delete from public.players where group_id = target_group_id and linked_user_id = auth.uid();
  delete from public.group_members where group_id = target_group_id and user_id = auth.uid();
end;
$$;

revoke all on function public.leave_group(uuid) from public;
grant execute on function public.leave_group(uuid) to authenticated;

commit;
