# P0 verification report — PR #34

**Status: NO-GO** (Draft remains Draft)

| Field | Value |
| --- | --- |
| Report updated (UTC) | 2026-10-31 |
| Branch | `redesign/storefront-production-polish` |
| Latest HEAD (docs/script) | see git after push |
| Code under test (prior harden) | `b4d02a6` / later docs commits |
| PR | https://github.com/ecommercestore872-crypto/voltgear/pull/34 (Draft) |
| Vercel storefront project | **voltgear** — `prj_gHAuBl5SMG1FnJ45GeinQN2gNGnB` |
| Admin project | **OUT OF SCOPE** (`voltgear-admin` / `prj_LgVWqru…`) |
| Preview URL | https://voltgear-git-redesign-storefr-bcd7ea-hassaans-projects-e3451522.vercel.app |
| Local bypass env | **`VERCEL_AUTOMATION_BYPASS_SECRET` absent** at last agent check |
| Playwright exit code (last Preview attempt) | `1` |

Release rule: UNTESTED / UNVERIFIED / FAIL / PARTIAL → **NO-GO**.

---

## Gate table

| Check | Result | Evidence | Reason | Next action |
| --- | --- | --- | --- | --- |
| Project identity (storefront) | **PASS** | `apps/storefront/.vercel/project.json` | Linked to `voltgear` / `prj_gHAuBl5…` | Keep using `--cwd apps/storefront` |
| Root Vercel link | **INFO** | `.vercel/project.json` → `voltgear-admin` | Root is admin; do not run unqualified CLI from root | Never `vercel` from root for storefront |
| Preview SSO / access | **FAIL** | `preview-sso-block-390.png`, `preview-access-evidence.json` | Deployment Protection → Vercel login; bypass secret not in agent env | Create Protection Bypass on **voltgear only**; set local `VERCEL_AUTOMATION_BYPASS_SECRET` (never commit) |
| Playwright runner harden | **PASS** (code) | `scripts/playwright-mocked-cod-checkout.mjs` | Origin-scoped bypass headers; fail-closed POST/confirmation math; 409/429/500 mocks | Re-run once secret present |
| Preview mocked COD journey | **FAIL / blocked** | `mocked-cod-checkout-report.json` | Cannot reach storefront without bypass | Re-run Preview with secret |
| Invalid POST count = 0 | **UNTESTED** on Preview | — | Blocked by access | Re-run |
| Valid POST count = 1 | **UNTESTED** on Preview | — | Blocked by access | Re-run |
| Duplicate POST = 0 | **UNTESTED** on Preview | — | Blocked by access | Re-run |
| Province + city in payload | **UNTESTED** on Preview | — | Blocked by access | Re-run |
| Confirmation visible | **UNTESTED** on Preview | — | Blocked by access | Re-run |
| 409 / 429 / 500 UI (390px) | **UNTESTED** on Preview | Script ready | Blocked by access | Re-run |
| Preview courier safety | **PARTIAL code / UNVERIFIED live env** | `courier-booking-mode.ts` | Code defaults non-production → `mock`; live Preview env vars not inspected (no secret dump) | Read-only Dashboard check: `COURIER_BOOKING_MODE` / `POSTEX_BOOKING_MODE` on Preview |
| Playwright cannot create real order | **PASS** (design) | script intercepts `**/api/checkout**` | Fulfill mock only | Keep intercept |
| TikTok Purchase dedup | **UNTESTED** | — | Needs consented Preview + Events Manager | After access; no live Purchase without approval |
| CMS claims | **PARTIAL** | `CMS-CLAIM-SCRUB.md` | Code scrub done; admin CMS sign-off pending | Manual Preview copy pass |

---

## Playwright runner changes (this cycle)

`scripts/playwright-mocked-cod-checkout.mjs` now:

1. Reads bypass **only** from `process.env.VERCEL_AUTOMATION_BYPASS_SECRET`.
2. Injects `x-vercel-protection-bypass` + `x-vercel-set-bypass-cookie: true` **only** when `request.url` origin === approved Preview origin (route-based; not context-wide extra headers).
3. Blocks service workers in the verification context.
4. Fails immediately on Vercel SSO/login or wrong origin.
5. Requires invalid → 0 POSTs; success → exactly 1 success POST; confirmationVisible; province+city; COD; idempotency; double-submit → no second success POST.
6. Mocks 409 / 429 / 500 before success and asserts recovery UI + field retention.
7. Never writes the secret into the JSON report.

---

## Preview environment safety (separate from mocked checkout)

| Variable / control | Target | Assessment |
| --- | --- | --- |
| `COURIER_BOOKING_MODE` / `POSTEX_BOOKING_MODE` | Preview | **UNVERIFIED** live value; code default when unset + `VERCEL_ENV!==production` → `mock` |
| `courierBookingAllowed()` | Runtime | **PASS** (code): false unless mode `live` |
| Playwright `/api/checkout` intercept | Test runner | **PASS**: no real order creation during this script |
| Production customer mutation by opening Preview | — | **UNVERIFIED** without live DB probe (not attempted) |
| `TIKTOK_TEST_EVENT_CODE` / pixel enabled | Preview | **UNVERIFIED** live; server skips Purchase unless consent=`all` + enabled |
| Secret values | — | **Not printed** |

---

## Command to run after secret is set (local shell only)

```powershell
# Set VERCEL_AUTOMATION_BYPASS_SECRET in this session (do not echo / commit).
# Prefer SecureString paste (see prior brief).

node .\scripts\playwright-mocked-cod-checkout.mjs `
  "https://voltgear-git-redesign-storefr-bcd7ea-hassaans-projects-e3451522.vercel.app"
$LASTEXITCODE
```

Expected GO facts:

```text
ssoDetected: false
invalidCheckoutPosts: 0
validCheckoutPosts: 1
duplicateCheckoutPosts: 0
provincePresent: true
cityPresent: true
confirmationVisible: true
results409/429/500: PASS
exitCode: 0
```

Anything else → remain **NO-GO**.

---

## Manual Dashboard steps (voltgear only)

If the bypass secret does not exist yet:

1. Vercel → Project **voltgear** (`prj_gHAuBl5SMG1FnJ45GeinQN2gNGnB`) → Settings → Deployment Protection.
2. Keep Deployment Protection **enabled**.
3. Protection Bypass for Automation → Create (note e.g. `PR34 Playwright`).
4. Copy secret into local session env only — never into git/PR/screenshots.
5. Do **not** change `voltgear-admin`, `buyntryy.com`, or production env.

---

## Final release rule

**GO** only when every P0 row is **PASS** with direct evidence.  
Do not merge PR #34. Do not deploy production. Do not start paid TikTok traffic.
