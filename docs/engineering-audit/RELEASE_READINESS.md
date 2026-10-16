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
| Draft pull request CI | Pending branch push |

## Known blockers and risks

- Next.js 14.2.35 has unresolved runtime advisories with no non-major npm remediation.
- The Next 16 migration must remain separate from this CI repair.
- PR #2 will require manual workflow reconciliation to retain Node 24 and its database test job.
- Branch protection cannot be relied upon until required checks are confirmed after the draft PR workflow succeeds.

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

This Phase 1 branch is not authorized for production and is not release-ready until the final local gates and draft PR CI pass. Even after Phase 1 passes, unresolved Next.js advisories require a separate, tested framework remediation before the entire system can be called release-ready.
