import { getServiceClient } from "@/lib/supabase/server";

export const LIVE = "published";

let demoColumnMissing = false;

function isMissingIsDemoColumn(
  error: { code?: string; message?: string } | null | undefined
): boolean {
  return Boolean(
    error && error.code === "42703" && (error.message ?? "").includes("is_demo")
  );
}

export function db() {
  return getServiceClient();
}

export function demoFilter<T extends { or: (filters: string) => T }>(
  query: T,
  includeDemo?: boolean
): T {
  if (demoColumnMissing || includeDemo) return query;
  return query.or("is_demo.eq.false,is_demo.is.null");
}

export async function execDemoQuery<
  T extends { error: { code?: string; message?: string } | null },
>(run: () => PromiseLike<T>): Promise<T> {
  const first = await run();
  if (!isMissingIsDemoColumn(first.error)) return first;
  demoColumnMissing = true;
  return run();
}
