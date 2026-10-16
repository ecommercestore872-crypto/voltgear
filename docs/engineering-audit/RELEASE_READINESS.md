# Release Readiness

## Phase 1 acceptance gates

| Gate | Status |
| --- | --- |
| Isolated branch/worktree | Pass |
| Base equals current `origin/main` | Pass at Phase 1 start |
| Node 20 failure reproduced | Pass |
| Node 24 clean install | Pass |
| Unit tests | Pass locally: 705/705 |
| Storefront lint | Pass; no warnings or errors |
| Admin lint | Pass; no warnings or errors |
| Storefront TypeScript | Pass |
| Admin TypeScript | Pass |
| Storefront production build | Pass; 54 pages generated |
| Admin production build | Pass; 37 pages generated |
| Lockfile consistency | Pass; clean install and final offline dry-run both succeeded |
| Dependency report | Pass; unresolved findings documented |
| Full diff and secret review | Pass; 13 scoped files and no secret pattern detected |
| Draft pull request CI | Pass; `Monorepo CI` run 38896519413, `verify` job 116958181777 |

## Known blockers and risks

- Next.js 14.2.35 has unresolved runtime advisories with no non-major npm remediation.
- The Next 16 migration must remain separate from this CI repair.
- PR #2 will require manual workflow reconciliation to retain Node 24 and its database test job.
- Repository rulesets are not currently visible on the public endpoint; the confirmed required check name is `verify` from `Monorepo CI`.

## Recommended `main` protection settings

The public repository ruleset list is currently empty. The branch-protection endpoint requires authenticated administration access, so no protection change was attempted.

After the draft PR check name is confirmed, configure `main` with:

- Require a pull request before merging.
- Require at least one approving review and dismiss stale approvals.
- Require conversation resolution.
- Require the `verify` status check from `Monorepo CI` to pass and require branches to be up to date.
- Block force pushes and branch deletion.
- Do not allow bypass for routine changes.

When PR #2 is reconciled, also require its isolated Supabase database regression job before merging database-dependent code.

## Production readiness statement

Phase 1 acceptance gates pass locally and on the GitHub-hosted runner. This draft branch is still not authorized for production or merge. The unresolved Next.js advisories require a separate, tested framework remediation before the entire system can be called release-ready.
