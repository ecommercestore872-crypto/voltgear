# Admin release action manifest — incomplete, no execution authorization

See the later [local verification follow-up](LOCAL_RELEASE_PREPARATION_2026-10-28.md)
for closed local CI/migration/rollback gates. Hosted identifiers and execution
approvals below remain incomplete; no production action is authorized.

2026-10-28. Read alongside [readiness](PRODUCTION_RELEASE_READINESS_2026-10-28.md)
and [rollback](COMPATIBLE_ROLLBACK_PLAN_2026-10-28.md). Production remains NO-GO.
Keep every PR draft. No push, merge, deployment, production migration/data write,
credential change, paid resource or live setting change is authorized here.

## Exact permitted scope

| System | Identifier |
| --- | --- |
| Repository | `ecommercestore872-crypto/voltgear` |
| Local branch/base HEAD | `codex/isolated-staging-certification` / `c3304ccb6ab4c679aeedab0655769288f2f6236a`; final hydration source uncommitted |
| Supabase | `zeuhfqevqjkbzwdaxjuv` (Final-store) |
| Vercel team | `team_fcsXz74VGCxgnrYKGnOsSfLG` / `hassaans-projects-e3451522` |
| Admin | `voltgear-admin` / `prj_LgVWqruDirgQKMPgDgH0zpHtrC6K` |
| Storefront | `voltgear` / `prj_gHAuBl5SMG1FnJ45GeinQN2gNGnB` / `buyntryy.com` |

No other team/project/account is in scope. Never copy secrets into this manifest.

## Work needed before a release approval request

1. Curate an explicit source/test/docs allowlist from the existing worktree; retain
   unfinished tools and evidence. Review the five-commit/124-path dependency stack,
   choose PR base/merge order, and bind final committed source to build/test artifacts.
2. Close protocol/harness/CI coverage gaps from the readiness report. Ensure the
   chosen PR base triggers both `verify` and `product-integrity`; a child PR to
   `codex/isolated-staging-certification` currently does not match base filters.
3. Complete final matching-build cookie/native image acceptance, real local Auth
   migration30 verification, actual-file migration failure/lock/bookkeeping tests,
   and distinct secure rollback drill. Preserve prior failures and build archives.
4. Obtain Vercel read visibility through the intended existing connection. The
   current403/timeouts block an already-authorized read-only inventory; they do
   not justify switching accounts, changing permissions or bypassing protection.
5. Fill immutable deployment/environment/alias/protection/cron maps for both allowed
   projects. Check all old binaries and storefront proxies, not just the main URL.
6. Refresh read-only production metadata close to execution; today's observed
   migration history ends27 and lacks28/29/30. Confirm runner privileges and
   recovery/backup safeguards without using real customer records as tests.

## Separate approvals required, in order

| Approval | Exact scope that must be presented first |
| --- | --- |
| Publish source for CI | Curated immutable SHA, reviewed diff/SQL hashes, draft PR/base and dependency order. Explicitly account for automatic Vercel preview deployments from shared changes in **both** allowed projects; push is not side-effect-free. Current preview isolation is unknown and historical PR30 previews were production-connected. Resolve deployment side effects before approval. |
| Hosted isolated acceptance, if required | Named isolated origin/project/dataset/account, synthetic operations, trusted HTTPS and native-picker permissions, cleanup, quotas/costs and exact environment mapping. No production-connected preview writes or new paid resources. Prefer the existing local setup. |
| Retire/protect old admin access | Exact deployment IDs, URLs, aliases, proxy paths, exceptions/share access and integration treatment; scoped drain interval and before/after denial checks. No whole-team protection changes or incidental credential rotation. |
| Production SQL | The three exact files/hashes below, refreshed missing-history result, chosen runner and transaction/history strategy, lock/statement budgets, schema-cache/failure procedure and secure recovery. No writer exposure between28 and29. |
| Merge and production activation | Exact final CI SHA/run URLs and both immutable deployment IDs, ordered dependency merges, aliases/environment/cron mapping, old-entry closure, smoke scope and reopening criteria. Separate approval must cover any production synthetic writes. |
| Recovery execution | Exact previously verified B tuple and scoped cutover, or explicit admin restriction/fix-forward. No database data rollback or unsafe legacy target. |

Reading statuses, metadata and existing logs does not need another approval under
this task. Running final GitHub CI requires the final source to exist remotely and
the correct event/base; that publish/PR step is not currently authorized. A rerun
of old-commit CI cannot certify working changes. No complete final Check Runs
inventory has been claimed from the limited workflow/status wrappers.

Hosted checks needing the above scoped test/config approvals include final cookie
login/logout/revocation and legacy-cookie denial across inventoried URLs; native
image upload/save/reload/publish/storefront rendering; isolated commerce/review/
collection conflicts; final session latency; actual protection/integration behavior;
and a distinct compatible rollback traffic switch. Read-only availability probes
and previously recorded local tests cannot replace those checks.

## Production SQL identity — prepared only

Apply only after separate approval and only if the refreshed history still lacks
these versions. Preserve byte identity or restart hash/review/test gates.

| Order | File in `supabase/migrations/` | SHA256 |
| --- | --- | --- |
| 1 | `20261028000000_product_integrity_v2.sql` | `3ED0B3A4CB7DB6C5ACCEF962A3696CA46A035DCAF528C699761F884D000E8577` |
| 2 | `20261029000000_collection_integrity.sql` | `C54B95DEEF2FA84E4B73A96E6243B7A638F8BC5EDD4921E742ABCE7F2406725A` |
| 3 | `20261030000000_admin_browser_sessions.sql` | `51B5B287ECA1B5112611CF03D0D9E3A7CDAA91D27D505A8E8519C60173288748` |

**Status:** final SHA/CI, old-deployment closure plan, final media/Auth acceptance,
runner/failure plan and distinct recovery target are incomplete. Report those
blockers first. Do not request blanket production approval or execute this
manifest until each required field and gate has verifiable evidence.
