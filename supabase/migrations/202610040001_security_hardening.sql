-- Defense-in-depth controls for browser-originated commands.
-- Supabase Auth separately rate-limits sign-in and token endpoints; this
-- migration limits successful domain commands at the authoritative DB layer.

create table private.action_rate_limits (
  actor_id uuid not null,
  action_name text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (actor_id, action_name, window_started_at)
);

revoke all on table private.action_rate_limits from public, anon, authenticated;

create or replace function private.enforce_action_rate_limit(
  p_actor_id uuid,
  p_action_name text,
  p_maximum integer,
  p_window_seconds integer
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, private
as $$
declare
  v_window_started_at timestamptz;
  v_request_count integer;
begin
  if p_actor_id is null then return; end if;
  if p_maximum < 1 or p_window_seconds < 1 or char_length(p_action_name) not between 1 and 120 then
    raise exception 'Rate-limit configuration is invalid.' using errcode = '22023';
  end if;

  v_window_started_at := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into private.action_rate_limits (actor_id, action_name, window_started_at, request_count)
  values (p_actor_id, p_action_name, v_window_started_at, 1)
  on conflict (actor_id, action_name, window_started_at) do update
    set request_count = private.action_rate_limits.request_count + 1
  returning request_count into v_request_count;

  delete from private.action_rate_limits
  where actor_id = p_actor_id
    and window_started_at < clock_timestamp() - interval '2 days';

  if v_request_count > p_maximum then
    raise exception 'Too many requests. Wait before trying this action again.' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function private.enforce_action_rate_limit(uuid, text, integer, integer) from public, anon, authenticated;

create or replace function private.rate_limit_audit_command()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, private
as $$
declare
  v_maximum integer := 120;
  v_window_seconds integer := 60;
begin
  if new.actor_id is null then return new; end if;

  if new.event_type = 'organization.invitation_created' then
    v_maximum := 10;
    v_window_seconds := 3600;
  elsif new.event_type = 'organization.created' then
    v_maximum := 3;
    v_window_seconds := 86400;
  elsif new.event_type = 'project.created' then
    v_maximum := 30;
    v_window_seconds := 3600;
  elsif new.event_type = 'evidence_attached' then
    v_maximum := 60;
    v_window_seconds := 3600;
  end if;

  perform private.enforce_action_rate_limit(new.actor_id, new.event_type, v_maximum, v_window_seconds);
  return new;
end;
$$;

revoke all on function private.rate_limit_audit_command() from public, anon, authenticated;
create trigger audit_events_rate_limit
before insert on public.audit_events
for each row execute function private.rate_limit_audit_command();

create or replace function private.audit_new_tenant_record()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then return new; end if;

  if tg_table_name = 'organizations' then
    insert into public.audit_events (
      organization_id, actor_id, event_type, entity_type, entity_id, after_state, source
    ) values (
      new.id, auth.uid(), 'organization.created', 'organization', new.id,
      jsonb_build_object('display_name', new.display_name), 'application'
    );
  elsif tg_table_name = 'projects' then
    insert into public.audit_events (
      organization_id, project_id, actor_id, event_type, entity_type, entity_id, after_state, source
    ) values (
      new.organization_id, new.id, auth.uid(), 'project.created', 'project', new.id,
      jsonb_build_object('project_code', new.project_code, 'name', new.name), 'application'
    );
  end if;
  return new;
end;
$$;

revoke all on function private.audit_new_tenant_record() from public, anon, authenticated;
create trigger organizations_audit_creation
after insert on public.organizations
for each row execute function private.audit_new_tenant_record();
create trigger projects_audit_creation
after insert on public.projects
for each row execute function private.audit_new_tenant_record();

create or replace function private.is_org_administrator(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role in ('organization_owner', 'organization_admin')
  );
$$;

revoke all on function private.is_org_administrator(uuid) from public, anon;
grant execute on function private.is_org_administrator(uuid) to authenticated;

drop policy if exists memberships_read_self on public.organization_memberships;
create policy memberships_read_self_or_admin
  on public.organization_memberships for select to authenticated
  using (user_id = auth.uid() or private.is_org_administrator(organization_id));

drop policy if exists organization_invitations_read_member on public.organization_invitations;
create policy organization_invitations_read_admin
  on public.organization_invitations for select to authenticated
  using (private.is_org_administrator(organization_id));

-- RLS remains the tenant boundary, while these grants remove unused direct
-- mutation capabilities from browser roles altogether. All browser writes
-- are intentionally mediated by the purpose-built RPC commands above.
revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke insert, update, delete, truncate, references, trigger
  on tables from anon, authenticated;
revoke all on table public.outbox_events from anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

comment on table private.action_rate_limits is
  'Server-controlled fixed-window rate counters for authenticated domain commands; inaccessible to browser roles.';
