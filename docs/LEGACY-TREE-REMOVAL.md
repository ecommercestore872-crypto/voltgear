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

## Status

Legacy root trees were removed after scripts were repointed to `packages/shared/lib/`. If you restore from an old branch, do not merge root `app/` / `lib/` / `components/` back without a deliberate migration plan.
