-- Multi-tenant authorization baseline for AgriTrace.
-- `public.users.id` must equal the authenticated Supabase user UUID.

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.users where id = auth.uid() limit 1;
$$;

revoke all on function public.current_organization_id() from public;
grant execute on function public.current_organization_id() to authenticated;

alter table districts add column if not exists organization_id uuid references organizations(id);
alter table societies add column if not exists organization_id uuid references organizations(id);
alter table farmers add column if not exists organization_id uuid references organizations(id);
alter table farms add column if not exists organization_id uuid references organizations(id);
alter table farm_polygons add column if not exists organization_id uuid references organizations(id);
alter table field_agents add column if not exists organization_id uuid references organizations(id);
alter table warehouses add column if not exists organization_id uuid references organizations(id);
alter table purchases add column if not exists organization_id uuid references organizations(id);
alter table bags add column if not exists organization_id uuid references organizations(id);
alter table lots add column if not exists organization_id uuid references organizations(id);
alter table batch_movements add column if not exists organization_id uuid references organizations(id);
alter table compliance_checks add column if not exists organization_id uuid references organizations(id);
alter table risk_alerts add column if not exists organization_id uuid references organizations(id);
alter table sync_events add column if not exists organization_id uuid references organizations(id);

do $$
declare tbl text;
begin
  foreach tbl in array array['regions','districts','societies','farmers','farms','farm_polygons','field_agents','warehouses','purchases','bags','lots','batch_movements','compliance_checks','risk_alerts','sync_events','audit_reports'] loop
    execute format('drop policy if exists organization_select on public.%I', tbl);
    execute format('drop policy if exists organization_insert on public.%I', tbl);
    execute format('drop policy if exists organization_update on public.%I', tbl);
    execute format('drop policy if exists organization_delete on public.%I', tbl);
    execute format('create policy organization_select on public.%I for select to authenticated using (organization_id = public.current_organization_id())', tbl);
    execute format('create policy organization_insert on public.%I for insert to authenticated with check (organization_id = public.current_organization_id())', tbl);
    execute format('create policy organization_update on public.%I for update to authenticated using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id())', tbl);
    execute format('create policy organization_delete on public.%I for delete to authenticated using (organization_id = public.current_organization_id())', tbl);
  end loop;
end $$;

drop policy if exists organization_select on public.organizations;
drop policy if exists organization_update on public.organizations;
create policy organization_select on public.organizations for select to authenticated using (id = public.current_organization_id());
create policy organization_update on public.organizations for update to authenticated using (id = public.current_organization_id()) with check (id = public.current_organization_id());

drop policy if exists organization_select on public.users;
drop policy if exists organization_insert on public.users;
drop policy if exists organization_update on public.users;
create policy organization_select on public.users for select to authenticated using (organization_id = public.current_organization_id());
create policy organization_insert on public.users for insert to authenticated with check (organization_id = public.current_organization_id());
create policy organization_update on public.users for update to authenticated using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id());
