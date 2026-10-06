-- Enterprise construction-control workflows.
-- Adds the core coordination records expected beside materials and evidence:
-- RFIs, submittals, daily site logs and change orders. Browser writes remain
-- command-only; every command validates tenant role and appends an audit event.

create table public.project_rfis (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  rfi_number text not null check (char_length(trim(rfi_number)) between 2 and 48),
  subject text not null check (char_length(trim(subject)) between 3 and 240),
  question text not null check (char_length(trim(question)) between 3 and 6000),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'critical')),
  status text not null default 'open' check (status in ('draft', 'open', 'answered', 'closed', 'void')),
  due_at date,
  response text check (response is null or char_length(trim(response)) between 3 and 6000),
  raised_by uuid references public.profiles(id) on delete set null,
  answered_by uuid references public.profiles(id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, rfi_number),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade
);

create table public.project_submittals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  submittal_number text not null check (char_length(trim(submittal_number)) between 2 and 48),
  title text not null check (char_length(trim(title)) between 3 and 240),
  specification_section text check (specification_section is null or char_length(trim(specification_section)) <= 160),
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'under_review', 'approved', 'approved_as_noted', 'revise_resubmit', 'rejected', 'void')),
  due_at date,
  review_notes text check (review_notes is null or char_length(trim(review_notes)) between 3 and 6000),
  submitted_by uuid references public.profiles(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, submittal_number),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade
);

create table public.project_daily_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  log_date date not null,
  weather text check (weather is null or char_length(trim(weather)) <= 160),
  work_summary text not null check (char_length(trim(work_summary)) between 3 and 8000),
  workforce_count integer not null default 0 check (workforce_count between 0 and 100000),
  incidents text check (incidents is null or char_length(trim(incidents)) <= 4000),
  delays text check (delays is null or char_length(trim(delays)) <= 4000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, log_date),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade
);

create table public.project_change_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  change_number text not null check (char_length(trim(change_number)) between 2 and 48),
  title text not null check (char_length(trim(title)) between 3 and 240),
  description text not null check (char_length(trim(description)) between 3 and 6000),
  status text not null default 'proposed' check (status in ('draft', 'proposed', 'under_review', 'approved', 'rejected', 'void')),
  amount numeric(18,2) check (amount is null or amount >= 0),
  currency_code char(3) not null default 'GHS' check (currency_code ~ '^[A-Z]{3}$'),
  requested_by uuid references public.profiles(id) on delete set null,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  decision_rationale text check (decision_rationale is null or char_length(trim(decision_rationale)) between 3 and 4000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, change_number),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade
);

create index project_rfis_status_due_idx on public.project_rfis (organization_id, project_id, status, due_at);
create index project_submittals_status_due_idx on public.project_submittals (organization_id, project_id, status, due_at);
create index project_daily_logs_date_idx on public.project_daily_logs (organization_id, project_id, log_date desc);
create index project_change_orders_status_idx on public.project_change_orders (organization_id, project_id, status, created_at desc);

create trigger project_rfis_set_updated_at before update on public.project_rfis for each row execute procedure public.set_updated_at();
create trigger project_submittals_set_updated_at before update on public.project_submittals for each row execute procedure public.set_updated_at();
create trigger project_daily_logs_set_updated_at before update on public.project_daily_logs for each row execute procedure public.set_updated_at();
create trigger project_change_orders_set_updated_at before update on public.project_change_orders for each row execute procedure public.set_updated_at();

alter table public.project_rfis enable row level security;
alter table public.project_submittals enable row level security;
alter table public.project_daily_logs enable row level security;
alter table public.project_change_orders enable row level security;

create policy tenant_read on public.project_rfis for select to authenticated using (private.is_org_member(organization_id));
create policy tenant_read on public.project_submittals for select to authenticated using (private.is_org_member(organization_id));
create policy tenant_read on public.project_daily_logs for select to authenticated using (private.is_org_member(organization_id));
create policy tenant_read on public.project_change_orders for select to authenticated using (private.is_org_member(organization_id));

revoke all on public.project_rfis, public.project_submittals, public.project_daily_logs, public.project_change_orders from anon, authenticated;
grant select on public.project_rfis, public.project_submittals, public.project_daily_logs, public.project_change_orders to authenticated;

create or replace function private.require_project_role(
  p_project_id uuid,
  p_allowed_roles public.membership_role[]
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_organization_id uuid;
  v_role public.membership_role;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  select project.organization_id into v_organization_id
  from public.projects project where project.id = p_project_id for key share;
  if not found then raise exception 'Project was not found.' using errcode = 'P0002'; end if;
  select membership.role into v_role
  from public.organization_memberships membership
  where membership.organization_id = v_organization_id
    and membership.user_id = auth.uid()
    and membership.status = 'active';
  if v_role is null or not (v_role = any(p_allowed_roles)) then
    raise exception 'Your role cannot perform this project action.' using errcode = '42501';
  end if;
  return v_organization_id;
end;
$$;

revoke all on function private.require_project_role(uuid, public.membership_role[]) from public, anon, authenticated;

create or replace function public.create_project_rfi(
  p_project_id uuid,
  p_rfi_number text,
  p_subject text,
  p_question text,
  p_priority text default 'normal',
  p_due_at date default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_organization_id uuid;
  v_id uuid;
begin
  v_organization_id := private.require_project_role(p_project_id, array[
    'organization_owner','organization_admin','project_director','contractor_manager','engineer','quantity_surveyor'
  ]::public.membership_role[]);
  if char_length(trim(coalesce(p_rfi_number, ''))) not between 2 and 48
     or char_length(trim(coalesce(p_subject, ''))) not between 3 and 240
     or char_length(trim(coalesce(p_question, ''))) not between 3 and 6000
     or p_priority not in ('low','normal','high','critical') then
    raise exception 'Enter a valid RFI number, subject, question and priority.' using errcode = '22023';
  end if;
  insert into public.project_rfis (organization_id, project_id, rfi_number, subject, question, priority, due_at, raised_by)
  values (v_organization_id, p_project_id, trim(p_rfi_number), trim(p_subject), trim(p_question), p_priority, p_due_at, auth.uid())
  returning id into v_id;
  insert into public.audit_events (organization_id, project_id, actor_id, event_type, entity_type, entity_id, after_state, source)
  values (v_organization_id, p_project_id, auth.uid(), 'rfi_created', 'project_rfi', v_id,
    jsonb_build_object('rfi_number', trim(p_rfi_number), 'status', 'open', 'priority', p_priority), 'application');
  return v_id;
end;
$$;

create or replace function public.create_project_submittal(
  p_project_id uuid,
  p_submittal_number text,
  p_title text,
  p_specification_section text default null,
  p_due_at date default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_organization_id uuid;
  v_id uuid;
begin
  v_organization_id := private.require_project_role(p_project_id, array[
    'organization_owner','organization_admin','project_director','contractor_manager','engineer','quantity_surveyor'
  ]::public.membership_role[]);
  if char_length(trim(coalesce(p_submittal_number, ''))) not between 2 and 48
     or char_length(trim(coalesce(p_title, ''))) not between 3 and 240
     or char_length(trim(coalesce(p_specification_section, ''))) > 160 then
    raise exception 'Enter a valid submittal number, title and specification section.' using errcode = '22023';
  end if;
  insert into public.project_submittals (organization_id, project_id, submittal_number, title, specification_section, due_at, submitted_by)
  values (v_organization_id, p_project_id, trim(p_submittal_number), trim(p_title), nullif(trim(p_specification_section), ''), p_due_at, auth.uid())
  returning id into v_id;
  insert into public.audit_events (organization_id, project_id, actor_id, event_type, entity_type, entity_id, after_state, source)
  values (v_organization_id, p_project_id, auth.uid(), 'submittal_created', 'project_submittal', v_id,
    jsonb_build_object('submittal_number', trim(p_submittal_number), 'status', 'submitted'), 'application');
  return v_id;
end;
$$;

create or replace function public.create_project_daily_log(
  p_project_id uuid,
  p_log_date date,
  p_weather text,
  p_work_summary text,
  p_workforce_count integer default 0,
  p_incidents text default null,
  p_delays text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_organization_id uuid;
  v_id uuid;
begin
  v_organization_id := private.require_project_role(p_project_id, array[
    'organization_owner','organization_admin','project_director','contractor_manager','engineer','site_receiver'
  ]::public.membership_role[]);
  if p_log_date is null or p_log_date > current_date + 1
     or char_length(trim(coalesce(p_weather, ''))) > 160
     or char_length(trim(coalesce(p_work_summary, ''))) not between 3 and 8000
     or p_workforce_count not between 0 and 100000
     or char_length(trim(coalesce(p_incidents, ''))) > 4000
     or char_length(trim(coalesce(p_delays, ''))) > 4000 then
    raise exception 'Enter a valid log date, work summary and workforce count.' using errcode = '22023';
  end if;
  insert into public.project_daily_logs (organization_id, project_id, log_date, weather, work_summary, workforce_count, incidents, delays, created_by)
  values (v_organization_id, p_project_id, p_log_date, nullif(trim(p_weather), ''), trim(p_work_summary), p_workforce_count, nullif(trim(p_incidents), ''), nullif(trim(p_delays), ''), auth.uid())
  returning id into v_id;
  insert into public.audit_events (organization_id, project_id, actor_id, event_type, entity_type, entity_id, after_state, source)
  values (v_organization_id, p_project_id, auth.uid(), 'daily_log_created', 'project_daily_log', v_id,
    jsonb_build_object('log_date', p_log_date, 'workforce_count', p_workforce_count), 'application');
  return v_id;
end;
$$;

create or replace function public.create_project_change_order(
  p_project_id uuid,
  p_change_number text,
  p_title text,
  p_description text,
  p_amount numeric default null,
  p_currency_code text default 'GHS'
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_organization_id uuid;
  v_id uuid;
begin
  v_organization_id := private.require_project_role(p_project_id, array[
    'organization_owner','organization_admin','project_director','contractor_manager','quantity_surveyor','finance_reviewer'
  ]::public.membership_role[]);
  if char_length(trim(coalesce(p_change_number, ''))) not between 2 and 48
     or char_length(trim(coalesce(p_title, ''))) not between 3 and 240
     or char_length(trim(coalesce(p_description, ''))) not between 3 and 6000
     or (p_amount is not null and p_amount < 0)
     or p_currency_code !~ '^[A-Z]{3}$' then
    raise exception 'Enter a valid change number, title, description, amount and currency.' using errcode = '22023';
  end if;
  insert into public.project_change_orders (organization_id, project_id, change_number, title, description, amount, currency_code, requested_by)
  values (v_organization_id, p_project_id, trim(p_change_number), trim(p_title), trim(p_description), p_amount, p_currency_code::char(3), auth.uid())
  returning id into v_id;
  insert into public.audit_events (organization_id, project_id, actor_id, event_type, entity_type, entity_id, after_state, source)
  values (v_organization_id, p_project_id, auth.uid(), 'change_order_created', 'project_change_order', v_id,
    jsonb_build_object('change_number', trim(p_change_number), 'status', 'proposed', 'amount', p_amount, 'currency_code', p_currency_code), 'application');
  return v_id;
end;
$$;

revoke all on function public.create_project_rfi(uuid, text, text, text, text, date) from public, anon;
revoke all on function public.create_project_submittal(uuid, text, text, text, date) from public, anon;
revoke all on function public.create_project_daily_log(uuid, date, text, text, integer, text, text) from public, anon;
revoke all on function public.create_project_change_order(uuid, text, text, text, numeric, text) from public, anon;
grant execute on function public.create_project_rfi(uuid, text, text, text, text, date) to authenticated;
grant execute on function public.create_project_submittal(uuid, text, text, text, date) to authenticated;
grant execute on function public.create_project_daily_log(uuid, date, text, text, integer, text, text) to authenticated;
grant execute on function public.create_project_change_order(uuid, text, text, text, numeric, text) to authenticated;

do $$
declare
  publication_table text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach publication_table in array array[
      'project_rfis', 'project_submittals', 'project_daily_logs', 'project_change_orders'
    ] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = publication_table
      ) then
        execute format('alter publication supabase_realtime add table public.%I', publication_table);
      end if;
    end loop;
  end if;
end;
$$;

comment on table public.project_rfis is 'Audited requests for information scoped to one tenant project.';
comment on table public.project_submittals is 'Audited construction submittal register scoped to one tenant project.';
comment on table public.project_daily_logs is 'Daily field production, weather, workforce and incident record.';
comment on table public.project_change_orders is 'Controlled change-order register; records are not payment instructions.';
