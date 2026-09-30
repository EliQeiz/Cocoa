-- The legacy Cocoa-era signup hook writes invitation data to public.users,
-- which no longer exists. BuildProof now activates membership only through
-- accept_organization_invitation after the invited user has authenticated.
drop trigger if exists provision_invited_user_on_auth_signup on auth.users;
drop function if exists public.provision_invited_user();
