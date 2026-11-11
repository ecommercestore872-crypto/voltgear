import fs from "fs";
import path from "path";

function getEnv(key) {
  const envFile = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith(key + "=")) {
      let val = trimmed.slice(key.length + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      return val;
    }
  }
  return "";
}

const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

async function run() {
  const res = await fetch(`${url}/rest/v1/products?select=id,name,slug,category,is_demo,status`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });
  const data = await res.json();
  console.log("ALL_PRODUCTS_COUNT:", data.length);
  console.log(JSON.stringify(data, null, 2));
}

run().catch(console.error);
