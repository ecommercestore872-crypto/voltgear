/** Run work after the HTTP response is sent (emails, pixels). Uses Vercel waitUntil when available. */
export function deferAfterResponse(task: () => Promise<unknown>): void {
  const run = Promise.resolve()
    .then(task)
    .catch((err) => {
      console.error("[defer-after-response]", err);
    });

  void import("@vercel/functions")
    .then(({ waitUntil }) => {
      waitUntil(run);
    })
    .catch(() => {
      void run;
    });
}
