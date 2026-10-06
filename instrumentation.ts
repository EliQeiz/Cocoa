import type { Instrumentation } from "next";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.info(JSON.stringify({ event: "application.started", service: "buildproof", timestamp: new Date().toISOString() }));
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const digest = typeof error === "object" && error !== null && "digest" in error
    ? String(error.digest)
    : undefined;
  console.error(JSON.stringify({
    event: "request.failed",
    service: "buildproof",
    timestamp: new Date().toISOString(),
    method: request.method,
    route: context.routePath,
    routeType: context.routeType,
    digest,
  }));
};
