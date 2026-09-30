# Deprecated duplicate component tree

Production storefront and admin use **`packages/shared`** via `@/*` path aliases in `apps/storefront` and `apps/admin`.

This **`components/`** directory at the monorepo root is a **legacy copy**. Do not edit it for shop fixes unless you mirror the same change in `packages/shared`.

Preferred: delete this tree once no scripts reference `e commerce store/app/` (legacy single-app layout).
