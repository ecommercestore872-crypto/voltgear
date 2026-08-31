# T-10 Homepage Sections CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admin show/hide and reorder the eight below-hero bands on live `/` via `site_settings.home_sections` JSON and `/admin/home`.

**Architecture:** Pure `normalizeHomeSections` rules drive defaults and validation. Persist the full array on the settings singleton (immediate publish, same spirit as hero slides — not the settings draft flow). `GadgetHomePage` always renders the hero, then enabled sections in saved order. Admin UI is Up/Down + Show toggles.

**Tech Stack:** Next.js 14 App Router, Supabase `site_settings`, existing `adminFetch` / `isAdminRequest`, node:test via `tsx --test`.

**Spec:** `docs/superpowers/specs/2026-09-01-t10-homepage-sections-design.md`

## Global Constraints

- Show/hide + reorder only — no new section types or per-section copy editors
- Hero always fixed at top — not in the layout list
- Section ids (exact): `trust`, `bestsellers`, `featured`, `offers`, `lifestyle`, `categories`, `reviews`, `blog`
- Storage: `site_settings.home_sections` jsonb
- Admin: `/admin/home` labeled **Home layout**; Up/Down buttons (no drag-drop)
- Null/invalid JSON → default order, all enabled
- Empty section data still skips render (e.g. no featured product)

## File map

| File | Responsibility |
|---|---|
| `lib/db/home-section-rules.ts` | Catalog, normalize, enabled ids |
| `lib/db/home-section-rules.test.ts` | Unit tests |
| `supabase/migrations/20260901020000_home_sections.sql` | Add column |
| `lib/types.ts` | `HomeSectionEntry`, `SiteSettings.homeSections` |
| `lib/db/map.ts` | Map `home_sections` → `homeSections` |
| `lib/db/admin-store.ts` | `saveAdminHomeSections` + revalidate |
| `app/api/admin/home-sections/route.ts` | PUT (admin) |
| `app/admin/home/page.tsx` | RSC page |
| `components/admin/home-layout-form.tsx` | Client form |
| `components/admin/admin-shell.tsx` | Nav link |
| `components/gadget/gadget-home-page.tsx` | Render by layout |
| `components/admin/hero-slides-form.tsx` | Rename “Home2 hero slides” → “Hero slides” |
| `package.json` | Register new test file in `npm test` |
| `docs/dev-priorities.md` / orders? / storefront RELEASE_NOTES | Closeout |

---

### Task 1: Home section rules (TDD)

**Files:**
- Create: `lib/db/home-section-rules.ts`
- Create: `lib/db/home-section-rules.test.ts`
- Modify: `package.json` (add test path to `"test"` script)

**Interfaces:**
- Produces:
  - `export type HomeSectionId = "trust" | "bestsellers" | "featured" | "offers" | "lifestyle" | "categories" | "reviews" | "blog"`
  - `export type HomeSectionEntry = { id: HomeSectionId; enabled: boolean }`
  - `export const HOME_SECTION_IDS: readonly HomeSectionId[]`
  - `export const HOME_SECTION_LABELS: Record<HomeSectionId, string>`
  - `export const DEFAULT_HOME_SECTIONS: HomeSectionEntry[]`
  - `normalizeHomeSections(raw: unknown): HomeSectionEntry[]`
  - `enabledHomeSectionIds(sections: HomeSectionEntry[]): HomeSectionId[]`

- [ ] **Step 1: Write failing tests** in `lib/db/home-section-rules.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_HOME_SECTIONS,
  HOME_SECTION_IDS,
  enabledHomeSectionIds,
  normalizeHomeSections,
} from "./home-section-rules";

describe("normalizeHomeSections", () => {
  it("returns defaults for null/invalid", () => {
    assert.deepEqual(normalizeHomeSections(null), DEFAULT_HOME_SECTIONS);
    assert.deepEqual(normalizeHomeSections({}), DEFAULT_HOME_SECTIONS);
  });

  it("preserves order and enabled flags for known ids", () => {
    const raw = [
      { id: "blog", enabled: false },
      { id: "trust", enabled: true },
    ];
    const out = normalizeHomeSections(raw);
    assert.equal(out[0].id, "blog");
    assert.equal(out[0].enabled, false);
    assert.equal(out[1].id, "trust");
    assert.ok(out.some((s) => s.id === "bestsellers" && s.enabled === true));
    assert.equal(out.length, HOME_SECTION_IDS.length);
  });

  it("drops unknown ids and collapses duplicates (first wins)", () => {
    const out = normalizeHomeSections([
      { id: "trust", enabled: false },
      { id: "nope", enabled: true },
      { id: "trust", enabled: true },
    ]);
    assert.equal(out.filter((s) => s.id === "trust").length, 1);
    assert.equal(out.find((s) => s.id === "trust")?.enabled, false);
    assert.equal(out.some((s) => (s.id as string) === "nope"), false);
  });
});

describe("enabledHomeSectionIds", () => {
  it("returns only enabled ids in order", () => {
    const sections = normalizeHomeSections([
      { id: "reviews", enabled: true },
      { id: "blog", enabled: false },
      { id: "trust", enabled: true },
    ]);
    const ids = enabledHomeSectionIds(sections);
    assert.equal(ids[0], "reviews");
    assert.ok(!ids.includes("blog"));
    assert.ok(ids.includes("trust"));
  });
});
```

- [ ] **Step 2: Run** `npx tsx --test lib/db/home-section-rules.test.ts` — expect FAIL (module missing).

- [ ] **Step 3: Implement** `lib/db/home-section-rules.ts`:

```ts
export const HOME_SECTION_IDS = [
  "trust",
  "bestsellers",
  "featured",
  "offers",
  "lifestyle",
  "categories",
  "reviews",
  "blog",
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export type HomeSectionEntry = { id: HomeSectionId; enabled: boolean };

export const HOME_SECTION_LABELS: Record<HomeSectionId, string> = {
  trust: "Trust strip",
  bestsellers: "Best Sellers",
  featured: "Featured product",
  offers: "Best Offers",
  lifestyle: "Lifestyle shop",
  categories: "Shop categories",
  reviews: "Reviews",
  blog: "Blog",
};

export const DEFAULT_HOME_SECTIONS: HomeSectionEntry[] = HOME_SECTION_IDS.map(
  (id) => ({ id, enabled: true })
);

const ID_SET = new Set<string>(HOME_SECTION_IDS);

export function normalizeHomeSections(raw: unknown): HomeSectionEntry[] {
  if (!Array.isArray(raw)) return DEFAULT_HOME_SECTIONS.map((s) => ({ ...s }));

  const seen = new Set<HomeSectionId>();
  const out: HomeSectionEntry[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const id = (item as { id?: unknown }).id;
    if (typeof id !== "string" || !ID_SET.has(id)) continue;
    const sid = id as HomeSectionId;
    if (seen.has(sid)) continue;
    seen.add(sid);
    out.push({
      id: sid,
      enabled: (item as { enabled?: unknown }).enabled !== false,
    });
  }

  for (const id of HOME_SECTION_IDS) {
    if (!seen.has(id)) out.push({ id, enabled: true });
  }
  return out;
}

export function enabledHomeSectionIds(
  sections: HomeSectionEntry[]
): HomeSectionId[] {
  return sections.filter((s) => s.enabled).map((s) => s.id);
}
```

- [ ] **Step 4: Run tests** — expect PASS. Add `lib/db/home-section-rules.test.ts` to `package.json` `"test"` script list.

- [ ] **Step 5: Commit** `feat: add home section layout rules for T-10`

---

### Task 2: Migration + persist + map

**Files:**
- Create: `supabase/migrations/20260901020000_home_sections.sql`
- Modify: `lib/types.ts` (`SiteSettings.homeSections?: HomeSectionEntry[]` — import type from rules or duplicate thin type; prefer importing `HomeSectionEntry` from rules in map/admin, and add optional field on SiteSettings)
- Modify: `lib/db/map.ts` — map `home_sections` via `normalizeHomeSections`
- Modify: `lib/db/admin-store.ts` — `saveAdminHomeSections(sections)`

**Interfaces:**
- Consumes: `normalizeHomeSections`, `HomeSectionEntry`
- Produces: `saveAdminHomeSections(sections: HomeSectionEntry[]): Promise<{ok}|{ok:false,error,status}>`

- [ ] **Step 1: Migration SQL**

```sql
alter table public.site_settings
  add column if not exists home_sections jsonb;
```

- [ ] **Step 2: Extend `mapSettings`**

```ts
import { normalizeHomeSections } from "@/lib/db/home-section-rules";
// in return:
homeSections: normalizeHomeSections(row.home_sections),
```

Also add `homeSections?:` to `SiteSettings` in `lib/types.ts` (type from rules re-export or inline `{ id: string; enabled: boolean }[]`).

- [ ] **Step 3: `saveAdminHomeSections` in admin-store**

```ts
export async function saveAdminHomeSections(sections: HomeSectionEntry[]) {
  const normalized = normalizeHomeSections(sections);
  const { error } = await db()
    .from("site_settings")
    .update({ home_sections: normalized })
    .eq("id", 1);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  revalidatePath("/");
  revalidatePath("/admin/home");
  return { ok: true as const, sections: normalized };
}
```

Do **not** clear settings `draft` or go through `publishAdminSettings` — layout publishes immediately.

- [ ] **Step 4: Apply migration** to the linked Supabase project (same method used for `hero_slides` — `supabase db push` or SQL editor). If push fails, document in report and still ship code.

- [ ] **Step 5: Commit** `feat: persist home_sections on site_settings for T-10`

---

### Task 3: Admin API + Home layout UI

**Files:**
- Create: `app/api/admin/home-sections/route.ts`
- Create: `app/admin/home/page.tsx`
- Create: `components/admin/home-layout-form.tsx`
- Modify: `components/admin/admin-shell.tsx` — add nav after Hero: `{ href: "/admin/home", label: "Home layout" }`
- Modify: `components/admin/hero-slides-form.tsx` — heading “Hero slides”

**Interfaces:**
- PUT body `{ sections: unknown }` → normalize → `saveAdminHomeSections`
- Page loads `getAdminSettings()` → `normalizeHomeSections(row.home_sections)`

- [ ] **Step 1: API route** (mirror other admin PUT patterns — `isAdminRequest`):

```ts
export async function PUT(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const sections = normalizeHomeSections(body?.sections);
  const result = await saveAdminHomeSections(sections);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, sections: result.sections });
}
```

- [ ] **Step 2: `HomeLayoutForm` client component**

Props: `{ initialSections: HomeSectionEntry[] }`

State: local copy of sections; dirty flag optional.

UI per row: `HOME_SECTION_LABELS[id]`, checkbox/switch for `enabled`, Up/Down buttons.

Save: `adminFetch("/api/admin/home-sections", { method: "PUT", body: JSON.stringify({ sections }) })`.

Match styling of other admin forms (bordered card, Save button).

- [ ] **Step 3: Page**

```tsx
// app/admin/home/page.tsx
export const dynamic = "force-dynamic";
export default async function AdminHomeLayoutPage() {
  const row = await getAdminSettings();
  const sections = normalizeHomeSections(row?.home_sections);
  return <HomeLayoutForm initialSections={sections} />;
}
```

- [ ] **Step 4: Nav + hero title fix**

- [ ] **Step 5: Commit** `feat: add Home layout admin UI for T-10`

---

### Task 4: Wire live `GadgetHomePage`

**Files:**
- Modify: `components/gadget/gadget-home-page.tsx`

**Interfaces:**
- Consumes: `normalizeHomeSections`, `enabledHomeSectionIds` from settings already fetched

- [ ] **Step 1: After `normalizeSettings(settings)`, also:**

```ts
const layout = enabledHomeSectionIds(
  normalizeHomeSections(settings?.homeSections ?? null)
);
```

Note: `fetchSiteSettings` must return `homeSections` via `mapSettings`. If settings is null, `normalizeHomeSections(null)`.

- [ ] **Step 2: Keep hero first. Replace the fixed JSX bands with a map:**

```tsx
<>
  <GadgetHeroSlider ... />
  {layout.map((id, i) => {
    const delay = 40 + i * 20;
    switch (id) {
      case "trust":
        return trust.length ? (
          <GadgetReveal key={id} delayMs={delay}>
            <GadgetTrustStrip items={...} />
          </GadgetReveal>
        ) : null;
      case "bestsellers":
        return (
          <GadgetReveal key={id} delayMs={delay}>
            <GadgetNewArrivals products={railProducts} title="Best Sellers" ... />
          </GadgetReveal>
        );
      case "featured":
        return featuredProduct ? (
          <GadgetReveal key={id} delayMs={delay}>
            <GadgetFeaturedProduct product={featuredProduct} />
          </GadgetReveal>
        ) : null;
      // offers, lifestyle, categories, reviews, blog — same as today
      default:
        return null;
    }
  })}
</>
```

Preserve existing props/data for each band exactly.

- [ ] **Step 3: Manual sanity** — `npm run dev`, `/` still looks correct with defaults.

- [ ] **Step 4: Commit** `feat: render live home from home_sections layout`

---

### Task 5: Closeout

**Files:**
- `docs/modules/storefront/RELEASE_NOTES.md` (prepend T-10 note)
- `docs/dev-priorities.md` — T-10 ✅ Done; Active task → T-12
- Optionally one paragraph in `docs/modules/storefront/STOREFRONT_IMPLEMENTATION.md`

- [ ] **Step 1: Docs + tracker**

- [ ] **Step 2: `npm test` + `npx tsc --noEmit`** — all green

- [ ] **Step 3: Commit** `docs: close out T-10 homepage sections`

---

## Spec coverage

| Requirement | Task |
|---|---|
| normalize / defaults / ids | 1 |
| jsonb column + map + save | 2 |
| `/admin/home` + API + nav | 3 |
| Live home order/visibility | 4 |
| Tracker / release note | 5 |

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-01-t10-homepage-sections.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task  
2. **Inline Execution** — implement in this session  

Which approach?
