# Local release preparation — verification follow-up

2026-10-28 Asia/Karachi. **Local preparation verified within the scope below;
production remains NO-GO.** This follows the earlier independent
[readiness review](PRODUCTION_RELEASE_READINESS_2026-10-28.md), preserving it as
historical evidence. No push, staging, commit, merge, deployment, production data
or credential change, live setting change or paid resource was performed.

## Completed local work

| Item | Verified result |
| --- | --- |
| Portable streaming checks | **10/10 passed** on this Windows/Node24 host. Exact Next15.5.28 and vendored React19.2 canary versions plus browser/edge Fizz artifact hashes are checked. Tests execute decoded installed reveal scripts with controlled DOM/scheduling and the real readiness helper; cover frame/timer ordering, suspended frames, missing segments and delayed CSS behavior. Linux execution awaits remote CI. |
| CSS scope gate | Current runtime CSS imports occur only in the admin root layout. New literal CSS references outside that layout or explicit stylesheet/precedence resources in admin/shared source fail the gate for review. This is a conservative structural safeguard, not proof against computed paths or all indirect dependency/resource changes. |
| CI wiring | Added streaming tests, all19 existing staging safety contracts, three migration-plan contracts and the missing isolated-staging PR-base filter. No remote workflow ran. |
| Source checks | Fresh1090/1090 unit tests (380 suites), both app lint/typechecks,19 staging contracts, three plan contracts and all ten existing storefront build budgets passed. The final streaming version has10 passing tests; the earlier full-gate log has its preceding9-test version. Targeted checks were rerun after that addition. |
| Actual migrations | **11/11 isolated checks passed** using psql/PostgreSQL17.6, actual complete provider Auth/Storage schema and all61 prior migrations. Three reviewed SQL file hashes remain unchanged. |
| Distinct rollback | New admin build **`lfCpIVNOPuRowYV69AynL`**, current admin **`FEF0cc4t51VthUMaOCSpQ`**, retained storefront **`ODfejI3iW0q0o3XVK7zj1`**. **Five rollback acceptance groups passed**, including ten production browser editor visits (five desktop/five mobile), zero runtime errors and retained SSR input nodes. |
| Change organization | [Explicit change inventory](FINAL_CHANGE_INVENTORY_2026-10-28.md) separates focused source/CI, local safety harnesses, evidence and unfinished tools. The index and HEAD remain unchanged. |

## Streaming qualification

The behavioral checks confirmed that React's stylesheet reveal script can wait for
CSS before adding an entry to `$RB`. Queue emptiness is therefore not a universal
proof that every future reveal has finished. The current root-only CSS structure
and its new CI guard bound the reviewed source scope; they do not remove the
undocumented React dependency. Dependency upgrades, new stylesheet resources or
changed streaming architecture require review and actual production-browser tests.
No global scheduler patch, timer release, certificate bypass or error suppression
was introduced. The already-tested primary hydration runtime is unchanged.

## Actual migration runner and failure evidence

`release-migration-plan.mjs` is the explicit proposed runner contract. It hashes
the original files, checks the61-migration/ending27 baseline, takes a transaction
advisory lock and bounded table locks, and executes28/29/30 plus history inserts
and schema notification in **one transaction**. Only30's exact known outer
BEGIN/COMMIT wrapper is normalized in memory after hash verification; the SQL
source files are not edited. There is no writer-visible interval between28 and29.
This is **not** a certification of Supabase CLI2.116 `db push` semantics.

The execution entry point accepts no remote database URL or production mode. It
verifies the existing owned loopback lab, restores schema only into fresh owned
databases, preserves actual provider ownership/grants, and replays the61 prior
repository migrations. Only empty schema cloning uses the existing local
`supabase_admin`; actual application migrations/failure scenarios run as `postgres`.
No role grants, passwords or existing database objects are changed to make tests pass.

Passing cases: before28; inside28; after28; inside29; after29; inside30 after the
identity trigger; after30; after history inserts; lock timeout followed by success;
reapply baseline rejection without changes; actual synthetic Auth-session creation,
password change/reversal revocation and privilege checks. Failure cases compare
schema/grants, sentinel product data and history before/after; session table and
identity trigger disappear on rollback. Lock failure uses500ms and success uses
1000ms lock/30000ms statement budgets. These are test settings, not production SLAs.

Evidence: `tmp/isolated-staging/actual-migrations-85d8208e-cd91-4d45-8407-6f6c525108c3/results.json`.
Two earlier schema-clone setup failures remain retained: a restricted-role restore
and a clone that discarded original ownership. Neither was production execution.
All new test databases and fixtures remain retained with their ownership comments.

## Distinct rollback proof and limits

The recovery build is a source snapshot with one deliberate runtime difference:
wait for document **complete** as well as no queued reveals. This conservative
variant trades slower initial interaction for an additional readiness condition.
Its auth, publishing, collection and data-layer source hashes match the current
candidate. It is not merely the same binary with a relabeled BUILD_ID, and it is
not a formerly deployed known-good version. Snapshot manifest records every copied
source hash and the differing component hash; original worktree/builds are retained.

The drill actually stopped A and started B at the same loopback admin origin.
It verified persisted checkout stock, cancellation restoration, independently
moderated review identities/ratings/aggregates, manual collection membership,
stale draft/inventory409s, legacy-cookie denial, persisted v2 cookie acceptance,
logout replay denial, fresh login and503 during safe-writer unavailability.
The writer grant was restored in finally. The built storefront served B's published
name. Browser visits preserved SSR inputs and produced zero page runtime errors.

Browser rendering uses an ephemeral legitimate local **machine bearer**. Cookie
semantics were checked through HTTP requests, not native secure-cookie browser
login. Neither native file selection/upload nor trusted browser HTTPS is certified
by this drill. Ten visits do not replace the prior30-cycle primary-build regression
or physical Safari/device acceptance. A real hosted rollback still needs exact
deployment IDs, environment/cron/alias mapping and protection/integration tests.

Retained failed drill reports include a contradictory inventory test payload
(correct400), two local pooled-fetch ECONNRESETs, and a timed-out browser wait using
an attempted route Cookie override; native browser-cookie acceptance was not verified. The
passing harness uses a fresh, non-reused storefront HTTP socket without retries
and the existing supported bearer for rendering. No application networking or
authorization was weakened. The earlier connection resets are retained transport
observations; no production transport root-cause fix is claimed.

Passing evidence:

- `tmp/isolated-staging/rollback-build-2cd4d63a-6fd1-4be1-ab74-fc249f76b1fd/manifest.json`
- `tmp/isolated-staging/distinct-rollback-4f87c683-b791-4aac-9076-03d95ff476d9.json`
- `tmp/isolated-staging/release-prep-gates-bfbfa7b7-5938-451a-b296-2ab5209775c0/results.json`
- `tmp/isolated-staging/release-readiness-20261028/local-preparation-final-verification.json`

Final verification matched all five primary hydration source hashes and both
original BUILD_IDs, bound the new CI/harness source hashes to retained reports,
confirmed the passing distinct B artifact, and verified12 test ports free and all
eight owned containers stopped. Both Current User and Local Machine checks found
the exact old temporary certificate absent. The Git index is empty and HEAD is
unchanged. All databases, fixtures, volumes, earlier failed/unbuilt snapshots and
reports are retained. The successful snapshot uses ordinary ancestor module
resolution; no junction permission override was used.

## Remaining external access, manual actions and approvals

1. **Vercel read access:** inventory both allowed projects' current/old deployments,
   URLs, aliases, source/environment/cron bindings and protection exceptions. Last
   exact-project reads were403; no new hosted access attempts were made here.
   Read-only inspection is already authorized; access itself remains missing.
2. **Final source publication approval:** review the curated diff and dependency
   stack, then separately approve a draft PR/push and its automatic preview effects.
   Confirm isolated environment mapping first; never use production-connected
   previews for synthetic writes. Exact-final-SHA GitHub CI/Check Runs and actual
   Linux execution cannot be produced while publishing remains forbidden.
3. **Final browser acceptance:** trusted isolated HTTPS and the two authorized
   native file selections, cookie login/upload/preview/save/reload/publish/storefront
   rendering on matching final artifacts remain required. Any new temporary
   certificate needs its exact path/fingerprint, manual Current User import and
   exact removal. No new trust was installed in this task. Hosted synthetic tests
   need separately approved isolated targets and scope; no paid infrastructure.
4. **Hosted behavior and performance:** verify real hosted Auth/trigger/session
   behavior, session latency and integration/protection interactions. Local psql,
   HTTP cookie checks, bundle budgets and rollback proof are not hosted certification.
5. **Production actions:** approve exact old-admin retirement/drain actions,
   freshly verified migration history/privileges, the tested runner and SQL hashes,
   production timeout/maintenance/recovery plan, then exact merge/deployment/alias
   cutover and smoke scope. Live backup/restore safeguards remain unverified. No
   unsafe old binary, legacy writer regrant or database-data restore is a rollback.
6. **Operational rollback:** publish and verify a reproducible secure B artifact and
   its effective environment/cron/aliases before treating local B as a hosted
   recovery target. Execution requires its own precise approval.

**Decision:** the requested local CI preparation, migration matrix and distinct
rollback proof are complete within these stated limits. **Production NO-GO** until
the final immutable candidate, native authenticated media acceptance, hosted access/
behavior, old-deployment closure and separately approved release actions are verified.
