import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const toUpload = [
  { slug: "smartwatch", name: "Smartwatches", file: String.raw`C:\Users\aliab\.gemini\antigravity\brain\cc9857d1-c8de-40a4-babe-782fc6f94ee7\cat_real_smartwatch_1788544042631.png`, desc: "Track your health and stay connected.", sort: 1 },
  { slug: "power-bank", name: "Power Banks", file: String.raw`C:\Users\aliab\.gemini\antigravity\brain\cc9857d1-c8de-40a4-babe-782fc6f94ee7\cat_real_powerbank_1788544057366.png`, desc: "Reliable, fast portable power.", sort: 2 },
  { slug: "charger", name: "Chargers & Adapters", file: String.raw`C:\Users\aliab\.gemini\antigravity\brain\cc9857d1-c8de-40a4-babe-782fc6f94ee7\cat_real_charger_1788544069286.png`, desc: "Fast, safe charging for every device.", sort: 3 },
  { slug: "earbuds", name: "Earbuds & Handsfree", file: String.raw`C:\Users\aliab\.gemini\antigravity\brain\cc9857d1-c8de-40a4-babe-782fc6f94ee7\cat_real_earbuds_1788544083047.png`, desc: "Immersive sound. All-day comfort.", sort: 4 },
  { slug: "ring-light", name: "Ring Light", file: String.raw`C:\Users\aliab\.gemini\antigravity\brain\cc9857d1-c8de-40a4-babe-782fc6f94ee7\cat_real_ringlight_1788544095769.png`, desc: "Professional lighting for creators and studio photography.", sort: 5 },
  { slug: "selfie-stick", name: "Selfie Stick", file: String.raw`C:\Users\aliab\.gemini\antigravity\brain\cc9857d1-c8de-40a4-babe-782fc6f94ee7\cat_real_selfiestick_1788544107764.png`, desc: "Portable wireless bluetooth selfie sticks, extendable tripods & gimbals.", sort: 6 },
  { slug: "microphones", name: "Microphones", file: String.raw`C:\Users\aliab\.gemini\antigravity\brain\cc9857d1-c8de-40a4-babe-782fc6f94ee7\cat_real_microphone_1788544119321.png`, desc: "Wireless lapel microphones and audio for creators.", sort: 7 },
];

async function main() {
  await supabase.from("categories").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  
  for (const item of toUpload) {
    console.log("Uploading " + item.slug);
    const res = await cloudinary.uploader.upload(item.file, { folder: "ecommerce-store/categories" });
    const url = res.secure_url;
    
    await supabase.from("categories").insert({
      slug: item.slug,
      name: item.name,
      description: item.desc,
      image_url: url,
      sort_order: item.sort,
    });
    console.log("Inserted " + item.slug + " with URL: " + url);
  }
}
main().catch(console.error);
