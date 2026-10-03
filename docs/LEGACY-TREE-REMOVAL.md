# Legacy tree removal (required for acquirer-grade repo)

Production uses **`apps/storefront`**, **`apps/admin`**, **`packages/shared`** only.

The root **`app/`**, **`lib/`**, **`components/`**, and **`middleware.ts`** are deprecated duplicates (~570 files). They confuse engineers and lower technical diligence scores.

## Safe removal (one-time, after backup)

From repo root, with CI green:

```bash
npm run ci
git rm -r app lib components middleware.ts
git commit -m "Remove deprecated legacy monolith trees."
git push origin main
```

Vercel is **not** configured to deploy from root `app/` — shop is **`apps/storefront`**.

## Until removed

- Do **not** edit legacy files for shop fixes.
- Run dev with `npm run dev` (storefront workspace only).
