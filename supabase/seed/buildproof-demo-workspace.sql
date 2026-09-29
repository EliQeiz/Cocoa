-- BuildProof demonstration tenant data
--
-- This is intentionally synthetic. It enriches the organisation owned by
-- elishaafari0@gmail.com once and leaves user-entered records untouched.
-- It is safe to run repeatedly: the audit marker stops duplicate inserts.

do $$
declare
  v_user_id uuid;
  v_organization_id uuid;
  v_project_id uuid;
  v_site_id uuid;
  v_boq_id uuid;
  v_boq_line_id uuid;
  v_package_id uuid;
  v_request_id uuid;
  v_version_number integer;
  i integer;
  v_package_status public.batch_status;
  v_package_name text;
  v_approved_quantity numeric;
  v_received_quantity numeric;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = 'elishaafari0@gmail.com'
  limit 1;

  if v_user_id is null then
    raise exception 'The BuildProof owner account was not found.';
  end if;

  insert into public.profiles (id, display_name, job_title)
  values (v_user_id, 'Jordan Lee', 'Project Manager')
  on conflict (id) do update
    set display_name = excluded.display_name,
        job_title = excluded.job_title,
        updated_at = timezone('utc', now());

  select organization_id into v_organization_id
  from public.organization_memberships
  where user_id = v_user_id and status = 'active'
  order by created_at
  limit 1;

  if v_organization_id is null then
    raise exception 'The BuildProof owner does not have an active organisation.';
  end if;

  update public.organizations
  set display_name = 'Ridgeview Construction',
      legal_name = 'Ridgeview Construction Limited',
      settings = settings || jsonb_build_object(
        'demo_workspace', true,
        'reported_progress', 62,
        'project_classification', 'Public infrastructure'
      )
  where id = v_organization_id;

  select id into v_project_id
  from public.projects
  where organization_id = v_organization_id
  order by created_at
  limit 1;

  if v_project_id is null then
    insert into public.projects (
      organization_id, project_code, name, status, client_name,
      planned_start_date, planned_end_date, created_by
    ) values (
      v_organization_id, 'PRJ-1047', 'Northbank Civic Centre', 'active',
      'Public infrastructure', date '2024-01-01', date '2026-12-31', v_user_id
    ) returning id into v_project_id;
  else
    update public.projects
    set project_code = 'PRJ-1047',
        name = 'Northbank Civic Centre',
        status = 'active',
        client_name = 'Public infrastructure',
        planned_start_date = date '2024-01-01',
        planned_end_date = date '2026-12-31'
    where id = v_project_id;
  end if;

  update public.project_sites
  set name = 'Northbank Civic Centre',
      locality = 'Accra, Greater Accra',
      address_text = 'Northbank Civic Centre, Greater Accra',
      latitude = 5.603700,
      longitude = -0.187000,
      is_active = true
  where organization_id = v_organization_id and project_id = v_project_id;

  select id into v_site_id
  from public.project_sites
  where organization_id = v_organization_id and project_id = v_project_id
  order by created_at
  limit 1;

  if v_site_id is null then
    insert into public.project_sites (
      organization_id, project_id, name, locality, address_text, latitude, longitude
    ) values (
      v_organization_id, v_project_id, 'Northbank Civic Centre',
      'Accra, Greater Accra', 'Northbank Civic Centre, Greater Accra', 5.603700, -0.187000
    ) returning id into v_site_id;
  end if;

  if exists (
    select 1 from public.audit_events
    where organization_id = v_organization_id
      and project_id = v_project_id
      and event_type = 'demo_seed_initialized'
  ) then
    return;
  end if;

  select id into v_boq_id
  from public.boq_versions
  where organization_id = v_organization_id
    and project_id = v_project_id
    and source_filename = 'buildproof-demo-baseline.csv'
  limit 1;

  if v_boq_id is null then
    select coalesce(max(version_number), 0) + 1 into v_version_number
    from public.boq_versions
    where project_id = v_project_id;

    insert into public.boq_versions (
      organization_id, project_id, version_number, status, source_filename,
      source_hash, approved_at, approved_by, created_by
    ) values (
      v_organization_id, v_project_id, v_version_number, 'approved',
      'buildproof-demo-baseline.csv', repeat('a', 64),
      timestamptz '2025-01-15 09:00:00+00', v_user_id, v_user_id
    ) returning id into v_boq_id;
  end if;

  for i in 1..145 loop
    v_package_name := case i
      when 1 then 'Cement (C35)'
      when 2 then 'Rebar (B500B)'
      when 3 then 'Aggregates (Graded)'
      when 4 then 'Bitumen (60/70)'
      when 5 then 'Precast elements'
      else format('Demonstration material package %s', lpad(i::text, 3, '0'))
    end;
    v_package_status := case
      when i in (1, 2, 4) or i between 6 and 126 then 'acceptable'::public.batch_status
      when i = 3 or i between 127 and 143 then 'pending_review'::public.batch_status
      else 'rejected'::public.batch_status
    end;
    v_approved_quantity := case i
      when 1 then 50 when 2 then 30 when 3 then 20 when 4 then 10 when 5 then 5
      else 100
    end;
    v_received_quantity := case i
      when 1 then 42 when 2 then 28 when 3 then 16 when 4 then 8 when 5 then 2
      when v_package_status = 'acceptable'::public.batch_status then 86 else 65
    end;

    insert into public.boq_lines (
      organization_id, project_id, boq_version_id, line_code, description,
      material_category, specification, unit, approved_quantity, unit_rate,
      quantity_tolerance_pct
    ) values (
      v_organization_id, v_project_id, v_boq_id, format('DEMO-%s', lpad(i::text, 3, '0')),
      v_package_name, 'Construction materials', 'BuildProof demo specification',
      'units', v_approved_quantity, 1, 5
    ) returning id into v_boq_line_id;

    insert into public.material_packages (
      organization_id, project_id, boq_line_id, package_code, name, status,
      approved_quantity, received_quantity, verified_quantity, created_at
    ) values (
      v_organization_id, v_project_id, v_boq_line_id,
      format('BP-DEMO-%s', lpad(i::text, 3, '0')), v_package_name, v_package_status,
      v_approved_quantity, v_received_quantity,
      case when v_package_status = 'acceptable'::public.batch_status then v_received_quantity else 0 end,
      case i
        when 1 then timestamptz '2025-04-12 10:00:00+00'
        when 2 then timestamptz '2025-04-11 10:00:00+00'
        when 3 then timestamptz '2025-04-10 10:00:00+00'
        when 4 then timestamptz '2025-04-09 10:00:00+00'
        when 5 then timestamptz '2025-04-08 10:00:00+00'
        else timestamptz '2025-03-01 10:00:00+00' + make_interval(days => i)
      end
    );
  end loop;

  for i in 1..504 loop
    select id into v_package_id
    from public.material_packages
    where project_id = v_project_id
    order by package_code
    offset ((i - 1) % 145)
    limit 1;

    insert into public.verifications (
      organization_id, project_id, project_site_id, material_package_id, status,
      observed_quantity, unit, findings, verified_by, verified_at
    ) values (
      v_organization_id, v_project_id, v_site_id, v_package_id,
      case when i <= 438 then 'accepted'::public.verification_status
           when i <= 500 then 'submitted'::public.verification_status
           else 'rejected'::public.verification_status end,
      1, 'units', 'Synthetic demonstration verification', v_user_id,
      timestamptz '2025-04-01 09:00:00+00' + make_interval(hours => i)
    );
  end loop;

  for i in 1..24 loop
    insert into public.purchase_requests (
      organization_id, project_id, request_number, status, requested_by,
      requested_at, needed_by_date, purpose, idempotency_key
    ) values (
      v_organization_id, v_project_id, format('PR-DEMO-%s', lpad(i::text, 3, '0')),
      'approved', v_user_id, timestamptz '2025-03-01 08:00:00+00' + make_interval(days => i),
      date '2025-04-30', 'Synthetic demonstration procurement request', gen_random_uuid()
    ) returning id into v_request_id;

    insert into public.approval_actions (
      organization_id, project_id, purchase_request_id, decision, rationale, acted_by, acted_at
    ) values (
      v_organization_id, v_project_id, v_request_id,
      case when i <= 5 then 'approved'::public.approval_decision
           when i <= 17 then 'queried'::public.approval_decision
           else 'rejected'::public.approval_decision end,
      'Synthetic demonstration approval action', v_user_id,
      timestamptz '2025-04-01 11:00:00+00' + make_interval(hours => i)
    );
  end loop;

  for i in 1..3 loop
    select id into v_package_id
    from public.material_packages
    where project_id = v_project_id
    order by package_code
    offset (i - 1)
    limit 1;
    insert into public.exceptions (
      organization_id, project_id, material_package_id, severity, status, title,
      description, owner_id, due_at, opened_by
    ) values (
      v_organization_id, v_project_id, v_package_id,
      case i when 1 then 'medium'::public.exception_severity
             when 2 then 'high'::public.exception_severity else 'low'::public.exception_severity end,
      case when i = 2 then 'in_review'::public.exception_status else 'open'::public.exception_status end,
      format('Synthetic demonstration risk %s', i),
      'A deliberately synthetic risk for the BuildProof workspace demonstration.',
      v_user_id, timestamptz '2025-05-01 09:00:00+00' + make_interval(days => i), v_user_id
    );
  end loop;

  insert into public.release_recommendations (
    organization_id, project_id, recommendation_number, status, recommended_amount,
    currency_code, rationale, prepared_by, created_at
  ) values (
    v_organization_id, v_project_id, 'REL-DEMO-001', 'ready_for_review', 1280000,
    'GHS', 'Synthetic evidence coverage meets the demonstration release threshold.',
    v_user_id, timestamptz '2025-04-12 12:00:00+00'
  );

  insert into public.audit_events (
    organization_id, project_id, actor_id, event_type, entity_type, entity_id, occurred_at, source
  ) values
    (v_organization_id, v_project_id, v_user_id, 'evidence_uploaded', 'evidence_asset', v_project_id, timestamptz '2025-04-12 14:00:00+00', 'import'),
    (v_organization_id, v_project_id, v_user_id, 'risk_updated', 'exception', v_project_id, timestamptz '2025-04-12 12:00:00+00', 'import'),
    (v_organization_id, v_project_id, v_user_id, 'approval_requested', 'purchase_request', v_project_id, timestamptz '2025-04-11 16:00:00+00', 'import'),
    (v_organization_id, v_project_id, v_user_id, 'material_recorded', 'material_package', v_project_id, timestamptz '2025-04-11 10:00:00+00', 'import'),
    (v_organization_id, v_project_id, v_user_id, 'inspection_completed', 'verification', v_project_id, timestamptz '2025-04-10 15:00:00+00', 'import'),
    (v_organization_id, v_project_id, v_user_id, 'demo_seed_initialized', 'project', v_project_id, timezone('utc', now()), 'import');
end;
$$;

