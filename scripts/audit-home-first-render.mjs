import { readFile } from "node:fs/promises";

// Read-only baseline: no cache invalidation. --html can inspect an authenticated
// response saved by `vercel curl` without exposing credentials to this script.
const htmlFile = process.argv[2] === "--html" ? process.argv[3] : undefined;
const url = process.argv[2] || "https://buyntryy.com/";
for (let run = 1; run <= (htmlFile ? 1 : 2); run++) {
  const start = performance.now();
  const response = htmlFile ? undefined : await fetch(url);
  const ttfbMs = Math.round(performance.now() - start);
  const html = htmlFile ? await readFile(htmlFile, "utf8") : await response.text();
  console.log(JSON.stringify({
    run, source: htmlFile || url, status: response?.status,
    finalUrl: response?.url,
    title: html.match(/<title>([^<]*)<\/title>/)?.[1],
    cache: response?.headers.get("x-vercel-cache"),
    ttfbMs: htmlFile ? undefined : ttfbMs,
    totalMs: htmlFile ? undefined : Math.round(performance.now() - start),
    gadgetHeader: html.includes("gadget-main-nav"),
    blankHero: html.includes("Loading campaign banners"),
    header: html.match(/<header[^>]*>/)?.[0],
    hero: html.includes('aria-label="Campaign banners"'),
    imagePreloads: html.match(/<link[^>]*as="image"[^>]*>/g)?.slice(0, 3),
  }));
}
