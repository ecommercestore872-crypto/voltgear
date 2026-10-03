import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { adminAuthEmailAllowlist } from "../packages/shared/lib/admin-auth-email";
import { ensureAuthUserForEmail, findAuthUserByEmail } from "../packages/shared/lib/admin-auth-supabase";
import { getServiceClient } from "../packages/shared/lib/supabase/server";

function loadEnv(file: string) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

loadEnv(".env.local");
loadEnv(".env");

async function main() {
  const admin = getServiceClient({ admin: true });
  for (const email of adminAuthEmailAllowlist()) {
    const before = await findAuthUserByEmail(admin, email);
    const user = await ensureAuthUserForEmail(admin, email);
    console.log(before ? "exists" : "created", email, user.id);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});