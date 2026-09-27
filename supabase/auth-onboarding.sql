-- Invitation-backed application authentication for AuraFlow AgriTrace.
-- Run after schema.sql, policies.sql, and org-policies.sql.
-- This intentionally does not expose invitation records to the browser.

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'field_agent',
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

alter table public.organization_invitations enable row level security;

create or replace function public.provision_invited_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.organization_invitations%rowtype;
begin
  select * into invitation
  from public.organization_invitations
  where lower(email) = lower(new.email)
    and accepted_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  -- Auth users are allowed to exist without a tenant. They receive no tenant data
  -- until a matching, unexpired invitation is found.
  if invitation.id is not null then
    insert into public.users (id, organization_id, full_name, role, email)
    values (
      new.id,
      invitation.organization_id,
      coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
      invitation.role,
      lower(new.email)
    )
    on conflict (id) do update set
      organization_id = excluded.organization_id,
      full_name = excluded.full_name,
      role = excluded.role,
      email = excluded.email;

    update public.organization_invitations
    set accepted_at = now()
    where id = invitation.id;
  end if;

  return new;
end;
$$;

drop trigger if exists provision_invited_user_on_auth_signup on auth.users;
create trigger provision_invited_user_on_auth_signup
  after insert on auth.users
  for each row execute procedure public.provision_invited_user();

-- Covers an invitation sent to an email that already exists in Supabase Auth.
-- The browser calls this only after authentication; the function derives the
-- email and user id from the JWT rather than accepting either as parameters.
create or replace function public.accept_pending_invitation()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.organization_invitations%rowtype;
  invited_email text := lower(auth.jwt() ->> 'email');
begin
  if auth.uid() is null or invited_email is null then
    return false;
  end if;

  select * into invitation
  from public.organization_invitations
  where lower(email) = invited_email
    and accepted_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if invitation.id is null then
    return exists (select 1 from public.users where id = auth.uid());
  end if;

  insert into public.users (id, organization_id, full_name, role, email)
  values (
    auth.uid(),
    invitation.organization_id,
    coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', split_part(invited_email, '@', 1)),
    invitation.role,
    invited_email
  )
  on conflict (id) do update set
    organization_id = excluded.organization_id,
    full_name = excluded.full_name,
    role = excluded.role,
    email = excluded.email;

  update public.organization_invitations
  set accepted_at = now()
  where id = invitation.id;

  return true;
end;
$$;

revoke all on function public.accept_pending_invitation() from public;
grant execute on function public.accept_pending_invitation() to authenticated;

-- Bootstrap the project owner into the synthetic pilot tenant. Change or remove
-- this invitation before inviting production field teams.
insert into public.organization_invitations (organization_id, email, role)
select id, 'elishaafari0@gmail.com', 'owner'
from public.organizations
where name = 'AuraFlow AgriTrace Synthetic Pilot 2026'
on conflict (organization_id, email) do update set
  role = excluded.role,
  expires_at = now() + interval '14 days',
  accepted_at = null;
