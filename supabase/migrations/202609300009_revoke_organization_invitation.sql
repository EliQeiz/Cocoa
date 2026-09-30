create or replace function public.revoke_organization_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.organization_invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'An authenticated user is required.' using errcode = '42501';
  end if;
  select * into invitation from public.organization_invitations i
  where i.id = p_invitation_id for update;
  if not found then
    raise exception 'Invitation not found.' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.organization_memberships m
    where m.organization_id = invitation.organization_id and m.user_id = auth.uid()
      and m.status = 'active' and m.role in ('organization_owner', 'organization_admin')
  ) then
    raise exception 'Only an organisation owner or administrator can revoke invitations.' using errcode = '42501';
  end if;
  if invitation.accepted_at is not null then
    raise exception 'An accepted invitation cannot be revoked; suspend the member instead.' using errcode = '22023';
  end if;
  if invitation.revoked_at is null then
    update public.organization_invitations set revoked_at = timezone('utc', now()) where id = invitation.id;
    insert into public.audit_events (
      organization_id, actor_id, event_type, entity_type, entity_id, before_state, after_state
    ) values (
      invitation.organization_id, auth.uid(), 'organization.invitation_revoked',
      'organization_invitation', invitation.id,
      jsonb_build_object('email', invitation.email, 'role', invitation.role),
      jsonb_build_object('revoked', true)
    );
  end if;
end;
$$;

revoke all on function public.revoke_organization_invitation(uuid) from public;
grant execute on function public.revoke_organization_invitation(uuid) to authenticated;
