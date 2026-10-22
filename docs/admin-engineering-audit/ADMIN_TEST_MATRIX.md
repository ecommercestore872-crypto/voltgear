# Verification matrix

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
| Whole monorepo | Final `npm run ci` exit 0: 801/801 tests, both lint/typechecks and both production builds | Local no-production-env evidence, not deployed integration |
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

`npm run ci` completed with exit 0 on the final source state: 801/801 tests, both
lint runs, both TypeScript checks, and both production builds passed. This includes
the final delayed-search-response correction and client-safe email marker. No fixture
route was included in the build. `git diff --check` passed. Earlier intermediate
full gates are not substituted for this final result.
