/** Structured logs for slow shop API handlers (checkout, cron, store). */

export const DEFAULT_SHOP_API_SLOW_MS = 1200;

export type ShopApiLogEvent = {
  v: 1;
  kind: "shop_api";
  route: string;
  method: string;
  ms: number;
  status: number;
};

export function shopApiSlowThresholdMs(): number {
  const n = Number(process.env.SHOP_API_SLOW_MS ?? DEFAULT_SHOP_API_SLOW_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_SHOP_API_SLOW_MS;
}

export type ShopApiRouteHandler<C = unknown> = (
  request: Request,
  context?: C,
) => Response | Promise<Response>;

export function withShopApiObservability<C = unknown>(
  routeName: string,
  handler: ShopApiRouteHandler<C>,
): ShopApiRouteHandler<C> {
  return async (request, context?) => {
    const t0 = performance.now();
    let status = 500;
    try {
      const response = await handler(request, context);
      status = response.status;
      return response;
    } finally {
      const ms = Math.round(performance.now() - t0);
      if (ms >= shopApiSlowThresholdMs()) {
        console.warn(
          JSON.stringify({
            v: 1,
            kind: "shop_api",
            route: routeName,
            method: request.method,
            ms,
            status,
          } satisfies ShopApiLogEvent),
        );
      }
    }
  };
}
