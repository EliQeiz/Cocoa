alter table public.verifications
  add column if not exists submitted_by uuid references public.profiles(id) on delete set null,
  add column if not exists review_rationale text;

create or replace function public.create_project_batch_inspection(
  p_project_id uuid,
  p_material_package_id uuid,
  p_material_batch_id uuid,
  p_observed_quantity numeric,
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
  v_unit text;
  v_batch_quantity numeric(18,3);
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required.' using errcode = '42501'; end if;
  if p_observed_quantity is null or p_observed_quantity <= 0
     or char_length(trim(coalesce(p_findings, ''))) not between 3 and 4000 then
    raise exception 'Enter a positive inspected quantity and clear inspection findings.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles profile where profile.id = auth.uid()) then
    raise exception 'Complete your profile before submitting an inspection.' using errcode = '23503';
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

  select line.unit, delivery_line.received_quantity
    into v_unit, v_batch_quantity
  from public.material_batches batch
  join public.delivery_lines delivery_line
    on delivery_line.id = batch.delivery_line_id
   and delivery_line.organization_id = batch.organization_id
   and delivery_line.project_id = batch.project_id
  join public.material_packages package
    on package.id = batch.material_package_id
   and package.organization_id = batch.organization_id
   and package.project_id = batch.project_id
  join public.boq_lines line
    on line.id = package.boq_line_id
   and line.organization_id = package.organization_id
   and line.project_id = package.project_id
  where batch.id = p_material_batch_id
    and batch.project_id = p_project_id
    and batch.organization_id = v_organization_id
    and batch.material_package_id = p_material_package_id
    and batch.status = 'pending_review'
  for update of batch;
  if not found then raise exception 'Choose a pending material batch for this package.' using errcode = '22023'; end if;

  if p_observed_quantity > v_batch_quantity then
    raise exception 'Inspected quantity cannot exceed the amount received in this batch.' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.verifications verification
    where verification.material_batch_id = p_material_batch_id
      and verification.status in ('submitted','accepted')
  ) then
    raise exception 'This batch already has an inspection awaiting review or an accepted inspection.' using errcode = '55000';
  end if;
  if p_project_site_id is not null and not exists (
    select 1 from public.project_sites site
    where site.id = p_project_site_id and site.project_id = p_project_id
      and site.organization_id = v_organization_id
  ) then raise exception 'Choose a site from this project.' using errcode = '22023'; end if;

  insert into public.verifications (
    organization_id, project_id, project_site_id, material_package_id,
    material_batch_id, status, observed_quantity, unit, findings, submitted_by
  ) values (
    v_organization_id, p_project_id, p_project_site_id, p_material_package_id,
    p_material_batch_id, 'submitted', p_observed_quantity, v_unit,
    trim(p_findings), auth.uid()
  ) returning id into v_id;

  insert into public.audit_events (organization_id, project_id, actor_id, event_type, entity_type, entity_id, after_state, source)
  values (v_organization_id, p_project_id, auth.uid(), 'batch_inspection_submitted', 'verification', v_id,
    jsonb_build_object('status', 'submitted', 'material_batch_id', p_material_batch_id, 'observed_quantity', p_observed_quantity, 'unit', v_unit), 'application');
  return v_id;
end;
$$;

create or replace function public.review_project_inspection(
  p_verification_id uuid,
  p_decision public.verification_status,
  p_rationale text
)
returns public.verification_status
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_organization_id uuid;
  v_project_id uuid;
  v_package_id uuid;
  v_batch_id uuid;
  v_submitter_id uuid;
  v_observed_quantity numeric(18,3);
  v_previous_status public.verification_status;
  v_role public.membership_role;
  v_received_quantity numeric(18,3);
  v_verified_quantity numeric(18,3);
begin
  if auth.uid() is null then raise exception 'Authentication is required.' using errcode = '42501'; end if;
  if p_decision is null or p_decision not in ('accepted','rejected')
     or char_length(trim(coalesce(p_rationale, ''))) not between 3 and 2000 then
    raise exception 'Choose accept or reject and record the reason.' using errcode = '22023';
  end if;

  select verification.organization_id, verification.project_id,
         verification.material_package_id, verification.material_batch_id,
         verification.submitted_by, verification.observed_quantity, verification.status
    into v_organization_id, v_project_id, v_package_id, v_batch_id,
         v_submitter_id, v_observed_quantity, v_previous_status
  from public.verifications verification
  where verification.id = p_verification_id
  for update;
  if not found then raise exception 'Inspection was not found.' using errcode = 'P0002'; end if;
  if v_previous_status <> 'submitted' then raise exception 'This inspection is no longer awaiting a decision.' using errcode = '55000'; end if;
  if v_submitter_id is null then raise exception 'This legacy inspection has no recorded submitter. Submit a new batch inspection before review.' using errcode = '55000'; end if;
  if v_submitter_id = auth.uid() then raise exception 'You cannot review your own inspection.' using errcode = '42501'; end if;
  if v_batch_id is null then raise exception 'This inspection is not linked to a material batch. Submit a batch inspection before review.' using errcode = '55000'; end if;

  select membership.role into v_role
  from public.organization_memberships membership
  where membership.organization_id = v_organization_id
    and membership.user_id = auth.uid() and membership.status = 'active';
  if v_role is null then raise exception 'You do not have access to this project.' using errcode = '42501'; end if;
  if v_role not in ('organization_owner','organization_admin','project_director','engineer','quantity_surveyor') then
    raise exception 'Your role cannot review inspections.' using errcode = '42501';
  end if;

  select delivery_line.received_quantity, package.verified_quantity
    into v_received_quantity, v_verified_quantity
  from public.material_batches batch
  join public.delivery_lines delivery_line
    on delivery_line.id = batch.delivery_line_id
   and delivery_line.organization_id = batch.organization_id
   and delivery_line.project_id = batch.project_id
  join public.material_packages package
    on package.id = batch.material_package_id
   and package.organization_id = batch.organization_id
   and package.project_id = batch.project_id
  where batch.id = v_batch_id
    and batch.project_id = v_project_id
    and batch.organization_id = v_organization_id
    and batch.material_package_id = v_package_id
    and batch.status = 'pending_review'
  for update of batch, package;
  if not found then raise exception 'The associated material batch is no longer awaiting review.' using errcode = '55000'; end if;

  if p_decision = 'accepted' and v_observed_quantity <> v_received_quantity then
    raise exception 'Inspect the complete received batch quantity before accepting the batch.' using errcode = '23514';
  end if;
  if p_decision = 'accepted' and v_verified_quantity + v_observed_quantity > (
       select package.received_quantity
       from public.material_packages package
       where package.id = v_package_id and package.organization_id = v_organization_id
     ) then
    raise exception 'Accepted quantity would exceed the amount received for this material package.' using errcode = '23514';
  end if;

  update public.verifications
  set status = p_decision,
      verified_by = auth.uid(),
      verified_at = now(),
      review_rationale = trim(p_rationale)
  where id = p_verification_id;

  update public.material_batches
  set status = case when p_decision = 'accepted' then 'acceptable'::public.batch_status else 'rejected'::public.batch_status end
  where id = v_batch_id;

  if p_decision = 'accepted' then
    update public.material_packages
    set verified_quantity = verified_quantity + v_observed_quantity,
        status = case
          when verified_quantity + v_observed_quantity >= received_quantity then 'acceptable'::public.batch_status
          else 'pending_review'::public.batch_status
        end
    where id = v_package_id;
  else
    update public.material_packages set status = 'rejected' where id = v_package_id;
  end if;

  insert into public.audit_events (organization_id, project_id, actor_id, event_type, entity_type, entity_id, before_state, after_state, source)
  values (v_organization_id, v_project_id, auth.uid(), 'batch_inspection_reviewed', 'verification', p_verification_id,
    jsonb_build_object('status', v_previous_status),
    jsonb_build_object('status', p_decision, 'review_rationale', trim(p_rationale), 'material_batch_id', v_batch_id, 'material_package_id', v_package_id),
    'application');

  return p_decision;
end;
$$;

revoke all on function public.create_project_inspection(uuid, uuid, numeric, text, text, uuid) from public, authenticated;
revoke all on function public.create_project_batch_inspection(uuid, uuid, uuid, numeric, text, uuid) from public;
revoke all on function public.review_project_inspection(uuid, public.verification_status, text) from public;
grant execute on function public.create_project_batch_inspection(uuid, uuid, uuid, numeric, text, uuid) to authenticated;
grant execute on function public.review_project_inspection(uuid, public.verification_status, text) to authenticated;

comment on function public.review_project_inspection(uuid, public.verification_status, text)
is 'Applies an independent, audited accept/reject decision to a submitted batch inspection, updating its batch and project quantities atomically.';
