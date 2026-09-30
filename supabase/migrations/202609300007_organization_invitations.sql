-- Secure, email-bound team invitations. The raw bearer token is returned once
-- to the inviter; only its SHA-256 digest is persisted.
create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  role public.membership_role not null check (role <> 'organization_owner'),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  invited_by uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index organization_invitations_org_pending_idx
  on public.organization_invitations (organization_id, created_at desc)
  where accepted_at is null and revoked_at is null;
create unique index organization_invitations_one_pending_email_idx
  on public.organization_invitations (organization_id, email)
  where accepted_at is null and revoked_at is null;

alter table public.organization_invitations enable row level security;
create policy organization_invitations_read_member
  on public.organization_invitations for select to authenticated
  using (private.is_org_member(organization_id));

create or replace function public.create_organization_invitation(
  p_organization_id uuid,
  p_email text,
  p_role public.membership_role
)
returns table (invitation_id uuid, invite_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(p_email));
  bearer_token text := gen_random_uuid()::text || gen_random_uuid()::text;
  invitation_row_id uuid;
  invitation_expiry timestamptz := timezone('utc', now()) + interval '7 days';
begin
  if auth.uid() is null then
    raise exception 'An authenticated user is required.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_memberships m
    where m.organization_id = p_organization_id and m.user_id = auth.uid()
      and m.status = 'active' and m.role in ('organization_owner', 'organization_admin')
  ) then
    raise exception 'Only an organisation owner or administrator can invite colleagues.' using errcode = '42501';
  end if;
  if p_role = 'organization_admin' and not exists (
    select 1 from public.organization_memberships m
    where m.organization_id = p_organization_id and m.user_id = auth.uid()
      and m.status = 'active' and m.role = 'organization_owner'
  ) then
    raise exception 'Only an organisation owner can appoint another administrator.' using errcode = '42501';
  end if;
  if normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    or p_role = 'organization_owner' then
    raise exception 'Invitation email or role is invalid.' using errcode = '22023';
  end if;
  if exists (
    select 1 from auth.users u
    join public.organization_memberships m on m.user_id = u.id
    where m.organization_id = p_organization_id and m.status = 'active'
      and lower(u.email) = normalized_email
  ) then
    raise exception 'That person is already an active organisation member.' using errcode = '23505';
  end if;

  update public.organization_invitations
    set revoked_at = timezone('utc', now())
    where organization_id = p_organization_id and email = normalized_email
      and accepted_at is null and revoked_at is null;

  insert into public.organization_invitations (
    organization_id, email, role, token_hash, invited_by, expires_at
  ) values (
    p_organization_id, normalized_email, p_role,
    encode(sha256(convert_to(bearer_token, 'UTF8')), 'hex'), auth.uid(), invitation_expiry
  ) returning id into invitation_row_id;

  insert into public.audit_events (
    organization_id, actor_id, event_type, entity_type, entity_id, after_state
  ) values (
    p_organization_id, auth.uid(), 'organization.invitation_created', 'organization_invitation',
    invitation_row_id, jsonb_build_object('email', normalized_email, 'role', p_role)
  );

  return query select invitation_row_id, bearer_token, invitation_expiry;
end;
$$;

create or replace function public.accept_organization_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.organization_invitations%rowtype;
  current_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  current_name text;
begin
  if auth.uid() is null or current_email = '' then
    raise exception 'Sign in with the invited email address to accept this invitation.' using errcode = '42501';
  end if;
  if p_token is null or length(p_token) < 60 then
    raise exception 'This invitation link is invalid or expired.' using errcode = '22023';
  end if;

  select * into invitation
  from public.organization_invitations i
  where i.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
  for update;
  if not found or invitation.accepted_at is not null or invitation.revoked_at is not null
    or invitation.expires_at <= timezone('utc', now()) then
    raise exception 'This invitation link is invalid or expired.' using errcode = '22023';
  end if;
  if invitation.email <> current_email then
    raise exception 'Sign in with the email address this invitation was sent to.' using errcode = '42501';
  end if;

  current_name := nullif(trim(coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', '')), '');
  if current_name is null then current_name := split_part(current_email, '@', 1); end if;
  insert into public.profiles (id, display_name)
    values (auth.uid(), current_name)
    on conflict (id) do nothing;

  insert into public.organization_memberships (
    organization_id, user_id, role, status, invited_by, invited_at, accepted_at
  ) values (
    invitation.organization_id, auth.uid(), invitation.role, 'active',
    invitation.invited_by, invitation.created_at, timezone('utc', now())
  ) on conflict (organization_id, user_id) do update
    set role = excluded.role, status = 'active', invited_by = excluded.invited_by,
        invited_at = excluded.invited_at, accepted_at = excluded.accepted_at,
        updated_at = timezone('utc', now());

  update public.organization_invitations
    set accepted_at = timezone('utc', now()) where id = invitation.id;
  insert into public.audit_events (
    organization_id, actor_id, event_type, entity_type, entity_id, after_state
  ) values (
    invitation.organization_id, auth.uid(), 'organization.invitation_accepted',
    'organization_invitation', invitation.id,
    jsonb_build_object('email', current_email, 'role', invitation.role)
  );
  return invitation.organization_id;
end;
$$;

revoke all on function public.create_organization_invitation(uuid, text, public.membership_role) from public;
revoke all on function public.accept_organization_invitation(text) from public;
grant execute on function public.create_organization_invitation(uuid, text, public.membership_role) to authenticated;
grant execute on function public.accept_organization_invitation(text) to authenticated;
