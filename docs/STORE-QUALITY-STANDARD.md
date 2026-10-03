# Store quality standard (operator & acquirer view)

Living bar for **Buy n Try / VoltGear** — written so a **senior US buyer or technical operator** can see a serious, maintainable ecommerce business, not a demo theme.

## 1. Product & market clarity

- [ ] Value prop obvious on mobile home + PDP: **authentic gear, COD, nationwide delivery**
- [ ] Pricing in **PKR**, taxes/delivery expectations stated at checkout
- [ ] Policies linked: shipping/returns, privacy, terms — real pages, not placeholders
- [ ] Contact/support path visible (WhatsApp/phone when configured)

## 2. Mobile funnel (iOS + Android) — revenue critical

Test on **iPhone Safari** and **Android Chrome** (in-app browsers if ads drive traffic):

| Step | Must work |
|------|-----------|
| Browse / search | Fast shell, no horizontal scroll trap |
| PDP | Gallery, variant selection, **Order with COD**, trust copy |
| Cart | Edit qty, clear totals, proceed to checkout |
| Checkout | 3-field COD form, **full order box** (items, delivery, discounts, total), place order |
| Success | Confirmation, bill, track link, invoice |
| Track | Order # + phone, status refresh when PostEx configured |

**UX bar:** 44px touch targets, 16px inputs, safe-area on fixed bars, solid backgrounds on sticky UI, reduced-motion respected.

## 3. Trust & compliance (US reviewer lens)

- [ ] HTTPS, security headers (storefront `next.config` headers)
- [ ] No secrets in git; env documented in `.env.example`
- [ ] PII handled in admin/auth patterns; order lookup gated (email/phone)
- [ ] Marketing pixels/loaders deferred where possible (performance + privacy posture)

## 4. Engineering credibility

- [ ] Monorepo: **`apps/storefront`**, **`apps/admin`**, **`packages/shared`**
- [ ] CI: tests + lint + both builds (`.github/workflows/storefront-ci.yml`)
- [ ] **631+** unit tests on shared lib; extend when changing business rules
- [ ] Legacy root app trees marked deprecated — plan removal (T-40)
- [ ] Roadmap to disable `ignoreBuildErrors` on production builds

## 5. Operations

- [ ] Admin on separate deploy; PostEx/cron/email documented in `docs/modules/`
- [ ] Checkout idempotency / stock rules — no duplicate orders under retry
- [ ] DR/backup notes where applicable (`backups/README.md`)

## 6. Visual & brand (premium / “royal” without clutter)

- [ ] Consistent **gadget** tokens (`--g-forest`, `--g-gold`, cream surfaces)
- [ ] Premium surfaces on checkout + order success (`.premium-royal-*` in `globals.css`)
- [ ] Serif display (`gadget-display`) for hero moments; body stays readable
- [ ] No broken layouts at 320px–430px width

## Agent checklist (quick)

```bash
npm run ci
```

Then mobile-spot-check: **checkout** and **order success** after any funnel change.

## Honest status (update as debt burns down)

| Area | Status |
|------|--------|
| Production deploy path | Storefront + admin split ✅ |
| CI lint + test + build | ✅ |
| Legacy duplicate trees | Removed from git (production uses monorepo apps only) ✅ |
| TypeScript strict builds | Storefront + admin: `ignoreBuildErrors: false` ✅ |
| Cross-platform mobile UX | Cart + checkout + order premium mobile; iOS + Android rules ✅ |
| Funnel polish | Cart sticky COD bar, checkout order box, order success premium ✅ |
| Inline checkout / track validation | Blur + submit validation; city datalist expanded ✅ |
| Funnel trust strip | COD / delivery / support on cart + checkout ✅ |
| Production smoke | `npm run smoke:t40` (funnel GETs + admin routing) ✅ |
| Real-device funnel QA | Optional — `docs/FUNNEL-QA-CHECKLIST.md` (skipped if you rely on smoke + spot checks) |
