const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://zeuhfqevqjkbzwdaxjuv.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpldWhmcWV2cWprYnp3ZGF4anV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODE3ODM2NiwiZXhwIjoyMTAzNzU0MzY2fQ.glySUIV1ArpjuDr8hVLVH-LXbSys6QBQFindTUwMNlc"
);

const PRODUCT_EMBED = `
  *,
  product_images ( url, sort_order, source ),
  product_variants ( id, key, name, sku, price, compare_at_price, stock_status, image_url, is_default ),
  product_reviews ( name, rating, review_date, comment, verified, image, is_demo )
`;

async function run() {
  const { data, error } = await supabase.from("products").select(PRODUCT_EMBED).eq("slug", "rgb-led-3d-56-ring-light").eq("status", "published").maybeSingle();
  console.log("DB Result Error:", error !== null ? error.message : "Success!");
}

run();
