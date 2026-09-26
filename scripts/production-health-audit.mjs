#!/usr/bin/env node
/**
 * Production health checks for buyntryy.com (remediation steps 1–8 smoke).
 */
const SHOP = (process.env.SHOP_URL || "https://buyntryy.com").replace(/\/$/, "");

const checks = [];

async function head(path, expectStatus = 200) {
  const url = `${SHOP}${path}`;
  const res = await fetch(url, { redirect: "follow" });
  const cc = res.headers.get("cache-control") || "";
  const ok = res.status === expectStatus;
  checks.push({ name: `GET ${path}`, ok, status: res.status, cacheControl: cc.slice(0, 80) });
  return res;
}

async function main() {
  await head("/");
  await head("/products");
  await head("/api/settings");
  await head("/llms.txt");
  await head("/ads.txt");
  await head("/sitemap.xml");

  const tiktok = await fetch(`${SHOP}/api/catalog/tiktok.csv`, { redirect: "follow" });
  checks.push({
    name: "GET /api/catalog/tiktok.csv",
    ok: tiktok.status === 200,
    status: tiktok.status,
    cacheControl: (tiktok.headers.get("cache-control") || "").slice(0, 80),
  });

  const rev = await fetch(`${SHOP}/api/revalidate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  checks.push({
    name: "POST /api/revalidate (no auth)",
    ok: rev.status === 401,
    status: rev.status,
  });

  let failed = 0;
  for (const c of checks) {
    const mark = c.ok ? "ok" : "FAIL";
    if (!c.ok) failed += 1;
    console.log(`${mark}  ${c.name} (${c.status})${c.cacheControl ? ` cache=${c.cacheControl}` : ""}`);
  }

  if (failed) {
    console.error(`\n${failed} production check(s) failed`);
    process.exit(1);
  }
  console.log("\nProduction health audit passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
