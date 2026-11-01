# Buy n Try — Design DNA

**Direction:** Pakistani modern electronics shop meets editorial product lab.

**Personality:** confident · practical · youthful · product-obsessed · trustworthy · slightly technical · contemporary · human · distinctive

**Not:** luxury-fashion clone · neon gamer · generic Shopify · SaaS landing · purple-gradient AI site · endless bento · glassmorphism · floating pills · fake scarcity · fake testimonials

Preserve existing Biometic brand signals (forest, cream, Manrope + Newsreader) while editing toward product-led clarity. Do not rebuild tokens from scratch.

---

## Principles (from research, not clones)

| Source lens | Principle we keep |
|-------------|-------------------|
| Nothing | Product name is the headline; labels stay small and utility-like |
| Teenage Engineering | Alternate dense catalog rows with quiet product focus; hairline structure beats card stacks |
| Peak Design | Photography + typography do the work; one accent, restrained radius, almost no shadow |
| Bellroy | Calm commerce copy; measurable facts over adjectives |

Do not copy layouts, typefaces, or component kits from those brands.

---

## Typography

| Role | Family | Scale | Notes |
|------|--------|-------|-------|
| Display / section | Newsreader Variable (`--font-heading`) | 1.75–2.75rem | Editorial section titles only |
| UI / body / product | Manrope Variable (`--font-sans`) | 14–16px body | Product titles 14–16px, weight 600–700 |
| Price | Manrope tabular | 1.05–1.35rem | Bold sale price; struck compare at 11–12px |
| Labels / meta | Manrope | 11–12px | Uppercase tracking sparingly; never pill clusters |

Heading scale: `h1` page ≈ 1.75–2.25rem mobile / 2.5–3rem desktop · `h2` section ≈ 1.5–2rem · `h3` card ≈ 0.875–0.95rem.

Body: 14–15px mobile, 15–16px desktop, line-height 1.5–1.6.

---

## Spacing & width

- Section vertical rhythm: `py-8` → `py-12` → `py-16` (do not use identical padding on every band).
- Gutters: `px-4` mobile · `sm:px-6` · `lg:px-8`.
- Content max: `max-w-6xl` commerce · hero may go full-bleed.
- Product grid gap: `gap-3` mobile · `gap-5` desktop.

---

## Surfaces, borders, radius, shadow

| Token | Rule |
|-------|------|
| Page | Warm cream (`--g-cream`) with **one** quiet atmospheric wash max — no stacked gold/sage ellipses competing |
| Cards | Prefer **no** enclosing card; image stage + type on open ground |
| Borders | Hairline `--g-line` only when needed for forms, drawers, checkout |
| Radius | Default **8px** (`0.5rem`) for controls · image stages **10–12px** · avoid `rounded-2xl` / `rounded-full` except icon hits and avatars |
| Shadow | Almost none on catalog · soft `0 8px 24px` only on drawers/modals |

---

## Color

Keep Biometic:

- Forest `#0E2419` — primary CTA, nav emphasis
- Cream `#FAF6EE` — page ground
- Charcoal `#1A1A1A` — body
- Sale `#8A3B21` — discount price only
- Gold `#D4AF37` — rare accent (never gradients everywhere)
- Sage / taupe — secondary text and calm bands

Teal shadcn `:root` remains for non-gadget surfaces; `.gadget-theme` remaps commerce UI.

---

## Components

### Buttons
- Primary: solid forest, cream text, 44–48px touch height, radius 8–10px, no glow border
- Secondary: hairline border, cream/sand fill
- Ghost: text + underline on hover

### Product cards
- Square image stage, `object-contain`, quiet studio wash
- Title 2 lines max
- Price hierarchy always clearer than badges
- Badges: at most one (sale % **or** stock) — drop decorative tags when sale shows
- Reviews only when `reviewCount > 0` and `rating > 0`
- No buy CTA if `price <= 0` — show “Unavailable” / link to details

### Forms
- 16px input text on mobile (iOS zoom guard already in globals)
- Clear required markers
- Error text under field, not toast-only

### Icons
- Phosphor in chrome · Lucide in product UI
- Stroke 1.5–1.75 · never icon-card grids for trust

---

## Imagery

- Product-led, true crops, prefer contain over aggressive cover
- Category tiles: consistent square, contain, thumb-friendly (~96–128px)
- No stock “happy shopper” montage unless authentic store media
- Cloudinary quality: cards ~70 · hero/LCP higher as already configured

---

## Motion

Good: image hover scale ≤ 1.03 · drawer/menu · accordion · gallery swipe  
Bad: floating orbs · glow borders · scroll-reveal on every block · cursor gimmicks  

Always honor `prefers-reduced-motion`.

---

## Homepage composition (5-second test)

1. What we sell (electronics accessories in Pakistan)
2. Why buy here (clear products + fair prices)
3. COD available
4. Reachable (phone / WhatsApp from settings)
5. Where to start (Shop / categories / best sellers)

Structure: Header → Hero (one statement) → Categories → Best sellers → One editorial feature → Real proof only → One trust module → Useful guides.

---

## Trust & copy rules

- Facts only: COD, return days, warranty months from settings
- Never invent reviews, names, ratings, certifications
- Ban unsupported: “official”, “authorized”, “certified”, “100% genuine”, “tested by our team” unless substantiated in settings/legal pages
- Prefer: “Cash on delivery”, “Inspect at the door”, “WhatsApp support”, concrete day counts

---

## Pricing integrity

- Purchasable only when `price > 0`
- Admin cannot publish at 0
- Catalog/home/PDP hide or block buy for invalid prices
- Checkout already rejects `unitPrice <= 0` — keep that server rule

---

## Checkout calm

Checkout must feel quieter than the homepage: fewer decorations, clear totals, COD message once, strong final CTA, no competing marketing bands.
