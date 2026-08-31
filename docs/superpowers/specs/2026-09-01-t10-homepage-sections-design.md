# Spec: T-10 — Homepage sections CRUD (show/hide + reorder)

## Objective

Let staff control which **below-hero** sections appear on the live Biometic home (`/`) and in what order — without code deploys or inventing new block types.

**User:** store owner in `/admin`.

**Why now:** Live `/` is Biometic; Hero slides are already admin-managed. Other home bands are hardcoded. Owner needs layout control before broader admin UX polish (T-12) and analytics finish (T-15).

**Success:** Admin → **Home layout** shows the 8 sections with Show toggles and Up/Down. Save updates `site_settings.home_sections`. Live `/` reflects order/visibility after save (revalidate). Missing/invalid JSON falls back to today’s default home.

## Locked decisions

| Topic | Decision |
|---|---|
| Scope | Show/hide + reorder only — no new section types, no per-section copy/image editor |
| Hero | Always fixed at top; not in the layout list (slides stay Admin → Hero) |
| Storage | JSON array on `site_settings` (`home_sections jsonb`) |
| Admin home | New nav **Home layout** → `/admin/home` |
| Reorder UX | Up/Down buttons (no drag-drop in v1) |
| Defaults | All 8 enabled in current code order when column null/empty |
| Empty data | Still skip rendering when a section has no content (e.g. no featured product) |
| Out of scope | T-11 themes; editing trust copy; CMS for blog/testimonial content (existing screens) |

## Section catalog (fixed keys)

Default order (matches current `GadgetHomePage`):

| id | Admin label | Component |
|---|---|---|
| `trust` | Trust strip | `GadgetTrustStrip` |
| `bestsellers` | Best Sellers | `GadgetNewArrivals` (bestsellers rail) |
| `featured` | Featured product | `GadgetFeaturedProduct` |
| `offers` | Best Offers | `GadgetNewArrivals` (offers) |
| `lifestyle` | Lifestyle shop | `GadgetLifestyleShop` |
| `categories` | Shop categories | `GadgetShopCategories` |
| `reviews` | Reviews | `GadgetReviewsSlider` |
| `blog` | Blog | `GadgetBlogSection` |

Payload item: `{ "id": "<key>", "enabled": boolean }`. Array order = render order among enabled sections.

## Rules (pure helpers)

File: `lib/db/home-section-rules.ts` (unit-tested).

```ts
HOME_SECTION_IDS = [...] // fixed tuple above
DEFAULT_HOME_SECTIONS = HOME_SECTION_IDS.map(id => ({ id, enabled: true }))

normalizeHomeSections(raw: unknown): HomeSectionEntry[]
  - Drop unknown ids; first occurrence wins if duplicates
  - Append any missing known ids (enabled: true) in default relative order at end
  - If raw not an array → DEFAULT_HOME_SECTIONS

enabledHomeSectionIds(sections): string[]
  - Map enabled entries to ids in order
```

## Data model

Migration: `alter table public.site_settings add column if not exists home_sections jsonb;`

Map through existing settings fetch/save paths (`lib/db/map.ts`, `admin-store`, public `fetchSiteSettings`) so home can read the same singleton.

Optional on `SiteSettings` type: `homeSections?: HomeSectionEntry[]`.

## Architecture

```
Admin /admin/home
  → GET layout from getAdminSettings / dedicated get
  → PUT /api/admin/home-sections  { sections: HomeSectionEntry[] }
  → update site_settings.home_sections; revalidatePath("/")

Live GadgetHomePage
  → fetchSiteSettings → normalizeHomeSections
  → render GadgetHeroSlider always
  → for id of enabledHomeSectionIds: render matching band (existing data fetches unchanged)
```

## Admin UI

- Page title: **Home layout**
- Short help: “Hero stays on top. Toggle and reorder the sections below.”
- List rows: label, Show switch, Move up, Move down (disabled at ends)
- **Save** primary; show success/error toast or inline message like other admin forms
- Rename Hero page heading from “Home2 hero slides” → **Hero slides** (small copy fix in same task if cheap)

Nav: insert `{ href: "/admin/home", label: "Home layout" }` near Hero in `admin-shell.tsx`.

## API

`PUT /api/admin/home-sections`

- Admin auth (same as other admin routes)
- Body: `{ sections: unknown }` → `normalizeHomeSections` then persist
- Reject if after normalize the set of ids ≠ full catalog (should not happen if normalize is complete — normalize always returns full set)
- `revalidatePath("/")` (and `/home2` if still referenced)
- Response: `{ ok: true, sections }`

`GET` can be page-server-only (no separate GET required if the RSC page loads settings). Optional GET for the form refresh — page load is enough.

## Impact analysis

| Area | Verdict |
|---|---|
| Data model | One nullable jsonb column; no backfill required |
| Live home | `gadget-home-page.tsx` reads order/flags; hero unchanged |
| Settings form | Do not expose raw JSON on Settings UI — dedicated Home layout page only |
| Hero / testimonials / products | Unchanged content sources |
| Demo mode | Same layout JSON for demo/live (no separate demo layout) unless settings already demo-split — follow existing settings singleton |
| Analytics / Clarity | No change |
| T-12 | Can later polish Home layout + other admin pages |
| Spawned tasks | None |

## Testing

- Unit: normalize — null → defaults; unknown id dropped; missing id appended; duplicate collapsed; disabled preserved; order preserved
- Manual: disable blog → `/` hides blog; move reviews above categories → order changes; Save → hard refresh `/`

## Acceptance

- [ ] `/admin/home` lists 8 sections with show + up/down + save
- [ ] Live `/` respects enabled order; hero always first
- [ ] Null `home_sections` = current default home
- [ ] Migration applied locally + documented for prod
- [ ] Unit tests green; admin unauthorized PUT → 401

## Out of scope

- Drag-and-drop
- Per-section titles/images
- Adding custom section types
- Mobile-specific layout
