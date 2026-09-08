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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

async function main() {
  const env = loadEnv(resolve(process.cwd(), ".env.local"));
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const product = await db.from("products").select("id, slug, quantity, stock_status").limit(1).maybeSingle();
  console.log(
    JSON.stringify(
      {
        productSample: {
          idType: product.data?.id != null ? typeof product.data.id : null,
          idLooksUuid:
            typeof product.data?.id === "string" &&
            /^[0-9a-f-]{36}$/i.test(String(product.data.id)),
          hasQuantityKey: product.data ? "quantity" in product.data : null,
          quantity: product.data?.quantity ?? null,
          error: product.error?.message ?? null,
        },
      },
      null,
      2
    )
  );

  const rpc = await db.rpc("checkout_place_order", {
    p_order_id: "AUDIT-ONLY",
    p_customer: {},
    p_payment: "cod",
    p_subtotal: 0,
    p_shipping: 0,
    p_total: 0,
    p_discount: 0,
    p_promo_code: "",
    p_is_demo: true,
    p_items: [],
  });
  console.log(
    JSON.stringify(
      {
        checkout_place_order: {
          code: rpc.error?.code ?? null,
          message: rpc.error?.message ?? null,
        },
      },
      null,
      2
    )
  );
}

main();
