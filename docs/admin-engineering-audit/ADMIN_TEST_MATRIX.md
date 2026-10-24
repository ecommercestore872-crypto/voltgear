# Verification matrix

## 2026-10-24 product integrity extension

See [exact evidence and limitations](PRODUCT_INTEGRITY_V2.md). Real disposable PostgreSQL
17 tests now cover both lock orderings of checkout/cancellation/review approval versus
publish, stale admin revisions, inventory ABA, explicit stock conflicts and rollback.
These tests use actual RPCs and synthetic data, not production or mocked database writes.
Raw input/API/adapter and editor tests additionally cover original invalid numeric text,
uncertain write outcomes, initial stock and draft-only inline collection membership.
Native picker/provider, full migration replay and HTTP acceptance are separate gates.

Tests describe what was actually exercised, not business acceptance by implication.

| Area | Evidence | Limitation |
| --- | --- | --- |
| PostEx eligibility/validation | Fake dependencies reject terminal/shipped/demo/invalid IDs before any provider/claim work | No real courier request |
| PostEx claims/finalization | In-memory fluent query tests cover state/demo predicates, duplicate claims, ownership, zero-row failure, changed terminal state | Query contract, not PostgreSQL isolation/concurrency proof |
| Existing PostEx lifecycle | Existing fake-provider duplicate/ambiguous-failure tests retained; focused security/booking run 24/24 passed | No staging provider integration |
| Cookie Origin | Exact direct/proxy origins, missing/opaque/sibling/lookalike origins, malformed config/forwarded host, bearer compatibility; focused Origin/auth run 9/9 passed | No deployed proxy mutation |
| Orders search/navigation | URL/revision sequences plus existing server order rules, 15/15 focused passed; synthetic browser search+tab, next-page and Back verified before final race correction | Pure tracker tests cover old responses; final React adversarial timing remains browser-unverified |
| Order timestamps | Browser reproduced SSR/client locale hydration mismatch; shared explicit en-GB/Asia-Karachi formatter; 2/2 timezone/invalid-date tests passed | Other admin date renderers still need review |
| Command search | Real adapter/API loaded with mocked dependencies; narrow query, no hydration/draft query, input/candidate bounds, scoring/ranking/12-hit cap, error propagation; 9/9 focused passed | Not DB execution-plan/payload timing evidence |
| Category freshness | Runtime cache registration guard checks same tag invalidated by product writes | Does not execute Next cache invalidation |
| Whole monorepo, previous batch | `npm run ci` exit 0: 801/801 tests, both lint/typechecks and both production builds | Current follow-up gate is recorded below; not deployed integration |
| All admin business modules | Feature/source map and independent review | No blanket CRUD, publication or communication acceptance claim |

Responsive fixture checks: actual CSS widths 360, 390, 768, 1024, 1440 for actual
OrderList/OrderDetail inside AdminShell; no document-level horizontal overflow.
Local Next dev on 127.0.0.1:3101 used synthetic data and no production credentials.
Mobile menu opened/closed; terminal/demo booking visibly disabled. Fresh detail tab
had no console errors after timestamp fix. Temporary fixture route removed before staging.
This is not a complete accessibility audit: internal table scrolling and dialog focus
remain separate checks. Authenticated business-route measurements remain pending isolated data;
do not interpret login screenshots or a successful build as coverage of these workflows.

Never run `verify-checkout-e2e.mjs`, inventory verification, admin warm/cron, messaging,
email or provider-booking scripts against production as harmless health checks.

## Combined gate result

The previous combined gate completed with exit 0: 801/801 tests, both
lint runs, both TypeScript checks, and both production builds passed. This includes
the final delayed-search-response correction and client-safe email marker. No fixture
route was included in the build. `git diff --check` passed. Earlier intermediate
full gates are not substituted for this final result.

## Operational-list and editor follow-up evidence

| Area | Observed evidence | Limitation |
| --- | --- | --- |
| Product list | Fluent adapter fixtures: combined filters before range/count, search beyond 120, stable ordering, draft lookup scoped to returned page, malformed search, API auth/errors | Mock contract, not deployed query plans |
| Product navigation | Controlled hook sequences: newer typing survives earlier URL responses; category/stock/page preserved; debounce cleared on navigation/unmount | Not browser adversarial transport integration |
| Inbox directory | 300+ synthetic rows, older records reachable, matching totals/filters, invalid filters, API auth/errors | No real customer data read or status/note save |
| Newsletter directory/export | 612-row fixture, 607 subscribed across multiple batches, keyset deletion stability, empty/error/cancel/stream failure cases, CSV auth/formula rules retained | Subscription updates during export can change membership; not transactional snapshot |
| New editors/customer errors | Dirty hook pristine/edit/save/reset simulation; guards ensure new forms enable tracking; actual transpiled customer page rejects mocked DB error | No browser save/publish or live customer directory |
| Palette transport | Controlled hook/effect simulation reverses transport completions despite ignored abort, closes during request, suppresses late failure | Browser/network timing not inferred from unit simulation |
| Palette browser | Visible mobile control, focus trap, Escape, settled opener return focus, Ctrl-K reopening; actual Radix dialog within 360/390/768/1024/1440 viewports; no warning/error logs | Synthetic local route, not authenticated deployed acceptance |
| Inbox browser | Read-status fixture opened without mutation; editing then selection emitted discard-note confirmation | Browser tool consumed confirmation before Cancel path could be verified; retention not claimed |
| Lists browser | Actual products/inbox/newsletter components at all five widths, no document-level horizontal overflow | Small synthetic dataset, no real filtering/navigation/mutations or CSV download |
| Dates | Explicit en-GB/Pakistan order/inbox/newsletter date tests and fixture rendering | Not all admin date surfaces reviewed |

The temporary fixture route and development cache were removed before staging/build.
Screenshot evidence uses only synthetic content, stored outside the repository.
Independent workers' final review was interrupted by usage limits; main-agent source,
browser and gate checks do not substitute for that unfinished independent release review.

Final follow-up gate on the combined source saved in `05b1ff2` and `d8c7cbf`:
`npm run ci` exited 0: **836/836 tests**, both lint runs, both TypeScript checks,
both production builds. `npm run check:performance-budget` exited 0; all ten
storefront JavaScript/CSS checks passed. `git diff --check` passed. Fixture absent
from source and generated route manifests. No production environment file was loaded.

Post-gate build-script regression: initial PR25 preview checks appeared green, but both
deployments were CANCELED and logs explicitly attributed this to ignored-build exit 0.
The unsafe missing-baseline HEAD^ fallback was replaced with conservative build behavior.
Actual script tested through controlled process/git dependencies: missing/zero baseline,
multi-commit range, verified docs/other-app skip, failed/empty diff and unknown target.
Focused script/scope run **8/8**, complete subsequent `npm test` **840/840**, admin
typecheck and `node --check scripts/vercel-ignore-build.mjs` passed. This last change
only affects build gating, not application bundles; no second full CI build is claimed.

## Product media/editor acceptance — 2026-10-23

| Area | Observed evidence / limit |
| --- | --- |
| Media unlink/paste/reorder/upload races/errors/unmount | 8 controlled actual-component tests passed; mocked transport, not DOM/provider integration |
| Upload API/auth/file/provider boundaries | Real tiny raster decoding plus mocked providers; oversized before buffering, renamed/truncated content, HEIC conversion, ambiguous fallback prevention, no deletion |
| Product repeat Save/failure retry/blur upload race | Controlled actual ProductForm tests passed; no backend mutation |
| All upload locations/disabled controls | Actual component props/callback tests; not rendered evidence |
| Unpublish/discard/membership baseline | Same-session component regressions; not persistent/concurrent-editor certification |
| Color cleanup / pending pristine guard / badge/social hydration | Controlled component/hook and pure-helper regressions passed |
| Actual create/reload/publish/stock/checkout | NOT integration-tested; production-connected previews forbidden |
| 360/390/768/1024/1440 rendered UI, actual picker/focus | NOT VERIFIED: browser tool unavailable before launch; fixture source removed |
| Independent final review | Incomplete due worker usage limits; coordinator checks are not independent sign-off |

Final local gate on the combined product/media source: `npm run ci` exited 0 with
**874/874 tests**, both lint runs (no warnings/errors), both TypeScript checks and
both production builds. `npm run check:performance-budget` exited 0 with all ten
checks passing; `git diff --check` passed. Temporary fixture routes are absent.
No production environment file was loaded. These results do not establish rendered
browser acceptance or real provider/database integration. Exact remote commit/run
and preview results must be verified separately after pushing the draft branch.

### Product deletion follow-up

- Actual adapter under mocked database/Storage: five regressions passed for successful
  deletion, shared live/draft images, missing product, rejected deletion and deferred
  completion. Storage access throws in the harness; zero accesses observed.
- Actual runner under controlled process/filesystem: five regressions passed for
  direct Node launch, >8 KB arguments, empty discovery and failure exit propagation.
- No real deletion, schema/cascade/RLS test, rendered UI acceptance or orphan cleanup.
- Combined local gate log: 884/884 tests, both lint/typecheck runs and both production
  builds completed successfully; all ten bundle-budget checks and whitespace verification
  passed. The execution handle was lost across tool reconnection, so no recovered
  process-exit-code claim. Verify exact-commit remote CI separately.

### Rendered product follow-up (synthetic localhost, not deployed acceptance)

- Exact viewport tests: 360/390/768/1024/1440 px. Before correction at 360: 403 px
  body vs 350 px client. After correction body/client matched at all five widths;
  no descendants extended beyond the client edge. Mobile-touch 390 screenshot
  and desktop 1440 screenshot inspected inline; file export denied by tool policy.
- Photo reorder/remove: actual controls changed URL order/membership; fixture API
  interceptor observed no calls. Mocked Unpublish retained unsaved title/dirty state.
- Actual beforeunload prompt: Dismiss retained edited text. Not a browser Back test.
- Final console read: zero warnings/errors; only local HMR/RSC requests observed.
- Native picker could not read a local image due tool path permissions. Upload locking
  remains unit-covered, not browser-certified. No real persistence/provider testing.
- Focused editor tests: 7/7, including responsive structure guard. Final `npm run ci`
  exited 0: 885/885 tests, both lint/typecheck runs and both production builds.
  All ten storefront bundle-budget checks and whitespace verification passed.
  No fixture routes in the final generated admin app manifest.
