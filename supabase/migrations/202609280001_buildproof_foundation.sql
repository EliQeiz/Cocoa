-- BuildProof foundation: multi-tenant evidence and material-control domain.
--
-- Design status: review before applying. This migration intentionally permits
-- browser reads under RLS but keeps all writes server-controlled until each
-- role-specific command has acceptance tests. Edge Functions/RPC command
-- handlers must validate project role, state transition and idempotency.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;

create type public.membership_role as enum (
  'organization_owner', 'organization_admin', 'project_director',
  'contractor_manager', 'site_receiver', 'engineer',
  'quantity_surveyor', 'finance_reviewer', 'funder_viewer'
);
create type public.membership_status as enum ('invited', 'active', 'suspended');
create type public.project_status as enum ('planning', 'active', 'on_hold', 'completed', 'archived');
create type public.boq_version_status as enum ('draft', 'approved', 'superseded');
create type public.request_status as enum ('draft', 'submitted', 'under_review', 'approved', 'queried', 'rejected', 'cancelled');
create type public.approval_decision as enum ('approved', 'queried', 'rejected', 'returned', 'variation_required');
create type public.delivery_status as enum ('draft', 'received', 'partially_received', 'rejected', 'void');
create type public.batch_status as enum ('pending_review', 'acceptable', 'queried', 'rejected', 'quarantined');
create type public.verification_status as enum ('draft', 'submitted', 'accepted', 'queried', 'rejected', 'superseded');
create type public.exception_severity as enum ('low', 'medium', 'high', 'critical');
create type public.exception_status as enum ('open', 'in_review', 'resolved', 'accepted_risk', 'closed');
create type public.release_status as enum ('draft', 'ready_for_review', 'partially_supported', 'blocked', 'superseded');
create type public.evidence_subject_type as enum ('purchase_request', 'delivery', 'delivery_line', 'material_batch', 'verification', 'exception', 'release_recommendation');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 160),
  phone text,
  job_title text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null check (char_length(trim(legal_name)) between 2 and 240),
  display_name text not null check (char_length(trim(display_name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  country_code char(2) not null default 'GH',
  base_currency char(3) not null default 'GHS',
  timezone text not null default 'Africa/Accra',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.membership_role not null,
  status public.membership_status not null default 'invited',
  invited_by uuid references public.profiles(id) on delete set null,
  invited_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  unique (organization_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_code text not null,
  name text not null check (char_length(trim(name)) between 2 and 240),
  status public.project_status not null default 'planning',
  client_name text,
  currency_code char(3) not null default 'GHS',
  planned_start_date date,
  planned_end_date date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  unique (organization_id, project_code),
  check (planned_end_date is null or planned_start_date is null or planned_end_date >= planned_start_date)
);

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  membership_id uuid not null,
  role public.membership_role not null,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, membership_id),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade,
  foreign key (organization_id, membership_id) references public.organization_memberships(organization_id, id) on delete cascade
);

create table public.project_sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  name text not null,
  address_text text,
  locality text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade,
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180)
);

create table public.project_phases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  name text not null,
  sequence_no integer not null check (sequence_no > 0),
  start_date date,
  end_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  unique (project_id, sequence_no),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade,
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  legal_name text not null,
  trading_name text,
  contact_name text,
  email text,
  phone text,
  registration_number text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  unique (organization_id, legal_name)
);

create table public.boq_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  version_number integer not null check (version_number > 0),
  status public.boq_version_status not null default 'draft',
  source_filename text,
  source_hash text,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  supersedes_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  unique (project_id, version_number),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade,
  foreign key (supersedes_id) references public.boq_versions(id) on delete restrict,
  check ((status = 'approved' and approved_at is not null) or status <> 'approved')
);

create table public.boq_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  boq_version_id uuid not null,
  phase_id uuid,
  line_code text not null,
  description text not null,
  material_category text not null,
  specification text,
  unit text not null,
  approved_quantity numeric(18,3) not null check (approved_quantity >= 0),
  unit_rate numeric(18,2) check (unit_rate is null or unit_rate >= 0),
  approved_amount numeric(18,2) generated always as (round(approved_quantity * coalesce(unit_rate, 0), 2)) stored,
  quantity_tolerance_pct numeric(6,3) not null default 0 check (quantity_tolerance_pct between 0 and 100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  unique (boq_version_id, line_code),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade,
  foreign key (organization_id, boq_version_id) references public.boq_versions(organization_id, id) on delete cascade,
  foreign key (organization_id, phase_id) references public.project_phases(organization_id, id) on delete set null
);

create table public.material_packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  boq_line_id uuid not null,
  package_code text not null,
  name text not null,
  status public.batch_status not null default 'pending_review',
  approved_quantity numeric(18,3) not null check (approved_quantity >= 0),
  received_quantity numeric(18,3) not null default 0 check (received_quantity >= 0),
  verified_quantity numeric(18,3) not null default 0 check (verified_quantity >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  unique (project_id, package_code),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade,
  foreign key (organization_id, boq_line_id) references public.boq_lines(organization_id, id) on delete restrict
);

create table public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  request_number text not null,
  status public.request_status not null default 'draft',
  requested_by uuid not null references public.profiles(id) on delete restrict,
  requested_at timestamptz,
  needed_by_date date,
  purpose text,
  idempotency_key uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  unique (project_id, request_number),
  unique (organization_id, idempotency_key),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade
);

create table public.purchase_request_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  purchase_request_id uuid not null,
  material_package_id uuid,
  boq_line_id uuid,
  description text not null,
  requested_quantity numeric(18,3) not null check (requested_quantity > 0),
  unit text not null,
  estimated_unit_rate numeric(18,2) check (estimated_unit_rate is null or estimated_unit_rate >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade,
  foreign key (organization_id, purchase_request_id) references public.purchase_requests(organization_id, id) on delete cascade,
  foreign key (organization_id, material_package_id) references public.material_packages(organization_id, id) on delete set null,
  foreign key (organization_id, boq_line_id) references public.boq_lines(organization_id, id) on delete set null
);

create table public.approval_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  purchase_request_id uuid not null,
  decision public.approval_decision not null,
  rationale text not null check (char_length(trim(rationale)) > 0),
  acted_by uuid not null references public.profiles(id) on delete restrict,
  acted_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade,
  foreign key (organization_id, purchase_request_id) references public.purchase_requests(organization_id, id) on delete cascade
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  project_site_id uuid,
  purchase_request_id uuid,
  supplier_id uuid,
  status public.delivery_status not null default 'draft',
  delivery_reference text,
  vehicle_reference text,
  received_by uuid references public.profiles(id) on delete set null,
  received_at timestamptz,
  idempotency_key uuid not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  unique (organization_id, idempotency_key),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade,
  foreign key (organization_id, project_site_id) references public.project_sites(organization_id, id) on delete set null,
  foreign key (organization_id, purchase_request_id) references public.purchase_requests(organization_id, id) on delete set null,
  foreign key (organization_id, supplier_id) references public.suppliers(organization_id, id) on delete set null
);

create table public.delivery_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  delivery_id uuid not null,
  material_package_id uuid,
  purchase_request_line_id uuid,
  description text not null,
  received_quantity numeric(18,3) not null check (received_quantity >= 0),
  unit text not null,
  condition_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade,
  foreign key (organization_id, delivery_id) references public.deliveries(organization_id, id) on delete cascade,
  foreign key (organization_id, material_package_id) references public.material_packages(organization_id, id) on delete set null,
  foreign key (organization_id, purchase_request_line_id) references public.purchase_request_lines(organization_id, id) on delete set null
);

create table public.material_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  delivery_line_id uuid not null,
  material_package_id uuid,
  qr_token uuid not null default gen_random_uuid() unique,
  manufacturer_batch_reference text,
  status public.batch_status not null default 'pending_review',
  certificate_reference text,
  expires_at date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade,
  foreign key (organization_id, delivery_line_id) references public.delivery_lines(organization_id, id) on delete cascade,
  foreign key (organization_id, material_package_id) references public.material_packages(organization_id, id) on delete set null
);

create table public.evidence_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  bucket_id text not null default 'buildproof-evidence',
  object_path text not null,
  original_filename text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0),
  sha256 text not null check (sha256 ~ '^[A-Fa-f0-9]{64}$'),
  captured_at timestamptz,
  captured_latitude numeric(9,6),
  captured_longitude numeric(9,6),
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  unique (bucket_id, object_path),
  check (captured_latitude is null or captured_latitude between -90 and 90),
  check (captured_longitude is null or captured_longitude between -180 and 180)
);

create table public.evidence_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  evidence_asset_id uuid not null references public.evidence_assets(id) on delete restrict,
  subject_type public.evidence_subject_type not null,
  subject_id uuid not null,
  caption text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  unique (evidence_asset_id, subject_type, subject_id),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade
);

create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  project_site_id uuid,
  material_package_id uuid not null,
  material_batch_id uuid,
  status public.verification_status not null default 'draft',
  observed_quantity numeric(18,3) check (observed_quantity is null or observed_quantity >= 0),
  unit text,
  findings text,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade,
  foreign key (organization_id, project_site_id) references public.project_sites(organization_id, id) on delete set null,
  foreign key (organization_id, material_package_id) references public.material_packages(organization_id, id) on delete restrict,
  foreign key (organization_id, material_batch_id) references public.material_batches(organization_id, id) on delete set null
);

create table public.exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  material_package_id uuid,
  severity public.exception_severity not null,
  status public.exception_status not null default 'open',
  title text not null,
  description text not null,
  owner_id uuid references public.profiles(id) on delete set null,
  due_at timestamptz,
  opened_by uuid not null references public.profiles(id) on delete restrict,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade,
  foreign key (organization_id, material_package_id) references public.material_packages(organization_id, id) on delete set null
);

create table public.exception_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  exception_id uuid not null,
  previous_status public.exception_status,
  next_status public.exception_status not null,
  note text not null,
  acted_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade,
  foreign key (organization_id, exception_id) references public.exceptions(organization_id, id) on delete cascade
);

create table public.release_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  recommendation_number text not null,
  status public.release_status not null default 'draft',
  recommended_amount numeric(18,2) check (recommended_amount is null or recommended_amount >= 0),
  currency_code char(3) not null default 'GHS',
  rationale text,
  prepared_by uuid references public.profiles(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, id),
  unique (project_id, recommendation_number),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade
);

create table public.release_recommendation_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  release_recommendation_id uuid not null,
  material_package_id uuid,
  verification_id uuid,
  amount numeric(18,2) check (amount is null or amount >= 0),
  evidence_state public.release_status not null,
  created_at timestamptz not null default timezone('utc', now()),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade,
  foreign key (organization_id, release_recommendation_id) references public.release_recommendations(organization_id, id) on delete cascade,
  foreign key (organization_id, material_package_id) references public.material_packages(organization_id, id) on delete set null,
  foreign key (organization_id, verification_id) references public.verifications(organization_id, id) on delete set null
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid,
  actor_id uuid references public.profiles(id) on delete set null,
  request_id uuid,
  event_type text not null,
  entity_type text not null,
  entity_id uuid not null,
  before_state jsonb,
  after_state jsonb,
  occurred_at timestamptz not null default timezone('utc', now()),
  source text not null default 'application' check (source in ('application', 'edge_function', 'database', 'import')),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete restrict
);

create table public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  payload jsonb not null,
  idempotency_key uuid not null,
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, idempotency_key)
);

create index organization_memberships_user_org_idx on public.organization_memberships (user_id, organization_id) where status = 'active';
create index project_members_membership_idx on public.project_members (membership_id, project_id) where active;
create index projects_org_status_idx on public.projects (organization_id, status, updated_at desc);
create index boq_versions_project_status_idx on public.boq_versions (organization_id, project_id, status);
create index boq_lines_project_category_idx on public.boq_lines (organization_id, project_id, material_category);
create index packages_project_status_idx on public.material_packages (organization_id, project_id, status, updated_at desc);
create index requests_project_status_idx on public.purchase_requests (organization_id, project_id, status, created_at desc);
create index deliveries_project_received_idx on public.deliveries (organization_id, project_id, received_at desc);
create index batches_project_status_idx on public.material_batches (organization_id, project_id, status);
create index evidence_assets_org_created_idx on public.evidence_assets (organization_id, created_at desc);
create index evidence_links_subject_idx on public.evidence_links (organization_id, subject_type, subject_id);
create index verifications_project_status_idx on public.verifications (organization_id, project_id, status, verified_at desc);
create index exceptions_open_idx on public.exceptions (organization_id, project_id, severity, due_at) where status in ('open', 'in_review');
create index release_recommendations_project_status_idx on public.release_recommendations (organization_id, project_id, status, created_at desc);
create index audit_events_entity_idx on public.audit_events (organization_id, entity_type, entity_id, occurred_at desc);
create index outbox_unprocessed_idx on public.outbox_events (available_at) where processed_at is null;

create or replace function private.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  );
$$;
revoke all on function private.is_org_member(uuid) from public;
grant execute on function private.is_org_member(uuid) to authenticated;

create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger organizations_set_updated_at before update on public.organizations for each row execute procedure public.set_updated_at();
create trigger organization_memberships_set_updated_at before update on public.organization_memberships for each row execute procedure public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects for each row execute procedure public.set_updated_at();
create trigger project_sites_set_updated_at before update on public.project_sites for each row execute procedure public.set_updated_at();
create trigger project_phases_set_updated_at before update on public.project_phases for each row execute procedure public.set_updated_at();
create trigger suppliers_set_updated_at before update on public.suppliers for each row execute procedure public.set_updated_at();
create trigger boq_versions_set_updated_at before update on public.boq_versions for each row execute procedure public.set_updated_at();
create trigger boq_lines_set_updated_at before update on public.boq_lines for each row execute procedure public.set_updated_at();
create trigger material_packages_set_updated_at before update on public.material_packages for each row execute procedure public.set_updated_at();
create trigger purchase_requests_set_updated_at before update on public.purchase_requests for each row execute procedure public.set_updated_at();
create trigger purchase_request_lines_set_updated_at before update on public.purchase_request_lines for each row execute procedure public.set_updated_at();
create trigger deliveries_set_updated_at before update on public.deliveries for each row execute procedure public.set_updated_at();
create trigger delivery_lines_set_updated_at before update on public.delivery_lines for each row execute procedure public.set_updated_at();
create trigger material_batches_set_updated_at before update on public.material_batches for each row execute procedure public.set_updated_at();
create trigger verifications_set_updated_at before update on public.verifications for each row execute procedure public.set_updated_at();
create trigger exceptions_set_updated_at before update on public.exceptions for each row execute procedure public.set_updated_at();
create trigger release_recommendations_set_updated_at before update on public.release_recommendations for each row execute procedure public.set_updated_at();

-- Row Level Security: browser clients can only read records belonging to an
-- organization of which they are active members. There are intentionally no
-- browser write policies in the foundation migration.
alter table public.profiles enable row level security;
create policy profiles_read_self on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

alter table public.organization_memberships enable row level security;
create policy memberships_read_self on public.organization_memberships for select to authenticated using (user_id = auth.uid());

alter table public.organizations enable row level security;
create policy organizations_read_member on public.organizations for select to authenticated using (private.is_org_member(id));

do $$
declare
  tenant_table text;
begin
  foreach tenant_table in array array[
    'projects', 'project_members', 'project_sites', 'project_phases', 'suppliers',
    'boq_versions', 'boq_lines', 'material_packages', 'purchase_requests', 'purchase_request_lines',
    'approval_actions', 'deliveries', 'delivery_lines', 'material_batches', 'evidence_assets',
    'evidence_links', 'verifications', 'exceptions', 'exception_events', 'release_recommendations',
    'release_recommendation_items', 'audit_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', tenant_table);
    execute format(
      'create policy tenant_read on public.%I for select to authenticated using (private.is_org_member(organization_id))',
      tenant_table
    );
  end loop;
end;
$$;

-- Internal event payloads can contain integration metadata; browser sessions
-- never read the outbox directly.
alter table public.outbox_events enable row level security;

-- Private evidence bucket. The server issues short-lived signed upload/download
-- URLs only after it has validated a user's project membership and action.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'buildproof-evidence',
  'buildproof-evidence',
  false,
  26214400,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

comment on table public.audit_events is 'Append-only application audit log. No browser write policy is ever granted.';
comment on table public.evidence_assets is 'Private Storage metadata. Object bytes stay in the buildproof-evidence bucket.';
comment on table public.release_recommendations is 'Decision support only; never a direct payment instruction.';
