-- AuraFlow CocoaTrace · Supabase-ready foundational schema
create table organizations (id uuid primary key default gen_random_uuid(), name text not null, created_at timestamptz default now());
create table users (id uuid primary key default gen_random_uuid(), organization_id uuid references organizations, full_name text, role text, email text unique);
create table regions (id uuid primary key default gen_random_uuid(), organization_id uuid references organizations, name text not null);
create table districts (id uuid primary key default gen_random_uuid(), region_id uuid references regions, name text not null);
create table societies (id uuid primary key default gen_random_uuid(), district_id uuid references districts, name text, community text);
create table farmers (id uuid primary key default gen_random_uuid(), society_id uuid references societies, farmer_code text unique, full_name text, phone text, gender text, community text, id_number text, consent_at timestamptz, compliance_status text default 'incomplete');
create table farms (id uuid primary key default gen_random_uuid(), farmer_id uuid references farmers, district_id uuid references districts, name text, size_hectares numeric, crop_type text default 'cocoa', centroid geography(point,4326), deforestation_risk_score numeric, protected_area_proximity_km numeric, last_verified_at timestamptz);
create table farm_polygons (id uuid primary key default gen_random_uuid(), farm_id uuid references farms, geometry jsonb, area_hectares numeric, completeness_score numeric, sync_status text default 'queued');
create table field_agents (id uuid primary key default gen_random_uuid(), user_id uuid references users, territory text, device_id text);
create table warehouses (id uuid primary key default gen_random_uuid(), district_id uuid references districts, name text, kind text);
create table purchases (id uuid primary key default gen_random_uuid(), farmer_id uuid references farmers, farm_id uuid references farms, agent_id uuid references field_agents, purchased_at timestamptz, price numeric, payment_method text, moisture numeric, sync_status text);
create table bags (id uuid primary key default gen_random_uuid(), bag_code text unique, purchase_id uuid references purchases, weight_kg numeric, lot_id uuid, status text);
create table lots (id uuid primary key default gen_random_uuid(), lot_code text unique, warehouse_id uuid references warehouses, buyer text, export_readiness_status text);
create table batch_movements (id uuid primary key default gen_random_uuid(), lot_id uuid references lots, from_warehouse_id uuid references warehouses, to_warehouse_id uuid references warehouses, moved_at timestamptz, status text);
create table compliance_checks (id uuid primary key default gen_random_uuid(), farm_id uuid references farms, status text, checked_at timestamptz, evidence jsonb);
create table risk_alerts (id uuid primary key default gen_random_uuid(), farm_id uuid references farms, severity text, owner_id uuid references users, status text, recommendation text);
create table sync_events (id uuid primary key default gen_random_uuid(), device_id text, entity_type text, entity_id uuid, status text, created_at timestamptz default now());
create table audit_reports (id uuid primary key default gen_random_uuid(), organization_id uuid references organizations, buyer text, report_code text unique, report_data jsonb, generated_at timestamptz default now());
