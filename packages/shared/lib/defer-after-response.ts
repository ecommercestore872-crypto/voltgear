import { waitUntil } from "@vercel/functions";

/** Register before returning the response so serverless suspension cannot lose work. */
export function deferAfterResponse(task: () => Promise<unknown>): void {
  const run = Promise.resolve()
    .then(task)
    .catch(() => {
      console.error("[defer-after-response] task failed");
    });

  try { waitUntil(run); } catch { void run; }
}
