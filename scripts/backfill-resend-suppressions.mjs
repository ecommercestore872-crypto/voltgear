#!/usr/bin/env node
/**
 * Backfill email_suppressions from recent Resend bounces (API).
 * Requires RESEND_API_KEY with email read access + Supabase service role in .env.local.
 *
 * Usage: node scripts/backfill-resend-suppressions.mjs [--dry-run] [--pages=5]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const ENV_FILE = resolve(ROOT, ".env.local");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const pagesArg = args.find((a) => a.startsWith("--pages="));
const maxPages = pagesArg ? Number.parseInt(pagesArg.split("=")[1], 10) : 5;

function parseEnv(raw) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const env = parseEnv(readFileSync(ENV_FILE, "utf8"));
const apiKey = env.RESEND_API_KEY?.trim();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!apiKey) {
  console.error("Missing RESEND_API_KEY");
  process.exit(1);
}
if (!dryRun && (!supabaseUrl || !serviceKey)) {
  console.error("Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

/** @type {Set<string>} */
const bounceEmails = new Set();

let cursor = undefined;
for (let page = 0; page < maxPages; page++) {
  const url = new URL("https://api.resend.com/emails");
  url.searchParams.set("limit", "100");
  if (cursor) url.searchParams.set("after", cursor);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const body = await res.json();
  if (!res.ok) {
    console.error("Emails list failed:", res.status, body.message ?? body);
    if (body.name === "restricted_api_key") {
      console.error(
        "Create a full-access Resend API key for backfill, or rely on the webhook for new bounces.",
      );
      process.exit(0);
    }
    process.exit(1);
  }
  const rows = body.data ?? [];
  if (!rows.length) break;

  for (const row of rows) {
    const status = row.last_event ?? row.status ?? "";
    if (status !== "bounced" && status !== "complained") continue;
    const to = row.to;
    const list = Array.isArray(to) ? to : to ? [to] : [];
    for (const e of list) {
      if (typeof e === "string" && e.includes("@")) {
        bounceEmails.add(e.trim().toLowerCase());
      }
    }
  }

  cursor = body.next ?? rows[rows.length - 1]?.id;
  if (!body.has_more && !body.next) break;
}

console.log("unique_suppression_candidates", bounceEmails.size, dryRun ? "(dry-run)" : "");

if (!bounceEmails.size) {
  console.log("Nothing to backfill.");
  process.exit(0);
}

if (dryRun) {
  for (const e of [...bounceEmails].slice(0, 20)) console.log("  would suppress", e);
  if (bounceEmails.size > 20) console.log("  ...");
  process.exit(0);
}

let ok = 0;
let fail = 0;
for (const email of bounceEmails) {
  const res = await fetch(`${supabaseUrl}/rest/v1/email_suppressions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      email_normalized: email,
      reason: "bounce",
      source: "resend_backfill",
      last_event_at: new Date().toISOString(),
    }),
  });
  if (res.ok || res.status === 409) ok++;
  else {
    fail++;
    if (fail <= 3) console.error("upsert fail", email, res.status, await res.text());
  }
}

console.log("backfill_done", { ok, fail });
