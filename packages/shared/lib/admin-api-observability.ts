/** Structured logs for slow admin API handlers (Vercel → Observability / Log Drains). */

export const DEFAULT_ADMIN_API_SLOW_MS = 800;

export type AdminApiLogEvent = {
  v: 1;
  kind: "admin_api";
  route: string;
  method: string;
  ms: number;
  status: number;
};

export function adminApiSlowThresholdMs(): number {
  const n = Number(process.env.ADMIN_API_SLOW_MS ?? DEFAULT_ADMIN_API_SLOW_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_ADMIN_API_SLOW_MS;
}

export function shouldLogAllAdminApi(): boolean {
  return process.env.ADMIN_API_LOG_ALL === "1";
}

export function logAdminApiEvent(event: AdminApiLogEvent): void {
  const line = JSON.stringify(event);
  if (event.ms >= adminApiSlowThresholdMs()) {
    console.warn(line);
    return;
  }
  if (shouldLogAllAdminApi()) {
    console.info(line);
  }
}

/** Next route handlers may be `(req)` or `(req, { params })`. */
export type AdminApiRouteHandler<
  R extends Request = Request,
  A extends unknown[] = [],
> = (
  request: R,
  ...args: A
) => Response | Promise<Response>;

/** Wrap a Route Handler export to record duration and status. */
export function withAdminApiObservability<
  R extends Request,
  A extends unknown[],
>(
  routeName: string,
  handler: AdminApiRouteHandler<R, A>,
): AdminApiRouteHandler<R, A> {
  const wrapped: AdminApiRouteHandler<R, A> = async (request, ...args) => {
    const t0 = performance.now();
    let status = 500;
    try {
      const response = await handler(request, ...args);
      status = response.status;
      return response;
    } finally {
      const ms = Math.round(performance.now() - t0);
      if (ms >= adminApiSlowThresholdMs() || shouldLogAllAdminApi()) {
        logAdminApiEvent({
          v: 1,
          kind: "admin_api",
          route: routeName,
          method: request.method,
          ms,
          status,
        });
      }
    }
  };
  return wrapped;
}
