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
  const full = await db
    .from("orders")
    .select("id, order_id, total, discount, status, subtotal, shipping")
    .eq("order_id", "VG-1018")
    .maybeSingle();

  const lines = full.data?.id
    ? await db
        .from("order_items")
        .select("slug, name, quantity, price, line_total")
        .eq("order_id", full.data.id)
    : { data: null, error: { message: "no order" } };

  console.log(
    JSON.stringify(
      {
        order: full.data
          ? {
              order_id: full.data.order_id,
              total: full.data.total,
              discount: full.data.discount,
              status: full.data.status,
              subtotal: full.data.subtotal,
              shipping: full.data.shipping,
            }
          : null,
        orderErr: full.error?.message ?? null,
        lines: lines.data,
        linesErr: (lines as { error?: { message?: string } }).error?.message ?? null,
      },
      null,
      2
    )
  );
}

main();
