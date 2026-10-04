import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../../lib/supabase/server";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (error || !userId) redirect("/auth");

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/onboarding");

  return children;
}
