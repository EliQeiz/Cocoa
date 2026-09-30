-- Record a material receipt as one audited business transaction: delivery,
-- delivery line, manufacturer batch and received quantity.
create or replace function public.receive_project_material_delivery(
  p_project_id uuid,
  p_material_package_id uuid,
  p_received_quantity numeric,
  p_delivery_reference text,
  p_vehicle_reference text default null,
  p_manufacturer_batch_reference text default null,
  p_certificate_reference text default null,
  p_condition_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_organization_id uuid;
  v_role public.membership_role;
  v_package_name text;
  v_package_unit text;
  v_approved_quantity numeric(18,3);
  v_received_quantity numeric(18,3);
  v_tolerance_pct numeric(6,3);
  v_delivery_id uuid;
  v_delivery_line_id uuid;
  v_batch_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if p_received_quantity is null or p_received_quantity <= 0
     or char_length(trim(coalesce(p_delivery_reference, ''))) not between 2 and 120
     or char_length(trim(coalesce(p_vehicle_reference, ''))) > 120
     or char_length(trim(coalesce(p_manufacturer_batch_reference, ''))) > 120
     or char_length(trim(coalesce(p_certificate_reference, ''))) > 160
     or char_length(trim(coalesce(p_condition_notes, ''))) > 2000 then
    raise exception 'Enter valid delivery, quantity and receiving details.' using errcode = '22023';
  end if;

  select project.organization_id into v_organization_id
  from public.projects project
  where project.id = p_project_id
  for key share;
  if not found then raise exception 'Project was not found.' using errcode = 'P0002'; end if;

  select membership.role into v_role
  from public.organization_memberships membership
  where membership.organization_id = v_organization_id
    and membership.user_id = auth.uid()
    and membership.status = 'active';
  if v_role is null then raise exception 'You do not have access to this project.' using errcode = '42501'; end if;
  if v_role not in ('organization_owner','organization_admin','project_director','contractor_manager','site_receiver') then
    raise exception 'Your role cannot receive project materials.' using errcode = '42501';
  end if;

  select package.name, line.unit, package.approved_quantity,
         package.received_quantity, line.quantity_tolerance_pct
    into v_package_name, v_package_unit, v_approved_quantity,
         v_received_quantity, v_tolerance_pct
  from public.material_packages package
  join public.boq_lines line
    on line.id = package.boq_line_id
   and line.organization_id = package.organization_id
   and line.project_id = package.project_id
  join public.boq_versions baseline
    on baseline.id = line.boq_version_id
   and baseline.organization_id = package.organization_id
   and baseline.project_id = package.project_id
   and baseline.status = 'approved'
  where package.id = p_material_package_id
    and package.organization_id = v_organization_id
    and package.project_id = p_project_id
  for update of package;
  if not found then raise exception 'Choose a material package from this project.' using errcode = '22023'; end if;

  if v_received_quantity + p_received_quantity >
     v_approved_quantity * (1 + v_tolerance_pct / 100) then
    raise exception 'This receipt exceeds the approved quantity and its tolerance. Record an approved variation before receiving more.' using errcode = '23514';
  end if;

  insert into public.deliveries (
    organization_id, project_id, status, delivery_reference,
    vehicle_reference, received_by, received_at, idempotency_key, notes
  ) values (
    v_organization_id, p_project_id, 'received', trim(p_delivery_reference),
    nullif(trim(p_vehicle_reference), ''), auth.uid(), now(), gen_random_uuid(),
    nullif(trim(p_condition_notes), '')
  ) returning id into v_delivery_id;

  insert into public.delivery_lines (
    organization_id, project_id, delivery_id, material_package_id,
    description, received_quantity, unit, condition_notes
  ) values (
    v_organization_id, p_project_id, v_delivery_id, p_material_package_id,
    v_package_name, p_received_quantity, v_package_unit,
    nullif(trim(p_condition_notes), '')
  ) returning id into v_delivery_line_id;

  insert into public.material_batches (
    organization_id, project_id, delivery_line_id, material_package_id,
    manufacturer_batch_reference, certificate_reference, status
  ) values (
    v_organization_id, p_project_id, v_delivery_line_id, p_material_package_id,
    nullif(trim(p_manufacturer_batch_reference), ''),
    nullif(trim(p_certificate_reference), ''), 'pending_review'
  ) returning id into v_batch_id;

  update public.material_packages
  set received_quantity = received_quantity + p_received_quantity,
      status = 'pending_review'
  where id = p_material_package_id;

  insert into public.audit_events (
    organization_id, project_id, actor_id, event_type, entity_type,
    entity_id, after_state, source
  ) values (
    v_organization_id, p_project_id, auth.uid(), 'material_delivery_received',
    'delivery', v_delivery_id,
    jsonb_build_object(
      'delivery_reference', trim(p_delivery_reference),
      'material_package_id', p_material_package_id,
      'description', v_package_name,
      'received_quantity', p_received_quantity,
      'unit', v_package_unit,
      'delivery_line_id', v_delivery_line_id,
      'material_batch_id', v_batch_id,
      'manufacturer_batch_reference', nullif(trim(p_manufacturer_batch_reference), ''),
      'certificate_reference', nullif(trim(p_certificate_reference), ''),
      'condition_notes', nullif(trim(p_condition_notes), '')
    ), 'application'
  );

  return v_delivery_id;
end;
$$;

revoke all on function public.receive_project_material_delivery(uuid, uuid, numeric, text, text, text, text, text) from public;
grant execute on function public.receive_project_material_delivery(uuid, uuid, numeric, text, text, text, text, text) to authenticated;

comment on function public.receive_project_material_delivery(uuid, uuid, numeric, text, text, text, text, text)
is 'Receives a package quantity under its approved BoQ tolerance and atomically creates the delivery, line, material batch, balance update and audit record.';
