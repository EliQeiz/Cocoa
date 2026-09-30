create or replace function public.create_project_exception(
  p_project_id uuid,
  p_title text,
  p_description text,
  p_severity public.exception_severity,
  p_due_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_organization_id uuid;
  v_role public.membership_role;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_title, ''))) not between 3 and 180
     or char_length(trim(coalesce(p_description, ''))) not between 3 and 4000 then
    raise exception 'Enter an issue title and description.' using errcode = '22023';
  end if;

  select project.organization_id into v_organization_id
  from public.projects project where project.id = p_project_id for key share;
  if not found then raise exception 'Project was not found.' using errcode = 'P0002'; end if;

  select membership.role into v_role
  from public.organization_memberships membership
  where membership.organization_id = v_organization_id
    and membership.user_id = auth.uid() and membership.status = 'active';
  if v_role is null then raise exception 'You do not have access to this project.' using errcode = '42501'; end if;
  if v_role not in ('organization_owner','organization_admin','project_director','contractor_manager','engineer','site_receiver') then
    raise exception 'Your role cannot create project issues.' using errcode = '42501';
  end if;

  insert into public.exceptions (organization_id, project_id, severity, title, description, opened_by, due_at)
  values (v_organization_id, p_project_id, p_severity, trim(p_title), trim(p_description), auth.uid(), p_due_at)
  returning id into v_id;

  insert into public.audit_events (organization_id, project_id, actor_id, event_type, entity_type, entity_id, after_state, source)
  values (v_organization_id, p_project_id, auth.uid(), 'issue_created', 'exception', v_id,
    jsonb_build_object('title', trim(p_title), 'severity', p_severity, 'status', 'open'), 'application');
  return v_id;
end;
$$;

create or replace function public.create_project_delivery(
  p_project_id uuid,
  p_delivery_reference text default null,
  p_vehicle_reference text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_organization_id uuid;
  v_role public.membership_role;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required.' using errcode = '42501'; end if;
  select project.organization_id into v_organization_id
  from public.projects project where project.id = p_project_id for key share;
  if not found then raise exception 'Project was not found.' using errcode = 'P0002'; end if;
  select membership.role into v_role
  from public.organization_memberships membership
  where membership.organization_id = v_organization_id
    and membership.user_id = auth.uid() and membership.status = 'active';
  if v_role is null then raise exception 'You do not have access to this project.' using errcode = '42501'; end if;
  if v_role not in ('organization_owner','organization_admin','project_director','contractor_manager','site_receiver') then
    raise exception 'Your role cannot register deliveries.' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_delivery_reference, ''))) > 120
     or char_length(trim(coalesce(p_vehicle_reference, ''))) > 120
     or char_length(trim(coalesce(p_notes, ''))) > 2000 then
    raise exception 'Delivery details exceed the allowed length.' using errcode = '22023';
  end if;

  insert into public.deliveries (
    organization_id, project_id, status, delivery_reference,
    vehicle_reference, notes, idempotency_key
  ) values (
    v_organization_id, p_project_id, 'draft', nullif(trim(p_delivery_reference), ''),
    nullif(trim(p_vehicle_reference), ''), nullif(trim(p_notes), ''), gen_random_uuid()
  ) returning id into v_id;

  insert into public.audit_events (organization_id, project_id, actor_id, event_type, entity_type, entity_id, after_state, source)
  values (v_organization_id, p_project_id, auth.uid(), 'delivery_registered', 'delivery', v_id,
    jsonb_build_object('delivery_reference', p_delivery_reference, 'status', 'draft'), 'application');
  return v_id;
end;
$$;

create or replace function public.create_project_inspection(
  p_project_id uuid,
  p_material_package_id uuid,
  p_observed_quantity numeric,
  p_unit text,
  p_findings text,
  p_project_site_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_organization_id uuid;
  v_role public.membership_role;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required.' using errcode = '42501'; end if;
  if p_observed_quantity is null or p_observed_quantity < 0 or char_length(trim(coalesce(p_unit, ''))) not between 1 and 24
     or char_length(trim(coalesce(p_findings, ''))) not between 3 and 4000 then
    raise exception 'Enter a valid quantity, unit and inspection finding.' using errcode = '22023';
  end if;
  select project.organization_id into v_organization_id
  from public.projects project where project.id = p_project_id for key share;
  if not found then raise exception 'Project was not found.' using errcode = 'P0002'; end if;
  select membership.role into v_role
  from public.organization_memberships membership
  where membership.organization_id = v_organization_id
    and membership.user_id = auth.uid() and membership.status = 'active';
  if v_role is null then raise exception 'You do not have access to this project.' using errcode = '42501'; end if;
  if v_role not in ('organization_owner','organization_admin','project_director','contractor_manager','engineer','site_receiver','quantity_surveyor') then
    raise exception 'Your role cannot submit inspections.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.material_packages package
    where package.id = p_material_package_id and package.project_id = p_project_id
      and package.organization_id = v_organization_id
  ) then raise exception 'Choose a material package from this project.' using errcode = '22023'; end if;
  if p_project_site_id is not null and not exists (
    select 1 from public.project_sites site
    where site.id = p_project_site_id and site.project_id = p_project_id
      and site.organization_id = v_organization_id
  ) then raise exception 'Choose a site from this project.' using errcode = '22023'; end if;

  insert into public.verifications (
    organization_id, project_id, material_package_id, project_site_id,
    status, observed_quantity, unit, findings
  ) values (
    v_organization_id, p_project_id, p_material_package_id, p_project_site_id,
    'submitted', p_observed_quantity, trim(p_unit), trim(p_findings)
  ) returning id into v_id;

  insert into public.audit_events (organization_id, project_id, actor_id, event_type, entity_type, entity_id, after_state, source)
  values (v_organization_id, p_project_id, auth.uid(), 'inspection_submitted', 'verification', v_id,
    jsonb_build_object('status', 'submitted', 'observed_quantity', p_observed_quantity, 'unit', trim(p_unit)), 'application');
  return v_id;
end;
$$;

create or replace function public.create_project_release_recommendation(
  p_project_id uuid,
  p_recommendation_number text,
  p_recommended_amount numeric default null,
  p_currency_code char(3) default 'GHS',
  p_rationale text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_organization_id uuid;
  v_role public.membership_role;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required.' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p_recommendation_number, ''))) not between 2 and 48
     or char_length(trim(coalesce(p_rationale, ''))) not between 3 and 4000
     or (p_recommended_amount is not null and p_recommended_amount < 0)
     or p_currency_code !~ '^[A-Z]{3}$' then
    raise exception 'Enter a valid recommendation number, amount, currency and rationale.' using errcode = '22023';
  end if;
  select project.organization_id into v_organization_id
  from public.projects project where project.id = p_project_id for key share;
  if not found then raise exception 'Project was not found.' using errcode = 'P0002'; end if;
  select membership.role into v_role
  from public.organization_memberships membership
  where membership.organization_id = v_organization_id
    and membership.user_id = auth.uid() and membership.status = 'active';
  if v_role is null then raise exception 'You do not have access to this project.' using errcode = '42501'; end if;
  if v_role not in ('organization_owner','organization_admin','project_director','finance_reviewer') then
    raise exception 'Your role cannot prepare release recommendations.' using errcode = '42501';
  end if;

  insert into public.release_recommendations (
    organization_id, project_id, recommendation_number, status,
    recommended_amount, currency_code, rationale, prepared_by
  ) values (
    v_organization_id, p_project_id, trim(p_recommendation_number), 'draft',
    p_recommended_amount, p_currency_code, trim(p_rationale), auth.uid()
  ) returning id into v_id;

  insert into public.audit_events (organization_id, project_id, actor_id, event_type, entity_type, entity_id, after_state, source)
  values (v_organization_id, p_project_id, auth.uid(), 'release_recommendation_created', 'release_recommendation', v_id,
    jsonb_build_object('recommendation_number', trim(p_recommendation_number), 'status', 'draft', 'recommended_amount', p_recommended_amount, 'currency_code', p_currency_code), 'application');
  return v_id;
end;
$$;

revoke all on function public.create_project_exception(uuid, text, text, public.exception_severity, timestamptz) from public;
revoke all on function public.create_project_delivery(uuid, text, text, text) from public;
revoke all on function public.create_project_inspection(uuid, uuid, numeric, text, text, uuid) from public;
revoke all on function public.create_project_release_recommendation(uuid, text, numeric, char, text) from public;
grant execute on function public.create_project_exception(uuid, text, text, public.exception_severity, timestamptz) to authenticated;
grant execute on function public.create_project_delivery(uuid, text, text, text) to authenticated;
grant execute on function public.create_project_inspection(uuid, uuid, numeric, text, text, uuid) to authenticated;
grant execute on function public.create_project_release_recommendation(uuid, text, numeric, char, text) to authenticated;
