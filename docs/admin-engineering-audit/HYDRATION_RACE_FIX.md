# Admin streamed-document hydration race — local investigation

Working branch: `codex/isolated-staging-certification`; base HEAD
`c3304ccb6ab4c679aeedab0655769288f2f6236a`. Changes remain local and uncommitted.
No push, merge, deployment, production data access/mutation, credential change or
certificate trust change is included. Previous acceptance evidence is retained.

## Reproduction and confirmed mechanism

The original production admin build `1-LdQDvIe901cfKWAaelX` was run with
`next start`, `NODE_ENV=production`, an ephemeral loopback-only bearer and the
existing guarded synthetic Supabase lab. This is a rendering investigation, not
replacement evidence for browser cookie authentication or native file selection.

- Unmodified baseline `0e4b07fe-befc-48e1-9d01-e405f6c99820`: twelve list/editor
  cycles, React418 on editor loads3,7,9. Synthetic product digest unchanged;
  browser/app closed and port3301 released.
- Diagnostic `073e1e0a-d11e-48fc-a86d-4bf1430ebe92`: on cycle3, a list-page418
  was followed by `$RS` reading `parentNode` from null.
- Diagnostic `b58ff437-0d30-4d56-be08-19180041c8d2`: both list and editor produced
  the same pair in cycle1. The captured hydration cursor was a `#comment` with
  value `$?`, inside the admin content container. The fiber expected the container
  `<div class="flex-1 overflow-x-auto p-4 lg:p-8">`. The browser's
  `document.readyState` was **loading** at both mismatches. The later `$RS` errors
  occurred after React's hydration recovery had replaced the streamed DOM.

Diagnostic runs served an in-memory copy of the original React client chunk with
only tag/class/parser-state logging at the existing throw site. They preserved
the original throw and did not suppress errors, modify props/state or write the
old bundle. Diagnostic observations are distinguished from the unmodified run.
Reports are immutable UUID-named files under ignored `tmp/isolated-staging`.

The failure is a race with incompletely parsed streamed HTML, rather than a
price/inventory edit or a server/client numeric disagreement. Both errors belong
to the same sequence: premature hydration recovery, then a late streamed segment
targeting DOM that recovery removed. Relevant upstream corroboration:
[React issue37321](https://github.com/react/react/issues/37321) and the still-open
[proposed upstream correction37835](https://github.com/react/react/pull/37835).
No unmerged upstream patch or global Scheduler modification was adopted.

## Small scoped mitigation

`AdminLayout` encloses its existing content in `AdminHydrationBoundary`. That
boundary uses native React Suspense to wait for initial document parsing **and
queued server reveal commits**. A WeakMap supplies the same pending promise on
concurrent retries, with a second ready-state check closing the listener race.
After parsing, animation-frame callbacks observe whether React's `$RB` queue has
cleared. They never drain, replace or modify that queue or the Scheduler.

Server rendering remains enabled: server execution does not suspend, and the
actual boundary's SSR test verifies that its children appear in the HTML.
Already parsed documents without queued reveals and subsequent client navigation
do not wait. There is no window-load/image wait, arbitrary release timer, framework monkey patch,
DOM replacement, error suppression or change to authentication/data operations.
The unavoidable tradeoff is that initial admin interactivity waits for the
complete document parse. This applies only to the admin application layout;
the public storefront code is unchanged. Interactivity also waits for genuine
queued reveal commits if parsing has finished before those commits run.

Independent read-only source review found no blocking security/data-integrity
issue or inherent circular wait. That review is not browser proof. `$RB` is an
undocumented Fizz implementation detail: this mitigation is version-bound to the
installed Next15.5.28 stream implementation. The production browser runner
explicitly checks the Next version and the browser/edge Fizz queue protocol before
running; a dependency change must be reviewed and revalidated. A genuinely stuck
nonempty reveal queue continues to defer hydration; no timer resumes known-unsafe
hydration. Browser foreground/lifecycle evidence must qualify this behavior.

## Verification ledger

- Six focused regressions pass: server/already-parsed fast paths; stable pending
  promise and release; completion during listener registration; real boundary SSR;
  pending reveal commits after parsing; pending commits after DOMContentLoaded.
- First full gate captured an architecture-test failure because the SSR UI test
  was initially placed in the domain-library directory. The test was moved into
  the admin app's test tree; no architecture safeguard was relaxed. Failure log
  is retained in `hydration-gates-399d813f-e57a-42e5-89fa-ad5537e5d4d1`.
- The first DCL-only proposal passed1088 tests, both lint/typechecks/builds and
  ten budgets, but failed real production browser regression. Build
  `41I41VZIDZWdtmkVBu7BO`, report `0f9064ab-ffce-4ee8-b7a8-17b9a7ff7a5e`,
  still reported418 on a list load. A mobile test then attempted the covered
  header close control; the harness now clicks the actual outside backdrop,
  without forced clicks or a UI code change.
- Follow-up diagnostic `bf8c1aef-4245-47b8-8377-dad7dfa15895` completed30 cycles
  and captured the remaining editor mismatch at `readyState:interactive`, with
  **four queued reveals** and cursor comment `$~`. Installed React Fizz source
  confirms `$RC` queues the reveal and `$RV` commits it via a frame/delayed flush.
  This established why parsing alone was insufficient; that proposal is not
  certified as a fix. Its reports and both compiled builds are preserved.
- Revised full gate checkpoint: **1090/1090 tests,380 suites; both workspace lint
  and typechecks pass**. Both fresh production builds passed; all ten storefront
  performance budgets passed again. Full gate directory:
  `hydration-gates-07b0f60d-37ac-4c4b-b1b4-0e4ab66d7795`.

The complete earlier `.next` trees were atomically archived under that first gate
directory: `admin-prior-build` and `storefront-prior-build`. Their original
BUILD_IDs are retained, including storefront `uUlRAKU1-Dmj0d1mhq514`. New build/gate
records include exact changed-source SHA256 hashes; no final commit CI is implied.

## Final production browser result — verified 2026-10-28 Pakistan time

**Local hydration regression passed.** Build IDs:
admin `FEF0cc4t51VthUMaOCSpQ`; storefront `ODfejI3iW0q0o3XVK7zj1`.
The compiled admin layout chunk `layout-3d576271d8a5142c.js` was also checked to
contain the actual queue predicate and animation-frame polling. Installed Next
is15.5.28; its App Router vendors React `19.2.0-canary-0bdb9206-20250818`, distinct
from the root React18.3.1 package. No dependency version was changed.

Final report: `hydration-regression-e5d2bb1b-1c88-46c0-b51f-ea188a3f67ce.json`,
finished2026-10-27 19:43:46UTC /2026-10-28 00:43:46 Pakistan time.

- **30 list/editor cycles**: ten1440px desktop, ten390px mobile, ten390px with
  20ms latency and1500kbps download/750kbps upload limits. Ten cycles additionally
  opened the new-product editor. No new product was created or saved.
- **Zero page runtime errors**, including no418 and no `$RS` error. No React
  bundle override or diagnostic throw-site logging was used in this final run.
- 26 samples observed a nonempty reveal queue at parse completion. The regression
  exercised the actual late-reveal condition, rather than avoiding pending streams.
- The editor's price input was present in the actual server HTML, and the exact
  same DOM node was retained through hydration on all30 editor checks. This
  verifies SSR preservation rather than a silent switch to client-only UI.
- Price1999, cost300 and quantity5 remained correct; real input and mobile menu
  events worked after hydration. The synthetic product's database-row digest was
  unchanged before/after the run.
- A page navigation frozen immediately after response commit and subsequently
  reactivated completed successfully. This is a controlled Chrome lifecycle test,
  not certification of every OS background-tab or physical Safari behavior.
- The login email field remained interactive; no login submission or stored
  credential change was performed. Authentication here used an ephemeral local
  machine bearer, not a new cookie/native-upload acceptance claim.
- Owned browser/app cleanup succeeded, admin port3301 was free, and the report
  has `passed:true` and an empty cleanup-error list.

### Early interaction and timing qualification

The first final-build attempt `bd38263a-f05a-4920-9ae1-0beedac8ef24` had also
completed30 error-free cycles, but its additional pre-hydration click assertion
timed out. It is retained with `passed:false`. The corrected diagnostic inspected
document click-listener presence read-only, without reading handlers or application
state. In the final run, the attempted early click at155.1ms occurred while parsing
and **before a root click listener existed**; it was not handled or replayed.
Once client controls were hydrated, a normal click worked. The runner still fails
if a click is lost after root event wiring or if the hydrated control does not work.
No forced click or production UI workaround was added to make the test pass.

In this single throttled diagnostic, `domInteractive` was814.4ms,
DOMContentLoaded ended at815ms, and the confirmed handled menu state was sampled
at1805.8ms. These include network/JavaScript/automation time and do **not** isolate
the guard's overhead or establish hosted latency. Pre-JavaScript interaction is
not guaranteed. Original native HTTPS/upload reports remain historical evidence;
this task did not repeat manual selection or certify physical-device acceptance.

Existing synthetic image failures (including the old `synthetic-original` seed)
are outside this rendering regression, whose network guard also blocks prior
HTTPS media origins. Zero runtime errors is not a claim of zero network/console
messages or a new end-to-end upload test.

## Remaining release boundaries

This closes the locally reproduced hydration/streaming blocker for the tested
version and conditions. Future Next/React updates require the queue protocol and
browser regression to be revalidated; a permanently stuck queue is not bypassed.
No remote final-commit CI or hosted deployment verification was performed because
push/deployment are forbidden in this task. Old-admin protection and hosted
compatible-rollback gates remain separate. No production readiness approval is
implied by this local fix.

## Final cleanup and artifact check

At2026-10-27 19:49:04UTC /2026-10-28 00:49:04 Pakistan time, a privileged final
verification matched all five reviewed source/test hashes to the full-gate record,
matched both current BUILD_IDs, and verified the passing browser report. All eight
application/diagnostic ports were free (3300,3301,3302,3310,33443,33444,33445,55421),
all eight exact owned Supabase containers were stopped, the temporary certificate
was absent from both trust stores, and private browser input was absent.

Record: `hydration-final-verification-e5d2bb1b-1c88-46c0-b51f-ea188a3f67ce.json`,
`passed:true`. All volumes, fixtures, original native-upload evidence, failed runs
and earlier builds remain retained. The rejected bootstrap-ordering probe was
archived intact under ignored staging rather than included in the source patch.
No production/live credential or data change, remote Git write, merge or deployment
was performed. Changes remain local for review.
