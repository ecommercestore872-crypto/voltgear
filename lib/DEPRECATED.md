# Deprecated legacy `lib/` tree

Do **not** edit files here for production fixes.

**Canonical code:** `packages/shared/lib/`

Production builds use `apps/storefront` and `apps/admin`, which resolve `@/*` to `packages/shared`. This root `lib/` directory is a legacy duplicate of an older single-app layout (207 files overlap shared).

See `app/DEPRECATED.md` and `components/DEPRECATED.md`.
