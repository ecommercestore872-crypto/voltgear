/** Run the Meta browser gate against local read-only services and a test dataset. */
import { spawn } from "node:child_process";
import fs from "node:fs";

const output = "tmp/meta-browser";
fs.mkdirSync(output, { recursive: true });
const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (/TOKEN|SECRET|POSTEX|RESEND|SMTP|GOOGLE.*CREDENTIAL|SUPABASE|META_|TIKTOK_|VERCEL/.test(key)) delete env[key];
}
Object.assign(env, {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:4589",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "isolated-qa-anon",
  SUPABASE_SERVICE_ROLE_KEY: "isolated-qa-service",
  NEXT_PUBLIC_META_PIXEL_ID: "999999999999999",
  NEXT_PUBLIC_META_TEST_MODE: "true",
  NEXT_PUBLIC_META_PIXEL_ENABLED: "true",
  META_TEST_EVENT_CODE: "ISOLATED",
  META_CONVERSIONS_API_ACCESS_TOKEN: "isolated-token",
  VERCEL_ENV: "preview",
  AUTH_SECRET: "isolated-test-signing-not-production",
  ADMIN_TOKEN: "isolated-build-not-production",
  NEXT_TELEMETRY_DISABLED: "1",
});
if (process.argv.includes("--tiktok")) {
  // Existing TikTok verifier intercepts its SDK and all transport; no live events.
  env.NEXT_PUBLIC_TIKTOK_PIXEL_ID = "DAF1KQBC77UES974M180";
  env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED = "true";
}
const fixtureLog = fs.openSync(`${output}/fixture.log`, "w");
const appLog = fs.openSync(`${output}/app.log`, "w");
const fixture = spawn(process.execPath, ["scripts/tiktok-isolated-services.mjs"], {
  env, stdio: ["ignore", fixtureLog, fixtureLog], windowsHide: true,
});
let app;
async function ready(port) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try { await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(1000) }); return; }
    catch { await new Promise((resolve) => setTimeout(resolve, 500)); }
  }
  throw new Error(`Isolated QA service ${port} did not become ready`);
}
async function run(command, args, shell = false) {
  const child = spawn(command, args, { env, shell, stdio: "inherit", windowsHide: true });
  const status = await new Promise((resolve, reject) => { child.on("exit", resolve); child.on("error", reject); });
  if (status !== 0) throw new Error(`Meta QA failed (${status}): ${command} ${args.join(" ")}`);
}
try {
  await ready(4589);
  if (process.argv.includes("--build") || process.argv.includes("--verify-all")) {
    await run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", process.argv.includes("--verify-all") ? "ci" : "build:storefront"], process.platform === "win32");
  }
  app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "apps/storefront", "-p", "4590"], {
    env, stdio: ["ignore", appLog, appLog], windowsHide: true,
  });
  await ready(4590);
  await run(process.execPath, ["scripts/verify-meta-isolated.mjs"]);
  if (process.argv.includes("--tiktok")) await run(process.execPath, ["scripts/verify-tiktok-isolated.mjs"]);
} finally {
  app?.kill();
  fixture.kill();
  fs.closeSync(appLog);
  fs.closeSync(fixtureLog);
}
