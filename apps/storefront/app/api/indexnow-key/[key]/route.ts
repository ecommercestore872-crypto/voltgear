import { resolveIndexNowKey } from "@/lib/indexnow-rules";

/** Serves /{INDEXNOW_KEY}.txt (rewritten in next.config) so the key file always matches the env key. */
export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  if (key !== resolveIndexNowKey()) return new Response("Not found", { status: 404 });
  return new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
