# Deprecated legacy Next.js app

Production deployments use the monorepo workspaces:

- **Shop:** `apps/storefront` → Vercel project **voltgear**
- **Admin:** `apps/admin` → Vercel project **voltgear-admin**

This root **`app/`** tree is an old single-app layout. **Do not deploy from here.** Edit **`packages/shared`** and **`apps/storefront`** / **`apps/admin`** instead.

See also **`components/DEPRECATED.md`**.
