-- Start closed: real farmer, location, and financial data must never be public.
-- Add organization-scoped authenticated policies alongside the auth rollout.
alter table organizations enable row level security;
alter table users enable row level security;
alter table regions enable row level security;
alter table districts enable row level security;
alter table societies enable row level security;
alter table farmers enable row level security;
alter table farms enable row level security;
alter table farm_polygons enable row level security;
alter table field_agents enable row level security;
alter table warehouses enable row level security;
alter table purchases enable row level security;
alter table bags enable row level security;
alter table lots enable row level security;
alter table batch_movements enable row level security;
alter table compliance_checks enable row level security;
alter table risk_alerts enable row level security;
alter table sync_events enable row level security;
alter table audit_reports enable row level security;
