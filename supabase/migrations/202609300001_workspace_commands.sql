create or replace function public.update_project_status(
  p_project_id uuid,
  p_next_status public.project_status
)
returns public.project_status
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_organization_id uuid;
  v_previous_status public.project_status;
  v_role public.membership_role;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select project.organization_id, project.status
    into v_organization_id, v_previous_status
  from public.projects project
  where project.id = p_project_id
  for update;

  if not found then
    raise exception 'Project was not found.' using errcode = 'P0002';
  end if;

  select membership.role into v_role
  from public.organization_memberships membership
  where membership.organization_id = v_organization_id
    and membership.user_id = auth.uid()
    and membership.status = 'active'
  limit 1;

  if v_role is null then
    raise exception 'You do not have access to this project.' using errcode = '42501';
  end if;

  if v_role not in ('organization_owner', 'organization_admin', 'project_director', 'contractor_manager') then
    raise exception 'Your role cannot change project status.' using errcode = '42501';
  end if;

  update public.projects
  set status = p_next_status
  where id = p_project_id;

  insert into public.audit_events (
    organization_id,
    project_id,
    actor_id,
    event_type,
    entity_type,
    entity_id,
    before_state,
    after_state,
    source
  ) values (
    v_organization_id,
    p_project_id,
    auth.uid(),
    'project_status_changed',
    'project',
    p_project_id,
    jsonb_build_object('status', v_previous_status),
    jsonb_build_object('status', p_next_status),
    'application'
  );

  return p_next_status;
end;
$$;

revoke all on function public.update_project_status(uuid, public.project_status) from public;
grant execute on function public.update_project_status(uuid, public.project_status) to authenticated;
