-- Operational abuse controls for high-value construction workflow commands.
-- The audit trigger executes inside the same transaction as each command, so
-- exceeding a limit rolls back both the domain record and its audit event.

create or replace function private.rate_limit_audit_command()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, private
as $$
declare
  v_maximum integer := 120;
  v_window_seconds integer := 60;
begin
  if new.actor_id is null then return new; end if;

  case new.event_type
    when 'organization.invitation_created' then
      v_maximum := 10; v_window_seconds := 3600;
    when 'organization.created' then
      v_maximum := 3; v_window_seconds := 86400;
    when 'project.created' then
      v_maximum := 30; v_window_seconds := 3600;
    when 'evidence_attached' then
      v_maximum := 60; v_window_seconds := 3600;
    when 'rfi_created' then
      v_maximum := 60; v_window_seconds := 3600;
    when 'submittal_created' then
      v_maximum := 60; v_window_seconds := 3600;
    when 'daily_log_created' then
      v_maximum := 30; v_window_seconds := 3600;
    when 'change_order_created' then
      v_maximum := 20; v_window_seconds := 3600;
    else
      null;
  end case;

  perform private.enforce_action_rate_limit(new.actor_id, new.event_type, v_maximum, v_window_seconds);
  return new;
end;
$$;

revoke all on function private.rate_limit_audit_command() from public, anon, authenticated;

comment on function private.rate_limit_audit_command() is
  'Applies actor-scoped fixed-window limits to audited domain commands, including enterprise construction registers.';
