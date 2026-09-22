# Admin readiness (2026-09-22)

## Shipped in code

- Auth: login, forgot/reset password, middleware, public admin paths, adminFetch 401 to login
- Performance: lite product lists, paginated catalog, server search, analytics lazy tabs + session cache
- UX: unsaved guards + sticky bars on CMS forms, collections search-first picker, autopilot explicit save
- Messaging: broadcast uses shared adminFetch + session redirect

## Production checklist (manual)

- Supabase Auth redirect URL includes https://buyntryy.com/admin/reset-password
- Sign in, Cmd+K, products pagination and search
- PostEx book (POSTEX_API_TOKEN on Vercel)
