-- Project evidence upload: private tenant-scoped object storage with an
-- audited metadata/link command. Browser clients never receive service-role
-- credentials and cannot write evidence metadata directly.

drop policy if exists buildproof_evidence_member_read on storage.objects;
create policy buildproof_evidence_member_read
on storage.objects for select to authenticated
using (
  bucket_id = 'buildproof-evidence'
  and coalesce(array_length(storage.foldername(name), 1), 0) = 3
  and private.is_org_member((storage.foldername(name))[1]::uuid)
  and exists (
    select 1 from public.projects project
    where project.id = (storage.foldername(name))[2]::uuid
      and project.organization_id = (storage.foldername(name))[1]::uuid
  )
);

drop policy if exists buildproof_evidence_member_upload on storage.objects;
create policy buildproof_evidence_member_upload
on storage.objects for insert to authenticated
with check (
  bucket_id = 'buildproof-evidence'
  and coalesce(array_length(storage.foldername(name), 1), 0) = 3
  and private.is_org_member((storage.foldername(name))[1]::uuid)
  and (storage.foldername(name))[3] = auth.uid()::text
  and exists (
    select 1 from public.projects project
    where project.id = (storage.foldername(name))[2]::uuid
      and project.organization_id = (storage.foldername(name))[1]::uuid
  )
);

drop policy if exists buildproof_evidence_orphan_cleanup on storage.objects;
create policy buildproof_evidence_orphan_cleanup
on storage.objects for delete to authenticated
using (
  bucket_id = 'buildproof-evidence'
  and coalesce(array_length(storage.foldername(name), 1), 0) = 3
  and (storage.foldername(name))[3] = auth.uid()::text
  and not exists (
    select 1 from public.evidence_assets asset
    where asset.bucket_id = 'buildproof-evidence'
      and asset.object_path = name
  )
);

create or replace function public.register_delivery_evidence(
  p_project_id uuid,
  p_delivery_id uuid,
  p_object_path text,
  p_original_filename text,
  p_mime_type text,
  p_byte_size bigint,
  p_sha256 text,
  p_caption text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private, storage
as $$
declare
  v_organization_id uuid;
  v_role public.membership_role;
  v_asset_id uuid;
  v_prefix text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select project.organization_id into v_organization_id
  from public.projects project
  where project.id = p_project_id
  for key share;
  if not found then raise exception 'Project was not found.' using errcode = 'P0002'; end if;

  select membership.role into v_role
  from public.organization_memberships membership
  where membership.organization_id = v_organization_id
    and membership.user_id = auth.uid()
    and membership.status = 'active';
  if v_role is null then raise exception 'You do not have access to this project.' using errcode = '42501'; end if;
  if v_role not in ('organization_owner','organization_admin','project_director','contractor_manager','engineer','site_receiver') then
    raise exception 'Your role cannot upload project evidence.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.deliveries delivery
    where delivery.id = p_delivery_id
      and delivery.organization_id = v_organization_id
      and delivery.project_id = p_project_id
      and delivery.status <> 'void'
  ) then
    raise exception 'Choose an active delivery in this project.' using errcode = '22023';
  end if;

  if p_mime_type not in ('image/jpeg','image/png','application/pdf')
     or p_byte_size is null or p_byte_size < 1 or p_byte_size > 26214400
     or char_length(trim(coalesce(p_original_filename, ''))) not between 1 and 255
     or char_length(trim(coalesce(p_caption, ''))) not between 3 and 1000
     or coalesce(p_sha256, '') !~ '^[A-Fa-f0-9]{64}$' then
    raise exception 'Evidence file or details are invalid.' using errcode = '22023';
  end if;

  v_prefix := v_organization_id::text || '/' || p_project_id::text || '/' || auth.uid()::text || '/';
  if p_object_path is null or left(p_object_path, char_length(v_prefix)) <> v_prefix
     or coalesce(array_length(storage.foldername(p_object_path), 1), 0) <> 3 then
    raise exception 'Evidence object path is invalid.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from storage.objects object
    where object.bucket_id = 'buildproof-evidence'
      and object.name = p_object_path
  ) then
    raise exception 'Uploaded evidence file was not found.' using errcode = 'P0002';
  end if;

  insert into public.evidence_assets (
    organization_id, bucket_id, object_path, original_filename,
    mime_type, byte_size, sha256, uploaded_by
  ) values (
    v_organization_id, 'buildproof-evidence', p_object_path,
    trim(p_original_filename), p_mime_type, p_byte_size, lower(p_sha256), auth.uid()
  ) returning id into v_asset_id;

  insert into public.evidence_links (
    organization_id, project_id, evidence_asset_id, subject_type,
    subject_id, caption, created_by
  ) values (
    v_organization_id, p_project_id, v_asset_id, 'delivery',
    p_delivery_id, trim(p_caption), auth.uid()
  );

  insert into public.audit_events (
    organization_id, project_id, actor_id, event_type, entity_type,
    entity_id, after_state, source
  ) values (
    v_organization_id, p_project_id, auth.uid(), 'evidence_attached',
    'evidence_asset', v_asset_id,
    jsonb_build_object(
      'delivery_id', p_delivery_id,
      'filename', trim(p_original_filename),
      'mime_type', p_mime_type,
      'byte_size', p_byte_size,
      'sha256', lower(p_sha256),
      'caption', trim(p_caption)
    ), 'application'
  );

  return v_asset_id;
end;
$$;

revoke all on function public.register_delivery_evidence(uuid, uuid, text, text, text, bigint, text, text) from public;
grant execute on function public.register_delivery_evidence(uuid, uuid, text, text, text, bigint, text, text) to authenticated;

comment on function public.register_delivery_evidence(uuid, uuid, text, text, text, bigint, text, text)
is 'Registers a private uploaded file as delivery evidence and writes its tenant/project audit event. SHA-256 is computed by the authenticated browser client and is an integrity hint, not a trusted signature.';
