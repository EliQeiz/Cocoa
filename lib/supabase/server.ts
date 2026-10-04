import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function publicConfiguration() {
  if (!url || !key || !url.startsWith("https://")) {
    throw new Error("BuildProof is missing its public Supabase configuration.");
  }
  return { url, key };
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const configuration = publicConfiguration();

  return createServerClient(configuration.url, configuration.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always write cookies. The root proxy
          // refreshes the session and writes the resulting response cookies.
        }
      },
    },
  });
}
