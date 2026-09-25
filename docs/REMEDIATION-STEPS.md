# Remediation steps — fix one by one

Shop only: **voltgear** / **buyntryy.com**. Check off in order; do not skip **Step 0** (alerts).

| Step | Topic | Status |
|------|--------|--------|
| **0** | Vercel **usage/spend alerts** on project **voltgear** (50/75/100%) | ⬜ You (dashboard) |
| **1** | Cache low-cost routes (`llms.txt`, `ads.txt`, TikTok CSV, `/api/settings`) | ✅ Code done — deploy **voltgear** |
| **2** | Supabase: connections, slow queries, **analytics retention** size check | ✅ Code + migration — run `npx supabase db push` on live DB |
| **3** | Images: PLP/PDP `sizes`, Cloudinary widths, hero weight (T-41 phase 3) | ✅ Deploy **voltgear** — watch Image Transformations drop |
| **4** | Checkout SLO: p95, 5xx logging, idempotency test in CI | ✅ Deploy **voltgear** — filter logs `[checkout-slo]` |
| **5** | T-40: admin redirect + publish → shop revalidate E2E | ✅ Run `npm run smoke:t40` after deploy |
| **6** | Email: Resend bounce/complaint; order never fails on email error | ✅ Wire webhook on admin + `supabase db push` |
| **7** | Ads/analytics: Purchase vs admin orders weekly sanity | ✅ `npm run sanity:purchases` — see analytics doc |
| **8** | Security audit: RLS, public env, rate limits | ⬜ |
| **9** | DR: backup restore drill + monthly export | ⬜ |

Metrics guide: `docs/INFRASTRUCTURE-HEALTH-CHECKLIST.md`.
