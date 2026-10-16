const TARGETS = new Set(["storefront", "admin"]);

const GLOBAL_BUILD_INPUTS = new Set([
  ".npmrc",
  "package.json",
  "package-lock.json",
  "scripts/vercel-ignore-build.mjs",
]);

function normalizeRepositoryPath(value) {
  return String(value ?? "")
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\.\//, "");
}

/**
 * Conservative Vercel build scope for the two applications in this monorepo.
 * Shared application code and dependency inputs rebuild both projects; changes
 * isolated to the other app or to operational documentation do not.
 */
export function shouldBuildVercelProject(target, changedFiles) {
  if (!TARGETS.has(target)) return true;
  if (!Array.isArray(changedFiles) || changedFiles.length === 0) return true;

  const applicationPrefix = `apps/${target}/`;
  return changedFiles.some((file) => {
    const path = normalizeRepositoryPath(file);
    return (
      path.startsWith(applicationPrefix) ||
      path.startsWith("packages/shared/") ||
      GLOBAL_BUILD_INPUTS.has(path)
    );
  });
}
