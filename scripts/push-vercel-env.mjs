/**
 * Copies .env.local into the linked Vercel project.
 * Logs key names only. Never prints values.
 *
 * Usage: node scripts/push-vercel-env.mjs [--cwd <monorepo-root>]
 * Uses the Vercel project linked in <cwd>/.vercel (default: repo root).
 */
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
let vercelCwd = ROOT;
const cwdIdx = args.indexOf("--cwd");
if (cwdIdx >= 0 && args[cwdIdx + 1]) {
  vercelCwd = resolve(args[cwdIdx + 1]);
}
const ENV_FILE = resolve(ROOT, ".env.local");

const SKIP_PREFIX = ["SANITY_", "NEXT_PUBLIC_SANITY_"];
const SKIP_EXACT = new Set([
  "NEXT_DIST_DIR",
  "VERCEL_OIDC_TOKEN",
  "ADMIN_PUBLIC_URL",
  "ADMIN_PROXY_UPSTREAM",
  "ADMIN_SAME_ORIGIN",
  "NEXT_PUBLIC_ADMIN_ASSET_ORIGIN",
]);
const SENSITIVE = new Set([
  "ADMIN_TOKEN",
  "REVALIDATION_TOKEN",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CLOUDINARY_API_SECRET",
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "CRON_SECRET",
  "SLACK_WEBHOOK_URL",
  "WEBHOOK_URL",
]);

function parseEnv(raw) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

function shouldSkip(key, value) {
  if (!value) return true;
  if (SKIP_EXACT.has(key)) return true;
  if (SKIP_PREFIX.some((p) => key.startsWith(p))) return true;
  if (key === "NEXT_PUBLIC_SITE_URL" && /localhost/i.test(value)) return true;
  return false;
}

function addEnv(name, value, sensitive) {
  return new Promise((resolvePromise, reject) => {
    const args = [
      "vercel",
      "env",
      "add",
      name,
      "production,preview",
      "--force",
      "--yes",
    ];
    if (sensitive) args.push("--sensitive");
    else args.push("--no-sensitive");
    const child = spawn("npx", args, {
      cwd: vercelCwd,
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
    });
    let err = "";
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    child.on("close", (code) => {
      if (code === 0) resolvePromise(undefined);
      else reject(new Error(`${name} failed (${code}): ${err.trim() || "unknown error"}`));
    });
    child.stdin.write(value);
    child.stdin.end();
  });
}

if (!existsSync(ENV_FILE)) {
  console.error("Missing .env.local");
  process.exit(1);
}

const env = parseEnv(readFileSync(ENV_FILE, "utf8"));
if (!env.ADMIN_TOKEN && !env.REVALIDATION_TOKEN) {
  console.error("ADMIN_TOKEN (or REVALIDATION_TOKEN) is required for production.");
  process.exit(1);
}
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase URL and service role key are required.");
  process.exit(1);
}

if (!env.CRON_SECRET) {
  env.CRON_SECRET = randomBytes(32).toString("hex");
  console.log("generated CRON_SECRET");
}

const keys = Object.keys(env)
  .filter((k) => !shouldSkip(k, env[k]))
  .sort();

console.log(
  `pushing ${keys.length} keys to ${vercelCwd} (names only): ${keys.join(", ")}`,
);

for (const key of keys) {
  process.stdout.write(`set ${key} ... `);
  await addEnv(key, env[key], SENSITIVE.has(key) || !key.startsWith("NEXT_PUBLIC_"));
  console.log("ok");
}

console.log("done");
