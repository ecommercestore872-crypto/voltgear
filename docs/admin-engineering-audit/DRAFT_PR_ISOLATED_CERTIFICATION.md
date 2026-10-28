# Prepared draft PR — not published

Repository: `ecommercestore872-crypto/voltgear`.
Head: `codex/isolated-staging-certification`.
Base: `codex/collection-integrity-acceptance` (draft PR30).
Keep this and dependency PRs draft. Obtain the user's approval for the exact final
commit before push/creation. Verify Git-connected preview effects first: draft PRs
may trigger deployments. No merge, production migration or live deployment.

## Title

Harden admin browser sessions and record isolated release acceptance

## Proposed body

Admin browser sessions previously used a permanent derived credential, which could
survive logout/account changes. Replace it with unique expiring, database-validated
sessions, bound to the authenticated identity and Auth session. Reject legacy
cookies and unavailable validators; preserve existing machine bearer behavior.
Await authorization across admin APIs, target password self-service at its actor,
and retain the editor/retry feedback until logout is confirmed. Successful logout
uses full navigation to discard the protected client-router cache.

Prepare additive migration `20261030000000_admin_browser_sessions.sql` with
service-only privileges and identity revocation; **apply only in the owned local
synthetic lab**. Retain the reviewed product/collection migrations and media
deletion safeguards. Include isolated integration/recovery harnesses, the verified
Node24 Tailwind configuration compatibility fix and upload-outcome handling needed
for local acceptance. No application feature expansion or production mutation.

### Validation already observed locally

- Latest full gate:1090 application tests,380 suites, including six new hydration
  readiness/SSR regressions; prior isolation/security evidence remains retained.
- Both workspace lint/typecheck/build gates and all10 storefront bundle budgets.
- Full64-migration stack:44 PostgreSQL transaction/concurrency scenarios;
  session13, commerce13, admin/Storage9, Auth/PostgREST6 and HTTPS media API4 groups.
- Two serial five-group same-build failure/recovery drills. Built-browser logout
  failure feedback/retry and Back-navigation checks; earlier browser draft/save/
  publish/conflict coverage. These do not complete native media selection.
- Local paired session benchmark:60 pairs, cookie median52.646ms, bearer30.409ms,
  paired increase21.669ms (sample p95 increase43.900ms). Independent read-only review
  confirmed all arithmetic. Busy local host; no hosted latency/scale claim.

### Incomplete gates and review limits

The user manually selected both synthetic PNGs in real Chrome over locally trusted
HTTPS. Upload, decoded previews, persistence, publish, storefront rendering at390px
and1440px, stale-editor409 and logout/Back checks were observed. A local proxy
redirect repair was required. The subsequent React418/`$RS` race was reproduced
and locally mitigated by an admin-only Suspense gate waiting for parsing and
queued server reveals. The final uninstrumented production build passed30
desktop/mobile/slow navigation cycles, SSR-node retention and frozen/resumed-page
checks with zero runtime errors; price/cost/quantity and the local product digest
were preserved. See `HYDRATION_RACE_FIX.md` for exact builds, source hashes,
retained failures, the Next/Fizz compatibility limit and pre-JavaScript interaction
qualification. Physical Safari and remote release gates remain unverified.

The recorded local build identifiers are stable, but the benchmark does not prove
their compilation from its recorded source HEAD. Bind final artifacts to reviewed
source and obtain exact final-head GitHub CI after authorized publication. Current
CI's disposable PostgreSQL suite covers migrations28/29; real Auth/session migration30
evidence comes from the separately guarded local full-schema tests.

Vercel inventory reads returned403; old-admin reachability/protection and a distinct
compatible recovery deployment remain unknown. Local same-build recovery is not a
hosted rollback certification. One initial built503 remains undiagnosed despite two
later passing serial drills. Keep production restricted from this draft's actions.

The benchmark runner's new cleanup/provenance correction is syntax-checked and
independently reviewed separately; it has not been rerun since Docker's engine
became unavailable. The original run logged out200. App ports were later free and
private input absent; final container shutdown could not be verified. Fixtures and
volumes are retained.

See `COLLECTION_INTEGRITY_ACCEPTANCE.md`, `SESSION_PERFORMANCE.md`,
`ISOLATED_HTTPS_PROPOSAL.md` and `SESSION_V2_RELEASE_RECOVERY.md` for exact evidence,
hashes, limitations and approval manifests. **Not approved for production.**

## After publication approval

Use the resolved reviewed local SHA, push only this branch and create a **draft**
PR with the base above. Attach the resulting PR to this chat. Inspect both CI jobs
on that exact SHA through completion; record any external preview effects only as
actually authorized/observed. Recheck dependency heads before publishing; stop if
the reviewed stack changed. Do not merge or start a production rollout.
