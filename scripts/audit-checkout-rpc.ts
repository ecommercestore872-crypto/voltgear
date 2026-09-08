/**
 * Audit whether checkout_place_order exists on the configured Supabase project.
 * Does not print secrets.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(path: string) {
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
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

const env = loadEnv(resolve(process.cwd(), ".env.local"));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase env");

const ref = new URL(url).hostname.split(".")[0];
console.log(JSON.stringify({ projectRef: ref }, null, 2));

const db = createClient(url, key, { auth: { persistSession: false } });

// Probe RPC with empty items — expects function to exist (may return business error).
const probe = await db.rpc("checkout_place_order", {
  p_order_id: "PROBE-NOOP",
  p_customer: { name: "probe" },
  p_payment: "cod",
  p_subtotal: 1,
  p_shipping: 0,
  p_total: 1,
  p_discount: 0,
  p_promo_code: "",
  p_is_demo: true,
  p_items: [],
});

console.log(
  JSON.stringify(
    {
      rpcProbe: {
        hasData: probe.data != null,
        errorCode: probe.error?.code ?? null,
        errorMessage: probe.error?.message ?? null,
        errorDetails: probe.error?.details ?? null,
        errorHint: probe.error?.hint ?? null,
      },
    },
    null,
    2
  )
);

// List related functions via pg_catalog through a tiny SQL RPC if available,
// else try information_schema via REST is not possible — use rpc to a known query.
// Fallback: attempt cancel_order_restore_inventory existence as sibling migration signal.
const cancel = await db.rpc("cancel_order_restore_inventory", {
  p_order_id: "PROBE-NOOP",
  p_note: "probe",
});
console.log(
  JSON.stringify(
    {
      cancelRpcProbe: {
        errorCode: cancel.error?.code ?? null,
        errorMessage: cancel.error?.message ?? null,
      },
    },
    null,
    2
  )
);
