# Rollback Runbook

## Phase 1 source rollback

Phase 1 changes are isolated on `codex/phase-1-ci-security` and do not modify production.

If the draft PR is rejected, close it and delete the branch only after preserving any review evidence that is still required. No production rollback is necessary.

If the Phase 1 commit is later merged and CI regresses:

1. Revert the Phase 1 commit with a new revert commit; do not force-push `main`.
2. Confirm the workflow returns to its previous definition.
3. Record why Node 24 failed before selecting another runtime.
4. Do not restore Node 20 unless the unit-test isolation flag and all dependency engine requirements are also made compatible.

## Validation after rollback

- Confirm `package.json`, `package-lock.json`, `.nvmrc`, and the workflow agree on the intended runtime.
- Run a clean `npm ci`.
- Run tests, both linters, both app type checks, and both app builds.
- Verify the GitHub Actions result on an isolated branch.

## Data and infrastructure

This phase performs no database, Vercel project, domain, secret, or production deployment mutation. There is therefore no data restoration, migration rollback, or cloud-resource recovery step.
