import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data } = await db.from("hero_slides").select("*");
  console.log(JSON.stringify(data, null, 2));
}
run();
