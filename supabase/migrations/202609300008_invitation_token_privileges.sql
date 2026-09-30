-- Keep token digests unreadable from browser sessions. Active tenant members
-- can inspect invite status and recipients, but never token hashes.
revoke all on public.organization_invitations from anon, authenticated;
grant select (
  id, organization_id, email, role, invited_by, expires_at,
  accepted_at, revoked_at, created_at
) on public.organization_invitations to authenticated;
