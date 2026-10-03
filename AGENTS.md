# VoltGear — Agent Operating Constitution

## Mission

Build VoltGear into a trustworthy, fast, secure, conversion-focused and operationally efficient electronics ecommerce platform for Pakistan.

**Device priority:** Treat **mobile phones (iOS Safari first)** as the primary storefront UX. See `.cursor/rules/mobile-ios-first.mdc` — layout, touch, inputs, safe areas, and checkout must be optimized for phone before desktop polish.

Every implementation decision should materially improve one or more of:

1. customer trust;
2. product discovery;
3. conversion;
4. delivered-order quality;
5. operational efficiency;
6. reliability;
7. performance;
8. security;
9. maintainability.

Avoid complexity that does not improve a customer, merchant or engineering outcome.

## Current stack

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- shadcn/Radix where already used
- Supabase
- Vercel
- custom VoltGear admin
- PKR commerce
- Pakistan / COD-oriented operating context

Before assuming any implementation detail, verify the current code and schema because the project evolves.

## Operating model

Work on **one coherent feature, bug, audit or infrastructure task at a time**.

For non-trivial work:

1. establish the exact task boundary;
2. inspect only directly relevant files;
3. understand existing behavior before editing;
4. reuse existing architecture and components;
5. make the smallest coherent change;
6. preserve unrelated behavior;
7. use targeted checks during work;
8. run the full verification suite once at completion;
9. browser-verify customer-facing UI;
10. stop after the requested task.

Do not repeatedly audit the entire repository.

## Autonomy

Resolve routine engineering decisions independently from:

- current source code;
- tests;
- repository rules;
- existing design system;
- existing data contracts;
- safe engineering judgment.

Do not ask the operator about routine spacing, breakpoints, naming, minor refactors, accessibility fixes, type errors, lint fixes or bugs introduced by your current edits.

Stop and request approval for:

- destructive database/data operations;
- production deployment unless the task explicitly authorizes it;
- secret/credential handling that could expose values;
- irreversible data loss;
- paid dependencies/services;
- major architecture replacement;
- genuinely unknowable business decisions.

## Existing architecture first

Before creating a new component, table, uploader, store adapter, analytics mechanism, page-builder abstraction or helper, search for an existing implementation.

Prefer extension/reuse over competing systems.

Examples:

- reuse `ProductCard` for storefront product merchandising;
- reuse the existing media system rather than creating another uploader;
- reuse the current store/admin data layer rather than adding random direct Supabase calls in components;
- preserve existing server/client boundaries;
- preserve authoritative checkout calculations.

## Commerce truth

Never fabricate or infer unsupported:

- ratings;
- review counts;
- sales numbers;
- customer counts;
- popularity;
- best-seller/trending labels;
- scarcity;
- inventory quantities;
- delivery timelines;
- shipping claims;
- return windows;
- warranty durations;
- discounts;
- certifications;
- authenticity claims;
- trust badges.

Missing business data should produce a hidden element, neutral state, controlled empty state or explicit admin configuration requirement — never fake content.

## Storefront quality

VoltGear must feel like a serious electronics retailer, not an AI template, dropshipping theme or SaaS dashboard.

Prioritize:

- real product/category imagery;
- obvious category discovery;
- prominent products and pricing;
- consistent information hierarchy;
- restrained typography;
- useful commerce information;
- clear CTAs;
- responsive usability;
- real support/policy paths;
- calm spacing and alignment.

Avoid excessive gradients, glow, glassmorphism, decorative blobs, giant shadows, meaningless cards, unnecessary pills, random animations, fake badges and generic AI marketing copy.

No emojis in customer-facing UI. Functional icons should use the existing Lucide system.

## Database safety

Never automatically run destructive operations such as:

- `supabase db reset`;
- `DROP`;
- `TRUNCATE`;
- destructive bulk `DELETE`;
- unapproved production SQL;
- unapproved production migrations;
- ad-hoc service-role scripts that mutate data.

Prefer additive migrations and preserve existing data.

Never expose service-role credentials to client code.

## Secret safety

Never print or expose:

- Supabase service-role/secret keys;
- database passwords;
- Vercel tokens;
- access tokens;
- SMTP passwords;
- private API keys;
- JWT secrets.

Environment checks should report `NAME = PRESENT/MISSING` rather than values.

## Source editing

Use normal file editing mechanisms. Do not rewrite large application source files through shell heredocs. Do not use broad process-kill commands such as `taskkill /F /IM node.exe /T`.

## Verification

For significant implementation, run the relevant complete suite once at the end:

```text
npm run test
npx tsx --test lib/db/inventory-rpc.test.ts
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

If a build fails solely because an external network resource is unavailable, classify it separately from a code failure — but do not claim production build success.

For storefront changes, rendered browser verification is mandatory at approximately 1440px desktop and 390px mobile, including console/runtime errors and overflow.

## Reporting

Ordinary task reports should be concise:

1. what changed;
2. files changed;
3. verification;
4. genuine blocker;
5. `COMPLETE — YES/NO`.

Use long gate reports only for security, migrations, infrastructure or production releases.

## Detailed references

When needed, consult the focused documents in `docs/agent/` instead of repeatedly re-reading the whole repository.
