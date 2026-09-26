#!/usr/bin/env node
/**
 * T-40 production smoke (no secrets). Exit 0 when checks pass.
 * Usage: node scripts/smoke-t40-production.mjs
 * Env: SHOP_URL (default https://buyntryy.com), ADMIN_PUBLIC_URL (expected redirect target base)
 */
const shop = (process.env.SHOP_URL || "https://buyntryy.com").replace(/\/$/, "");
const adminBase = (
  process.env.ADMIN_PUBLIC_URL || "https://voltgear-admin.vercel.app"
).replace(/\/$/, "");
const sameOrigin =
  process.env.ADMIN_SAME_ORIGIN === "1" ||
  process.env.ADMIN_SAME_ORIGIN === "true" ||
  (process.env.ADMIN_PUBLIC_URL && adminBase === shop);

async function followRedirectOnce(path) {
  const res = await fetch(`${shop}${path}`, { redirect: "manual" });
  return { status: res.status, location: res.headers.get("location") };
}

async function main() {
  const checks = [];

  if (sameOrigin) {
    for (const path of ["/admin/login", "/admin"]) {
      const res = await fetch(`${shop}${path}`, { redirect: "manual" });
      checks.push({
        name: `same-origin ${path} (no external redirect)`,
        ok: res.status >= 200 && res.status < 400,
        status: res.status,
        location: res.headers.get("location"),
      });
    }
    const studio = await followRedirectOnce("/studio");
    checks.push({
      name: "same-origin /studio → /admin/login",
      ok:
        studio.status >= 200 &&
        studio.status < 400 &&
        !studio.location?.startsWith("http"),
      status: studio.status,
      location: studio.location,
    });
  } else {
    for (const [path, expectedDest] of [
      ["/admin", `${adminBase}/admin`],
      ["/admin/login", `${adminBase}/admin/login`],
      ["/studio", `${adminBase}/admin/login`],
    ]) {
      const { status, location } = await followRedirectOnce(path);
      const ok =
        (status === 307 || status === 308 || status === 302) &&
        location?.replace(/\/$/, "") === expectedDest.replace(/\/$/, "");
      checks.push({
        name: `redirect ${path}`,
        ok,
        status,
        location,
        expectedDest,
      });
    }
  }

  const revalidate = await fetch(`${shop}/api/revalidate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  checks.push({
    name: "POST /api/revalidate without token → 401",
    ok: revalidate.status === 401,
    status: revalidate.status,
  });

  const adminApi = await fetch(`${shop}/api/admin/analytics`, {
    redirect: "manual",
  });
  checks.push({
    name: sameOrigin
      ? "GET /api/admin/* proxied on shop → 401 without auth"
      : "GET /api/admin/* absent on shop",
    ok: sameOrigin ? adminApi.status === 401 : adminApi.status === 404,
    status: adminApi.status,
  });

  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) {
    const mark = c.ok ? "ok" : "FAIL";
    console.log(`${mark}  ${c.name}${c.status != null ? ` (${c.status})` : ""}`);
    if (c.location) console.log(`      → ${c.location}`);
  }

  if (failed.length > 0) {
    console.error("\nT-40 smoke failed:", failed.length, "check(s)");
    process.exit(1);
  }
  console.log(
    sameOrigin
      ? "\nT-40 smoke passed (buyntryy.com/admin same-origin + revalidate gate)."
      : "\nT-40 smoke passed (shop redirects + revalidate gate + no /api/admin on shop).",
  );
  console.log(
    "Manual: publish a product in admin; confirm shop PDP updates (admin needs STOREFRONT_URL + matching ADMIN_TOKEN).",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
