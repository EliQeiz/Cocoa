-- Browser onboarding remains constrained to purpose-built, authenticated commands.
-- These functions create a tenant and its first project atomically while direct table
-- writes remain unavailable from the browser under the foundation RLS policies.

create or replace function public.create_organization(
  p_legal_name text,
  p_display_name text,
  p_slug text,
  p_owner_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  organization_id uuid;
begin
  if auth.uid() is null then
    raise exception 'An authenticated user is required.' using errcode = '42501';
  end if;

  if char_length(trim(p_legal_name)) < 2
    or char_length(trim(p_display_name)) < 2
    or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or char_length(trim(p_owner_display_name)) < 2 then
    raise exception 'Organisation details are invalid.' using errcode = '22023';
  end if;

  insert into public.profiles (id, display_name)
  values (auth.uid(), trim(p_owner_display_name))
  on conflict (id) do update
    set display_name = excluded.display_name,
        updated_at = timezone('utc', now());

  insert into public.organizations (legal_name, display_name, slug)
  values (trim(p_legal_name), trim(p_display_name), p_slug)
  returning id into organization_id;

  insert into public.organization_memberships (
    organization_id,
    user_id,
    role,
    status,
    invited_by,
    accepted_at
  )
  values (
    organization_id,
    auth.uid(),
    'organization_owner',
    'active',
    auth.uid(),
    timezone('utc', now())
  );

  return organization_id;
end;
$$;

create or replace function public.create_first_project(
  p_organization_id uuid,
  p_project_code text,
  p_name text,
  p_client_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  project_id uuid;
begin
  if auth.uid() is null or not private.is_org_member(p_organization_id) then
    raise exception 'You do not have access to this organisation.' using errcode = '42501';
  end if;

  if char_length(trim(p_project_code)) < 2 or char_length(trim(p_name)) < 2 then
    raise exception 'Project details are invalid.' using errcode = '22023';
  end if;

  insert into public.projects (
    organization_id,
    project_code,
    name,
    client_name,
    created_by
  )
  values (
    p_organization_id,
    upper(trim(p_project_code)),
    trim(p_name),
    nullif(trim(p_client_name), ''),
    auth.uid()
  )
  returning id into project_id;

  return project_id;
end;
$$;

revoke all on function public.create_organization(text, text, text, text) from public;
revoke all on function public.create_first_project(uuid, text, text, text) from public;
grant execute on function public.create_organization(text, text, text, text) to authenticated;
grant execute on function public.create_first_project(uuid, text, text, text) to authenticated;
