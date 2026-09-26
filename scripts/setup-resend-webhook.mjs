#!/usr/bin/env node
/**
 * Ensures Resend webhook exists for buyntryy.com. Logs IDs only, never secrets.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const ENV_FILE = resolve(ROOT, ".env.local");
const ENDPOINT = "https://buyntryy.com/api/webhooks/resend";
const EVENTS = ["email.bounced", "email.complained"];

function parseKey(raw) {
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith("RESEND_API_KEY=")) continue;
    let v = t.slice("RESEND_API_KEY=".length).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    return v;
  }
  return "";
}

const key = parseKey(readFileSync(ENV_FILE, "utf8"));
if (!key) {
  console.error("Missing RESEND_API_KEY in .env.local");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

const listRes = await fetch("https://api.resend.com/webhooks", { headers });
const listBody = await listRes.json();
if (!listRes.ok) {
  console.error("List webhooks failed:", listRes.status, JSON.stringify(listBody));
  process.exit(1);
}

const hooks = listBody.data ?? [];
console.log("webhooks_found", hooks.length);

let match = hooks.find((h) => h.endpoint === ENDPOINT);

if (match) {
  console.log("already_exists", match.id, (match.events ?? []).join(","));
} else {
  const createRes = await fetch("https://api.resend.com/webhooks", {
    method: "POST",
    headers,
    body: JSON.stringify({ endpoint: ENDPOINT, events: EVENTS }),
  });
  const created = await createRes.json();
  if (!createRes.ok) {
    console.error("Create failed:", createRes.status, JSON.stringify(created));
    process.exit(1);
  }
  match = created;
  console.log("created", created.id, (created.events ?? EVENTS).join(","));
  console.log(
    "ACTION: Copy signing_secret from Resend into Vercel RESEND_WEBHOOK_SECRET if you used a new webhook.",
  );
}

const detailRes = await fetch(`https://api.resend.com/webhooks/${match.id}`, {
  headers,
});
const detail = await detailRes.json();
const events = detail.events ?? detail.data?.events ?? match.events ?? [];
const needsUpdate =
  EVENTS.some((e) => !events.includes(e)) || detail.endpoint !== ENDPOINT;

if (needsUpdate && detailRes.ok) {
  const patchRes = await fetch(`https://api.resend.com/webhooks/${match.id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ endpoint: ENDPOINT, events: EVENTS }),
  });
  const patched = await patchRes.json();
  console.log("updated", patchRes.ok, patched.id ?? match.id);
} else {
  console.log("events_ok", events.join(","));
}

const probe = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}",
});
console.log("probe_unsigned", probe.status, (await probe.text()).slice(0, 80));
