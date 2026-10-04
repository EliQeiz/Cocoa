import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function refreshSession(request: NextRequest) {
  if (!url || !key || !url.startsWith("https://")) {
    return new NextResponse("Application configuration is unavailable.", { status: 503 });
  }

  const nonce = btoa(crypto.randomUUID());
  const isDevelopment = process.env.NODE_ENV === "development";
  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://zghysuwvfdncnnyvesas.supabase.co wss://zghysuwvfdncnnyvesas.supabase.co",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const secure = (candidate: NextResponse) => {
    candidate.headers.set("Content-Security-Policy", contentSecurityPolicy);
    return candidate;
  };

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([header, value]) => response.headers.set(header, value));
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  const apiPath = request.nextUrl.pathname.startsWith("/api");
  const protectedPath = request.nextUrl.pathname.startsWith("/workspace") ||
    request.nextUrl.pathname.startsWith("/onboarding") ||
    request.nextUrl.pathname.startsWith("/admin") || apiPath;

  if ((error || !userId) && protectedPath) {
    if (apiPath) return secure(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    const destination = request.nextUrl.clone();
    destination.pathname = "/auth";
    destination.search = "";
    return secure(NextResponse.redirect(destination));
  }

  if (userId && request.nextUrl.pathname.startsWith("/admin")) {
    const { data: membership } = await supabase
      .from("organization_memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .in("role", ["organization_owner", "organization_admin"])
      .limit(1)
      .maybeSingle();
    if (!membership) return secure(new NextResponse("Forbidden", { status: 403 }));
  }

  return secure(response);
}
