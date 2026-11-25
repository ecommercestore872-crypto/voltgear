# Parked work: orders redesign, WhatsApp auto-confirm, web push

Built and tested but NOT merged to main. Full code is in commit `5b2f122` on branch
`claude/focused-pascal-ux52jx` (history is kept; the release commit on top only trims the merge).
To restore: `git checkout 5b2f122 -- .` on a new branch, or cherry-pick the commits
`21c722f` and `5b2f122`.

## What is parked
- Orders list redesign: date range filter (7d/30d/3m/all, default 30d), "Open" tab that hides delivered
  and cancelled, "Needs reply" tab, one-tap Confirm, relabelled status badges.
- WhatsApp auto-confirm: shop calls admin `/api/internal/orders/created/:id` (CRON_SECRET), admin sends a
  WhatsApp template, webhook `/api/webhooks/whatsapp` classifies the reply
  (`packages/shared/lib/whatsapp-confirm-rules.ts`): confirm books PostEx, decline cancels, anything else
  flags the owner. Also extracts `bookOrderOnPostEx` into `postex-book-order-run.ts`.
- Web push for a locked phone: `admin-push.ts`, `/api/admin/push/*`, `public/admin/sw.js`, needs `web-push`.

## Already live in Supabase (project Final-store)
- `admin_delete_any_order` (shipped on main).
- `push_and_whatsapp_confirm`: tables `admin_push_subscriptions`, `admin_vapid_keys`, `whatsapp_messages`,
  and `orders.wa_*` columns. The migration file is in the repo; nothing else needs applying.

## Needed before WhatsApp can go live
Env on the admin Vercel project: `WHATSAPP_PHONE_ID`, `WHATSAPP_TOKEN`, `WHATSAPP_VERIFY_TOKEN`,
`WHATSAPP_APP_SECRET`, `WHATSAPP_CONFIRM_TEMPLATE` (approved Meta template, body vars name, order id, total).
Meta webhook URL: `https://buyntryy.com/api/webhooks/whatsapp`. Shop project needs `CRON_SECRET` and
`ADMIN_PROXY_UPSTREAM`. Turn on "Require WhatsApp Confirmation for COD Orders" in Admin Settings.
