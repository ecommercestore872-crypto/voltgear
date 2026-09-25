/**
 * Repo security audit (RLS + public env). Exit 1 on failure.
 *   npx tsx scripts/audit-security.ts
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import {
  auditEnvExamplePublicKeys,
  tablesMissingRls,
} from "../packages/shared/lib/security-audit-rules";

const repoRoot = path.resolve(import.meta.dirname, "..");
const migrationsDir = path.join(repoRoot, "supabase/migrations");
const envExample = path.join(repoRoot, ".env.example");

function loadMigrationSql(): string {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  return files
    .map((f) => readFileSync(path.join(migrationsDir, f), "utf8"))
    .join("\n");
}

const missingRls = tablesMissingRls(loadMigrationSql());
const envViolations = auditEnvExamplePublicKeys(readFileSync(envExample, "utf8"));

let failed = false;
if (missingRls.length) {
  failed = true;
  console.error("RLS missing for tables:", missingRls.join(", "));
} else {
  console.log("ok  All public tables have RLS enabled in migrations");
}

if (envViolations.length) {
  failed = true;
  for (const v of envViolations) console.error("env violation:", v);
} else {
  console.log("ok  .env.example NEXT_PUBLIC_* keys pass allowlist");
}

if (failed) process.exit(1);
console.log("\nSecurity audit passed. See docs/modules/security/SECURITY_AUDIT.md");
