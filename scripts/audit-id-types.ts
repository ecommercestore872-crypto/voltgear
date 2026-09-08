import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env: Record<string, string> = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i < 0) continue;
  let v = line.slice(i + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  env[line.slice(0, i).trim()] = v;
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

async function main() {
  const p = await db.from("products").select("id, slug, stock_status").limit(1).maybeSingle();
  const o = await db.from("orders").select("id, order_id").limit(1).maybeSingle();
  const pv = await db.from("product_variants").select("id, key").limit(1).maybeSingle();
  console.log(
    JSON.stringify(
      {
        product: {
          err: p.error?.message ?? null,
          id: p.data?.id ?? null,
          idType: p.data?.id != null ? typeof p.data.id : null,
        },
        order: {
          err: o.error?.message ?? null,
          id: o.data?.id ?? null,
          idType: o.data?.id != null ? typeof o.data.id : null,
        },
        variant: {
          err: pv.error?.message ?? null,
          id: pv.data?.id ?? null,
          idType: pv.data?.id != null ? typeof pv.data.id : null,
        },
      },
      null,
      2
    )
  );
}

main();
