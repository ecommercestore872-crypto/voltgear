const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://zeuhfqevqjkbzwdaxjuv.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpldWhmcWV2cWprYnp3ZGF4anV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODE3ODM2NiwiZXhwIjoyMTAzNzU0MzY2fQ.glySUIV1ArpjuDr8hVLVH-LXbSys6QBQFindTUwMNlc"
);

async function run() {
  const { data, error } = await supabase.from("products").select("name, slug, status").eq("slug", "rgb-led-3d-56-ring-light");
  console.log("DB Result:", data, error);
}

run();
