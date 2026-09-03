import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const { data, error } = await supabase.from("products").select("name, slug, draft");
  if (error) {
    console.error(error);
  } else {
    for (const p of data) {
      console.log(`${p.slug} = ${p.name}`);
    }
  }
}
run();
