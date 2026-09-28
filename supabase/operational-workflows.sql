-- Operational workflow layer: auditable, tenant-checked actions for the web app.
-- Run after schema.sql, policies.sql, org-policies.sql and auth-onboarding.sql.

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  actor_id uuid references public.users(id),
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.activity_events enable row level security;
drop policy if exists organization_select on public.activity_events;
drop policy if exists organization_insert on public.activity_events;
create policy organization_select on public.activity_events for select to authenticated using (organization_id = public.current_organization_id());
create policy organization_insert on public.activity_events for insert to authenticated with check (organization_id = public.current_organization_id());

alter table public.risk_alerts add column if not exists resolved_at timestamptz;
alter table public.risk_alerts add column if not exists resolved_by uuid references public.users(id);
alter table public.risk_alerts add column if not exists resolution_note text;
alter table public.audit_reports add column if not exists status text not null default 'ready';
alter table public.audit_reports add column if not exists evidence_checksum text;

create index if not exists activity_events_org_created_idx on public.activity_events (organization_id, created_at desc);
create index if not exists purchases_org_created_idx on public.purchases (organization_id, purchased_at desc);
create index if not exists risk_alerts_org_status_idx on public.risk_alerts (organization_id, status);

create or replace function public.register_producer_with_farm(
  p_society_id uuid, p_district_id uuid, p_full_name text, p_phone text,
  p_community text, p_farm_name text, p_size_hectares numeric
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  org_id uuid := public.current_organization_id();
  farmer_id uuid;
  farm_id uuid;
  farmer_code text;
begin
  if org_id is null then raise exception 'No organization is assigned to this account'; end if;
  if not exists (select 1 from public.societies where id = p_society_id and organization_id = org_id) then raise exception 'Invalid society for this organization'; end if;
  if not exists (select 1 from public.districts where id = p_district_id and organization_id = org_id) then raise exception 'Invalid district for this organization'; end if;
  if coalesce(length(trim(p_full_name)), 0) < 3 then raise exception 'Producer name is required'; end if;
  if coalesce(p_size_hectares, 0) <= 0 then raise exception 'Farm size must be greater than zero'; end if;
  farmer_code := 'GH-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));
  insert into public.farmers (organization_id, society_id, farmer_code, full_name, phone, community, consent_at, compliance_status)
  values (org_id, p_society_id, farmer_code, trim(p_full_name), nullif(trim(p_phone), ''), nullif(trim(p_community), ''), now(), 'pending review')
  returning id into farmer_id;
  insert into public.farms (organization_id, farmer_id, district_id, name, size_hectares, crop_type, last_verified_at)
  values (org_id, farmer_id, p_district_id, coalesce(nullif(trim(p_farm_name), ''), 'Unmapped cocoa farm'), p_size_hectares, 'cocoa', null)
  returning id into farm_id;
  insert into public.activity_events (organization_id, actor_id, event_type, entity_type, entity_id, payload)
  values (org_id, auth.uid(), 'producer_registered', 'farmer', farmer_id, jsonb_build_object('farmer_code', farmer_code, 'farm_id', farm_id));
  return jsonb_build_object('farmer_id', farmer_id, 'farm_id', farm_id, 'farmer_code', farmer_code);
end;
$$;

create or replace function public.capture_farmgate_purchase(
  p_farmer_id uuid, p_farm_id uuid, p_weight_kg numeric, p_moisture numeric,
  p_price numeric, p_payment_method text
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  org_id uuid := public.current_organization_id();
  purchase_id uuid;
  bag_id uuid;
  bag_code text;
begin
  if org_id is null then raise exception 'No organization is assigned to this account'; end if;
  if not exists (select 1 from public.farmers where id = p_farmer_id and organization_id = org_id) then raise exception 'Invalid producer'; end if;
  if not exists (select 1 from public.farms where id = p_farm_id and farmer_id = p_farmer_id and organization_id = org_id) then raise exception 'Farm does not belong to the selected producer'; end if;
  if coalesce(p_weight_kg, 0) <= 0 then raise exception 'Weight must be greater than zero'; end if;
  insert into public.purchases (organization_id, farmer_id, farm_id, purchased_at, price, payment_method, moisture, sync_status)
  values (org_id, p_farmer_id, p_farm_id, now(), p_price, coalesce(nullif(trim(p_payment_method), ''), 'mobile_money'), p_moisture, 'synced')
  returning id into purchase_id;
  bag_code := 'AF-' || to_char(now(), 'YY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.bags (organization_id, bag_code, purchase_id, weight_kg, status)
  values (org_id, bag_code, purchase_id, p_weight_kg, 'verified')
  returning id into bag_id;
  insert into public.activity_events (organization_id, actor_id, event_type, entity_type, entity_id, payload)
  values (org_id, auth.uid(), 'purchase_captured', 'purchase', purchase_id, jsonb_build_object('bag_id', bag_id, 'bag_code', bag_code, 'weight_kg', p_weight_kg));
  return jsonb_build_object('purchase_id', purchase_id, 'bag_id', bag_id, 'bag_code', bag_code);
end;
$$;

create or replace function public.resolve_risk_alert(p_alert_id uuid, p_resolution_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare org_id uuid := public.current_organization_id();
begin
  if org_id is null then raise exception 'No organization is assigned to this account'; end if;
  update public.risk_alerts set status = 'resolved', resolved_at = now(), resolved_by = auth.uid(), resolution_note = nullif(trim(p_resolution_note), '')
  where id = p_alert_id and organization_id = org_id;
  if not found then raise exception 'Risk alert not found'; end if;
  insert into public.activity_events (organization_id, actor_id, event_type, entity_type, entity_id, payload)
  values (org_id, auth.uid(), 'risk_resolved', 'risk_alert', p_alert_id, jsonb_build_object('resolution_note', p_resolution_note));
  return jsonb_build_object('alert_id', p_alert_id, 'status', 'resolved');
end;
$$;

create or replace function public.generate_audit_packet(p_buyer text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  org_id uuid := public.current_organization_id();
  report_id uuid;
  report_code text;
  payload jsonb;
begin
  if org_id is null then raise exception 'No organization is assigned to this account'; end if;
  report_code := 'AF-DDS-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  payload := jsonb_build_object(
    'generated_at', now(),
    'producer_count', (select count(*) from public.farmers where organization_id = org_id),
    'farm_count', (select count(*) from public.farms where organization_id = org_id),
    'polygon_count', (select count(*) from public.farm_polygons where organization_id = org_id),
    'bag_count', (select count(*) from public.bags where organization_id = org_id),
    'open_risk_count', (select count(*) from public.risk_alerts where organization_id = org_id and coalesce(status, 'open') <> 'resolved')
  );
  insert into public.audit_reports (organization_id, buyer, report_code, report_data, status, evidence_checksum)
  values (org_id, coalesce(nullif(trim(p_buyer), ''), 'Unassigned buyer'), report_code, payload, 'ready', encode(digest(payload::text, 'sha256'), 'hex'))
  returning id into report_id;
  insert into public.activity_events (organization_id, actor_id, event_type, entity_type, entity_id, payload)
  values (org_id, auth.uid(), 'audit_packet_generated', 'audit_report', report_id, jsonb_build_object('report_code', report_code));
  return jsonb_build_object('report_id', report_id, 'report_code', report_code, 'report_data', payload);
end;
$$;

revoke all on function public.register_producer_with_farm(uuid,uuid,text,text,text,text,numeric) from public;
revoke all on function public.capture_farmgate_purchase(uuid,uuid,numeric,numeric,numeric,text) from public;
revoke all on function public.resolve_risk_alert(uuid,text) from public;
revoke all on function public.generate_audit_packet(text) from public;
grant execute on function public.register_producer_with_farm(uuid,uuid,text,text,text,text,numeric) to authenticated;
grant execute on function public.capture_farmgate_purchase(uuid,uuid,numeric,numeric,numeric,text) to authenticated;
grant execute on function public.resolve_risk_alert(uuid,text) to authenticated;
grant execute on function public.generate_audit_packet(text) to authenticated;
