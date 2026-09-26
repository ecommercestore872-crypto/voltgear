#!/usr/bin/env node
/**
 * Resend + webhook health (no secrets printed).
 * Usage: node scripts/resend-health.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const ENV_FILE = resolve(ROOT, ".env.local");
const WEBHOOK_URL = "https://buyntryy.com/api/webhooks/resend";

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
const apiKey = env.RESEND_API_KEY?.trim() ?? "";

console.log("=== Resend health ===\n");

const getProbe = await fetch(WEBHOOK_URL, { method: "GET" });
const getBody = await getProbe.text();
console.log("Webhook GET", getProbe.status, getBody.slice(0, 200));

const postProbe = await fetch(WEBHOOK_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}",
});
console.log("Webhook POST (unsigned)", postProbe.status, (await postProbe.text()).slice(0, 80));

if (!apiKey) {
  console.log("\nRESEND_API_KEY: missing in .env.local — skip API checks.");
  process.exit(0);
}

const auth = { Authorization: `Bearer ${apiKey}` };

const domains = await fetch("https://api.resend.com/domains", { headers: auth });
const domainsBody = await domains.json();
console.log("\nDomains API", domains.status, domains.ok ? `count=${domainsBody.data?.length ?? 0}` : JSON.stringify(domainsBody).slice(0, 120));

const webhooks = await fetch("https://api.resend.com/webhooks", { headers: auth });
const whBody = await webhooks.json();
if (webhooks.ok) {
  const list = whBody.data ?? [];
  console.log("Webhooks API", webhooks.status, "count=", list.length);
  for (const h of list) {
    console.log("  -", h.id, h.endpoint, (h.events ?? []).join(","));
  }
} else {
  console.log(
    "Webhooks API",
    webhooks.status,
    whBody.message ?? JSON.stringify(whBody).slice(0, 120),
  );
  if (whBody.name === "restricted_api_key") {
    console.log(
      "  → Use Resend dashboard for webhooks, or create a full-access API key.",
    );
  }
}

const emails = await fetch("https://api.resend.com/emails?limit=10", { headers: auth });
const emBody = await emails.json();
if (emails.ok) {
  const list = emBody.data ?? [];
  console.log("\nRecent emails API", emails.status, "sample=", list.length);
  const bounced = list.filter((e) => e.last_event === "bounced" || e.status === "bounced");
  console.log("  bounced in sample", bounced.length);
} else {
  console.log("\nEmails API", emails.status, emBody.message ?? JSON.stringify(emBody).slice(0, 100));
}

console.log("\nDone.");
