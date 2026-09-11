import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
import { adminDb } from "../lib/supabase/admin";

async function run() {
  const { data: products, error } = await adminDb
    .from("products")
    .select("slug, images");

  if (error) {
    console.error(error);
    return;
  }
  
  for (const p of products) {
    if (p.images && p.images.length > 0) {
      console.log(`Product: ${p.slug}`);
      p.images.forEach((img: any) => {
        if (typeof img === 'string') {
          console.log(` - ${img}`);
        } else {
          console.log(` - ${img.asset?._ref || JSON.stringify(img)}`);
        }
      });
    }
  }
}
run();
