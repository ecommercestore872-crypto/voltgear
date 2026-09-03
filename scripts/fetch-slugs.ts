import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://zeuhfqevqjkbzwdaxjuv.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpldWhmcWV2cWprYnp3ZGF4anV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODE3ODM2NiwiZXhwIjoyMTAzNzU0MzY2fQ.glySUIV1ArpjuDr8hVLVH-LXbSys6QBQFindTUwMNlc"
);

const { data, error } = await sb.from("products").select("name, slug");
if (error) console.error(error);
else {
  console.log("=== ALL PRODUCTS ===");
  for (const p of data) console.log(`SLUG=${p.slug}  NAME=${p.name}`);
}
