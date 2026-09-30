#!/usr/bin/env node
/**
 * Live PostEx connectivity smoke test (server token only).
 * Loads apps/admin/.env.local if present; does not print the token.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, "apps/admin/.env.local");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === "") {
      process.env[key] = val;
    }
  }
}

loadEnvFile(envPath);

const token = process.env.POSTEX_API_TOKEN?.trim();
const base = (process.env.POSTEX_API_BASE_URL || "https://api.postex.pk").replace(
  /\/$/,
  "",
);

if (!token) {
  console.error(
    "POSTEX_API_TOKEN is not set. Add it to apps/admin/.env.local or the shell environment.",
  );
  process.exit(1);
}

async function get(path) {
  const url = `${base}/services/integration/api/order${path}`;
  const res = await fetch(url, { headers: { token }, cache: "no-store" });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { url, status: res.status, body };
}

console.log("PostEx smoke test\n");

const cities = await get("/v2/get-operational-city");
console.log("GET operational cities:", cities.status, cities.body?.statusMessage ?? "");

const pickups = await get("/v1/get-merchant-address");
console.log("GET merchant address:", pickups.status, pickups.body?.statusMessage ?? "");

const dist = pickups.body?.dist ?? pickups.body?.data;
if (Array.isArray(dist) && dist[0]) {
  const code =
    dist[0].addressCode ?? dist[0].pickupAddressCode ?? dist[0].address_code;
  if (code) {
    console.log("\nFirst pickup addressCode (set POSTEX_PICKUP_ADDRESS_CODE):", code);
  }
}

const cityList = cities.body?.dist ?? cities.body?.data;
const count = Array.isArray(cityList) ? cityList.length : 0;
console.log("\nOperational city rows:", count);

if (cities.status !== 200 || count === 0) {
  process.exit(2);
}

console.log("\nOK — token works and cities are returned.");
