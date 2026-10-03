# Codebase hygiene (living checklist)

Production runs **`apps/storefront`**, **`apps/admin`**, and **`packages/shared`**. Root **`app/`**, **`lib/`**, and **`components/`** are legacy duplicates — see `app/DEPRECATED.md`, `lib/DEPRECATED.md`, `components/DEPRECATED.md`.

## Quality gates (target state)

| Gate | Command | CI |
|------|---------|-----|
| Unit tests | `npm run test` | Yes |
| ESLint (both apps) | `npm run lint:all` | Yes |
| Storefront build | `npm run build:storefront` | Yes |
| Admin build | `npm run build:admin` | Yes |
| Full local CI | `npm run ci` | — |

## Known debt (prioritized)

1. **Remove legacy root trees** — ~570 duplicate files under `app/`, `lib/`, `components/` after confirming no deploy/scripts depend on them (T-40 plan).
2. **`ignoreBuildErrors: true`** on both Next apps — TypeScript errors do not fail builds; tighten incrementally per app.
3. **Root repo clutter** — tracked diagnostics (`lint-output.txt`, `build_error.txt`, STEP reports); prefer deleting or gitignoring.
4. **Untracked one-off scripts** — `scripts/_tmp-*`, `scripts/bnt1042-*` should stay local or move to `scripts/archive/` with README.
5. **Design previews** — `docs/design/preview/` is mock HTML; keep untracked or commit only if team uses them.

## Where to edit

| Change | Path |
|--------|------|
| Shop UI / checkout / PDP | `packages/shared/components/` |
| Shop API routes | `apps/storefront/app/api/` |
| Admin | `apps/admin/app/` |
| Shared business logic | `packages/shared/lib/` |

Never fix production bugs only in root `app/` or `lib/`.

## Agent verification before “done”

```bash
npm run test
npm run lint:all
npm run build
```
