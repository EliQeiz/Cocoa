create or replace function public.submit_material_purchase_request(
  p_project_id uuid,
  p_request_number text,
  p_description text,
  p_requested_quantity numeric,
  p_unit text,
  p_needed_by_date date default null,
  p_purpose text default null,
  p_estimated_unit_rate numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_organization_id uuid;
  v_role public.membership_role;
  v_request_id uuid;
  v_line_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required.' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p_request_number, ''))) not between 2 and 48
     or char_length(trim(coalesce(p_description, ''))) not between 2 and 500
     or p_requested_quantity is null or p_requested_quantity <= 0
     or char_length(trim(coalesce(p_unit, ''))) not between 1 and 24
     or (p_estimated_unit_rate is not null and p_estimated_unit_rate < 0)
     or char_length(trim(coalesce(p_purpose, ''))) > 2000 then
    raise exception 'Enter a valid request number, item, quantity, unit and purpose.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles profile where profile.id = auth.uid()) then
    raise exception 'Complete your profile before submitting a material request.' using errcode = '23503';
  end if;

  select project.organization_id into v_organization_id
  from public.projects project where project.id = p_project_id for key share;
  if not found then raise exception 'Project was not found.' using errcode = 'P0002'; end if;
  select membership.role into v_role
  from public.organization_memberships membership
  where membership.organization_id = v_organization_id
    and membership.user_id = auth.uid() and membership.status = 'active';
  if v_role is null then raise exception 'You do not have access to this project.' using errcode = '42501'; end if;
  if v_role not in ('organization_owner','organization_admin','project_director','contractor_manager','quantity_surveyor','site_receiver') then
    raise exception 'Your role cannot submit material requests.' using errcode = '42501';
  end if;

  insert into public.purchase_requests (
    organization_id, project_id, request_number, status, requested_by,
    requested_at, needed_by_date, purpose, idempotency_key
  ) values (
    v_organization_id, p_project_id, trim(p_request_number), 'submitted', auth.uid(),
    now(), p_needed_by_date, nullif(trim(p_purpose), ''), gen_random_uuid()
  ) returning id into v_request_id;

  insert into public.purchase_request_lines (
    organization_id, project_id, purchase_request_id, description,
    requested_quantity, unit, estimated_unit_rate
  ) values (
    v_organization_id, p_project_id, v_request_id, trim(p_description),
    p_requested_quantity, trim(p_unit), p_estimated_unit_rate
  ) returning id into v_line_id;

  insert into public.audit_events (organization_id, project_id, actor_id, event_type, entity_type, entity_id, after_state, source)
  values (v_organization_id, p_project_id, auth.uid(), 'material_request_submitted', 'purchase_request', v_request_id,
    jsonb_build_object('request_number', trim(p_request_number), 'status', 'submitted', 'line_id', v_line_id), 'application');
  return v_request_id;
end;
$$;

create or replace function public.decide_purchase_request(
  p_purchase_request_id uuid,
  p_decision public.approval_decision,
  p_rationale text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_organization_id uuid;
  v_project_id uuid;
  v_requester_id uuid;
  v_previous_status public.request_status;
  v_role public.membership_role;
  v_action_id uuid;
  v_next_status public.request_status;
begin
  if auth.uid() is null then raise exception 'Authentication is required.' using errcode = '42501'; end if;
  if p_decision is null or char_length(trim(coalesce(p_rationale, ''))) not between 3 and 4000 then
    raise exception 'A clear rationale is required for this decision.' using errcode = '22023';
  end if;

  select request.organization_id, request.project_id, request.requested_by, request.status
    into v_organization_id, v_project_id, v_requester_id, v_previous_status
  from public.purchase_requests request where request.id = p_purchase_request_id for update;
  if not found then raise exception 'Purchase request was not found.' using errcode = 'P0002'; end if;
  if v_previous_status not in ('submitted', 'under_review', 'queried') then
    raise exception 'This request is not awaiting a decision.' using errcode = '55000';
  end if;
  if v_requester_id = auth.uid() then
    raise exception 'You cannot decide your own purchase request.' using errcode = '42501';
  end if;

  select membership.role into v_role
  from public.organization_memberships membership
  where membership.organization_id = v_organization_id
    and membership.user_id = auth.uid() and membership.status = 'active';
  if v_role is null then raise exception 'You do not have access to this project.' using errcode = '42501'; end if;
  if v_role not in ('organization_owner','organization_admin','project_director','finance_reviewer') then
    raise exception 'Your role cannot decide purchase requests.' using errcode = '42501';
  end if;

  v_next_status := case p_decision
    when 'approved' then 'approved'::public.request_status
    when 'rejected' then 'rejected'::public.request_status
    when 'queried' then 'queried'::public.request_status
    when 'returned' then 'under_review'::public.request_status
    when 'variation_required' then 'under_review'::public.request_status
  end;

  insert into public.approval_actions (
    organization_id, project_id, purchase_request_id, decision, rationale, acted_by
  ) values (
    v_organization_id, v_project_id, p_purchase_request_id, p_decision, trim(p_rationale), auth.uid()
  ) returning id into v_action_id;

  update public.purchase_requests set status = v_next_status where id = p_purchase_request_id;

  insert into public.audit_events (organization_id, project_id, actor_id, event_type, entity_type, entity_id, before_state, after_state, source)
  values (v_organization_id, v_project_id, auth.uid(), 'purchase_request_decided', 'purchase_request', p_purchase_request_id,
    jsonb_build_object('status', v_previous_status), jsonb_build_object('status', v_next_status, 'decision', p_decision, 'approval_action_id', v_action_id), 'application');
  return v_action_id;
end;
$$;

revoke all on function public.submit_material_purchase_request(uuid, text, text, numeric, text, date, text, numeric) from public;
revoke all on function public.decide_purchase_request(uuid, public.approval_decision, text) from public;
grant execute on function public.submit_material_purchase_request(uuid, text, text, numeric, text, date, text, numeric) to authenticated;
grant execute on function public.decide_purchase_request(uuid, public.approval_decision, text) to authenticated;
