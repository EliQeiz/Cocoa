import { publicRuntimeConfiguration } from "../../../lib/config/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checkedAt = new Date().toISOString();
  try {
    const configuration = publicRuntimeConfiguration();
    const response = await fetch(`${configuration.supabaseUrl}/auth/v1/health`, {
      cache: "no-store",
      headers: { apikey: configuration.supabaseKey },
      signal: AbortSignal.timeout(3500),
    });
    const healthy = response.ok;
    return Response.json(
      {
        status: healthy ? "ok" : "degraded",
        checkedAt,
        services: { application: "ok", authentication: healthy ? "ok" : "unavailable" },
      },
      {
        status: healthy ? 200 : 503,
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=15, stale-while-revalidate=30",
          "X-Robots-Tag": "noindex, nofollow",
        },
      },
    );
  } catch {
    return Response.json(
      {
        status: "unavailable",
        checkedAt,
        services: { application: "configuration_error", authentication: "unknown" },
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
      },
    );
  }
}
