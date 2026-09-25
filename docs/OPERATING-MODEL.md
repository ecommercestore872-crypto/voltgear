# Operating model — Buy N Try / Voltgear

How we build, deploy, and ship. **Shop production:** Vercel project **`voltgear`**, domain **`https://buyntryy.com`**, repo **`ecommercestore872-crypto/voltgear`**, app path **`apps/storefront`**.

## Work types

| Type | Flow |
|------|------|
| Hotfix | Minimal fix → test → push `main` → prod **voltgear** → smoke buyntryy.com |
| Bug | Debug → fix → tests → push → deploy |
| New / updated feature | `T-##` in `dev-priorities.md` → spec in `docs/superpowers/specs/` → plan → tests → slices → ship |
| Config | Vercel dashboard or `.env.example`; never commit secrets |

## Feature pipeline

1. Add or update **T-##** (🟡 In Progress) and **Active task** in `docs/dev-priorities.md`.
2. Write spec → impact (shop vs admin, Supabase, Vercel cost, SEO, tests).
3. Implement with tests; keep shop free of admin-only API routes.
4. Push **`main`**; production build on **voltgear** (Git or `vercel deploy --prod` from repo root, scope **hassaans-projects-e3451522**).
5. Smoke: `/`, one PDP, checkout path, `/track`, `/sitemap.xml`.
6. Release note in `docs/modules/<module>/RELEASE_NOTES.md`; mark **T-##** ✅ when done.

## Deployment (shop only)

- **Pre:** `main` matches intent; env on **voltgear** includes `NEXT_PUBLIC_SITE_URL=https://buyntryy.com`.
- **Post:** Check Vercel Usage (CPU, Edge, Image, transfer); enable usage alerts in dashboard.
- **Do not** deploy or edit other Vercel projects unless explicitly requested.

## Definition of done

- Tracked in `dev-priorities.md`
- Tests / build green (Vercel build counts if local `node_modules` broken)
- **buyntryy.com** smoke pass
- User-facing changes noted in module release notes

## Priority tiers

0. **T-41** — Vercel usage & lean shop (ongoing)  
1. **T-40** — shop/admin split verified (redirects, revalidate)  
2. **T-39 / T-16 / T-32** — SEO & storefront (after usage stable)  
3. **T-38** and other ops features  

See `docs/modules/deploy/DEPLOY_IMPLEMENTATION.md` for two-project Vercel details.
