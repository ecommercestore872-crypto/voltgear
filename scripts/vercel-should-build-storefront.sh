#!/usr/bin/env bash
set -euo pipefail

# Vercel Ignored Build Step: exit 0 = skip build, exit 1 = run build.

if [ -z "${VERCEL_GIT_PREVIOUS_SHA:-}" ] || [ -z "${VERCEL_GIT_COMMIT_SHA:-}" ]; then
  exit 1
fi

if git diff "${VERCEL_GIT_PREVIOUS_SHA}" "${VERCEL_GIT_COMMIT_SHA}" --quiet -- \
  apps/storefront \
  packages/shared \
  package.json \
  package-lock.json; then
  echo "No storefront-relevant changes; skipping build."
  exit 0
fi

echo "Storefront-relevant changes detected; building."
exit 1
