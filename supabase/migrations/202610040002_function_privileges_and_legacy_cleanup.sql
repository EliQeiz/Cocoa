-- Supabase projects may carry explicit default EXECUTE grants for anon even
-- after a function revokes PUBLIC. Remove anonymous discovery/execution from
-- every application-owned security-definer function, then grant only the
-- authenticated BuildProof command surface.

do $$
declare
  command record;
begin
  for command in
    select procedure.oid::regprocedure as signature
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname in ('public', 'private')
      and procedure.prosecdef
      and not exists (
        select 1 from pg_depend dependency
        where dependency.classid = 'pg_proc'::regclass
          and dependency.objid = procedure.oid
          and dependency.deptype = 'e'
      )
  loop
    execute format('revoke all on function %s from public, anon', command.signature);
  end loop;
end;
$$;

-- Old CocoaTrace procedures are not part of BuildProof. They remain in place
-- only to avoid an unsafe cascading drop, but no browser role can execute them.
revoke all on function public.accept_pending_invitation() from public, anon, authenticated;
revoke all on function public.capture_farmgate_purchase(uuid, uuid, numeric, numeric, numeric, text) from public, anon, authenticated;
revoke all on function public.current_organization_id() from public, anon, authenticated;
revoke all on function public.generate_audit_packet(text) from public, anon, authenticated;
revoke all on function public.register_producer_with_farm(uuid, uuid, text, text, text, text, numeric) from public, anon, authenticated;
revoke all on function public.resolve_risk_alert(uuid, text) from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- Future functions must opt into a callable browser role explicitly.
alter default privileges in schema public revoke execute on functions from public, anon;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;

grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.is_org_administrator(uuid) to authenticated;

grant execute on function public.create_organization(text, text, text, text) to authenticated;
grant execute on function public.create_first_project(uuid, text, text, text) to authenticated;
grant execute on function public.update_project_status(uuid, public.project_status) to authenticated;
grant execute on function public.create_project_exception(uuid, text, text, public.exception_severity, timestamptz) to authenticated;
grant execute on function public.create_project_delivery(uuid, text, text, text) to authenticated;
grant execute on function public.create_project_release_recommendation(uuid, text, numeric, char, text) to authenticated;
grant execute on function public.submit_material_purchase_request(uuid, text, text, numeric, text, date, text, numeric) to authenticated;
grant execute on function public.decide_purchase_request(uuid, public.approval_decision, text) to authenticated;
grant execute on function public.register_delivery_evidence(uuid, uuid, text, text, text, bigint, text, text) to authenticated;
grant execute on function public.receive_project_material_delivery(uuid, uuid, numeric, text, text, text, text, text) to authenticated;
grant execute on function public.create_project_batch_inspection(uuid, uuid, uuid, numeric, text, uuid) to authenticated;
grant execute on function public.review_project_inspection(uuid, public.verification_status, text) to authenticated;
grant execute on function public.create_organization_invitation(uuid, text, public.membership_role) to authenticated;
grant execute on function public.accept_organization_invitation(text) to authenticated;
grant execute on function public.revoke_organization_invitation(uuid) to authenticated;
