import "server-only";

type PublicRuntimeConfiguration = {
  appUrl: string;
  supabaseKey: string;
  supabaseUrl: string;
};

function required(name: string, value: string | undefined) {
  if (!value || value.trim().length === 0) {
    throw new Error(`BuildProof configuration is missing ${name}.`);
  }
  return value.trim();
}

function httpsUrl(name: string, value: string, allowLocalhost = false) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`BuildProof configuration has an invalid ${name}.`);
  }
  const local = allowLocalhost && ["localhost", "127.0.0.1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) {
    throw new Error(`BuildProof configuration requires HTTPS for ${name}.`);
  }
  return parsed.origin;
}

export function publicRuntimeConfiguration(): PublicRuntimeConfiguration {
  const supabaseUrl = httpsUrl(
    "NEXT_PUBLIC_SUPABASE_URL",
    required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  );
  if (!supabaseUrl.endsWith(".supabase.co")) {
    throw new Error("BuildProof configuration must use an official Supabase project URL.");
  }

  const supabaseKey = required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  if (supabaseKey.length < 24 || /replace|example|placeholder/i.test(supabaseKey)) {
    throw new Error("BuildProof configuration has an invalid Supabase publishable key.");
  }

  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : undefined);
  const appUrl = httpsUrl("NEXT_PUBLIC_APP_URL", required("NEXT_PUBLIC_APP_URL", configuredAppUrl), process.env.NODE_ENV !== "production");
  return { appUrl, supabaseKey, supabaseUrl };
}
