# Weekly Purchase vs admin orders (step 7)

Goal: confirm **placed orders** in admin/Supabase roughly match **Purchase** events in TikTok and Meta for the same **Asia/Karachi** window. Large gaps mean broken pixels, consent, or duplicate firing.

## Every Monday (≈10 min)

1. **Admin API** (logged in or `Authorization: Bearer $ADMIN_TOKEN`):
   ```
   GET /api/admin/analytics/purchase-sanity?preset=last7&tiktok=PASTE&meta=PASTE
   ```
   Example:
   `https://voltgear-admin.vercel.app/api/admin/analytics/purchase-sanity?preset=last7&tiktok=12&meta=10`

2. **Or CLI** (repo root, Supabase keys in env):
   ```bash
   npm run sanity:purchases -- --tiktok=12 --meta=10
   ```

3. **Read `overallStatus`**: `ok` | `watch` | `warning` | `critical` (see thresholds in `purchase-sanity-rules.ts`).

4. **Attribution block**: `withTtclid` / `withFbclid` / `withSession` — are clicks attaching to orders?

5. **Vercel (voltgear)**: filter logs `[purchase-track]` — count `outcome:sent` for TikTok/Meta server CAPI vs placed orders (browser + server).

## Where to get Purchase counts

| Channel | Where |
|---------|--------|
| TikTok | Events Manager → Pixel → **Purchase**, same dates as `preset` |
| Meta | Events Manager → **Purchase** (website), same dates |

Currency should stay **PKR**; values should match order totals on spot-check.

## Related

- `docs/INFRASTRUCTURE-HEALTH-CHECKLIST.md` §5 and daily metric #10
- `packages/shared/lib/purchase-sanity-rules.test.ts` — ratio rules
