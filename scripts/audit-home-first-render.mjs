// Read-only baseline: no cache invalidation or authenticated requests.
const url = process.argv[2] || "https://buyntryy.com/";
for (let run = 1; run <= 2; run++) {
  const start = performance.now();
  const response = await fetch(url);
  const ttfbMs = Math.round(performance.now() - start);
  const html = await response.text();
  console.log(JSON.stringify({
    run, url, status: response.status,
    cache: response.headers.get("x-vercel-cache"), ttfbMs,
    totalMs: Math.round(performance.now() - start),
    gadgetHeader: html.includes("gadget-main-nav"),
    blankHero: html.includes("Loading campaign banners"),
    header: html.match(/<header[^>]*>/)?.[0],
    hero: html.includes('aria-label="Campaign banners"'),
    imagePreloads: html.match(/<link[^>]*as="image"[^>]*>/g)?.slice(0, 3),
  }));
}
