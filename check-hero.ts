import { adminDb } from "./lib/db/admin-store"

async function run() {
  const db = adminDb();
  const { data, error } = await db.from("hero_slides").select("*");
  if (error) console.error("Error:", error);
  console.log("Hero slides:", JSON.stringify(data, null, 2));
}

run();
