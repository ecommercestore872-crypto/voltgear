/** Start and stop only this gate's local services; never uses production credentials. */
import { spawn } from "node:child_process";
import fs from "node:fs";

fs.mkdirSync("tmp/tiktok-browser", { recursive: true });
const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:4589", NEXT_PUBLIC_SUPABASE_ANON_KEY: "isolated-qa-anon", SUPABASE_SERVICE_ROLE_KEY: "isolated-qa-service", NEXT_PUBLIC_TIKTOK_PIXEL_ID: "DAF1KQBC77UES974M180", NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED: "true", AUTH_SECRET: "isolated-test-signing-not-production", ADMIN_TOKEN: "isolated-build-not-production", NEXT_TELEMETRY_DISABLED: "1" };
for (const key of Object.keys(env)) {
  if (/TIKTOK.*TOKEN|POSTEX|RESEND|SMTP|GOOGLE.*CREDENTIAL|META.*TOKEN/.test(key)) delete env[key];
}
const fixtureLog = fs.openSync("tmp/tiktok-browser/fixture.log", "w");
const appLog = fs.openSync("tmp/tiktok-browser/app.log", "w");
const fixture = spawn(process.execPath, ["scripts/tiktok-isolated-services.mjs"], { env, stdio: ["ignore", fixtureLog, fixtureLog], windowsHide: true });
let app;
async function ready(port) {
  for (let attempt = 0; attempt < 30; attempt++) {
    try { await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(1000) }); return; }
    catch { await new Promise((resolve) => setTimeout(resolve, 500)); }
  }
  throw new Error(`Isolated QA service ${port} did not become ready`);
}
async function run(command, args, shell = false) {
  const child = spawn(command, args, { env, shell, stdio: "inherit", windowsHide: true });
  const status = await new Promise((resolve, reject) => { child.on("exit", resolve); child.on("error", reject); });
  if (status !== 0) throw new Error(`QA check failed (${status}): ${command} ${args.join(" ")}`);
}
try {
  await ready(4589);
  if (process.argv.includes("--verify-all")) {
    await run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "ci"], process.platform === "win32");
    await run(process.execPath, ["scripts/check-storefront-performance-budget.mjs"]);
  }
  app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "apps/storefront", "-p", "4590"], { env, stdio: ["ignore", appLog, appLog], windowsHide: true });
  await ready(4590);
  await run(process.execPath, ["scripts/verify-tiktok-isolated.mjs"]);
} finally {
  app?.kill();
  fixture.kill();
  fs.closeSync(appLog);
  fs.closeSync(fixtureLog);
}
