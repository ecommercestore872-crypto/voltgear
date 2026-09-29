/** Structured logs for Vercel Observability — no secrets. */

export type StorefrontRevalidateLog = {
  ok: boolean;
  paths: string[];
  tags: string[];
  local?: boolean;
  status?: number;
  error?: string;
};

export function logStorefrontRevalidate(fields: StorefrontRevalidateLog): void {
  console.info("[storefront-revalidate]", JSON.stringify({ ...fields, ts: new Date().toISOString() }));
}
