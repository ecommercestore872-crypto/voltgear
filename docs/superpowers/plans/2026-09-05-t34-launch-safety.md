# Launch Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop unauthenticated courier bookings, store newsletter emails, send a distinct admin new-order email branded Buy n Try, and decrement stock only when units are configured.

**Architecture:** Pure rule modules + existing admin auth + one new Supabase table + one new checkout RPC. Routes stay thin. NULL quantity remains unlimited so unpublished inventory setup cannot block checkout.

**Tech Stack:** Next.js 14, Supabase, Resend, node:test / tsx

## Global Constraints

- Do not activate Autopilot engines.
- Do not change FROM_EMAIL / sending domain.
- Do not break checkout when the new RPC is missing.
- Empty product quantity stays unlimited.
- Brand fallback in transactional copy is Buy n Try.

---

## File map

- `lib/newsletter-rules.ts` — validate/normalize email
- `lib/db/newsletter-store.ts` — persist/list
- `lib/db/stock-rules.ts` — NULL vs decrement decisions
- `lib/email-rules.ts` — admin letter + Buy n Try fallback
- `lib/autopilot/settings.ts` — defaults off
- `supabase/migrations/20260905010000_newsletter_subscribers.sql`
- `supabase/migrations/20260905020000_checkout_place_order.sql`
- `app/api/newsletter/route.ts`
- `app/api/admin/newsletter/route.ts`
- `app/api/admin/postex/book/route.ts`
- `app/api/admin/autopilot/dispatch/route.ts`
- `app/api/checkout/route.ts`
- `lib/db/store.ts` — `createOrderRow` uses RPC
- `lib/email.ts` — `sendAdminNewOrderEmail`
- `app/admin/newsletter/page.tsx` + list component
- `components/admin/product-form.tsx` — units field
- `lib/db/publish.ts` — quantity on document/row

## Task 1: Newsletter rules

**Acceptance criteria:**
- [ ] Invalid email rejected
- [ ] Duplicate normalized email treated as already subscribed

**Verification:** `npx tsx --test lib/newsletter-rules.test.ts`

## Task 2: Persist newsletter + admin list

**Acceptance criteria:**
- [ ] POST `/api/newsletter` writes a row
- [ ] Admin page lists subscribers
- [ ] Persist failure returns an error to the footer

## Task 3: Courier auth

**Acceptance criteria:**
- [ ] Both book routes 401 without admin cookie/bearer

## Task 4: Admin new-order email + brand

**Acceptance criteria:**
- [ ] Admin letter subject says a customer placed an order
- [ ] Customer letter brand fallback is Buy n Try
- [ ] Checkout sends both when `ORDER_NOTIFY_EMAIL` is set

## Task 5: Stock rules + RPC + product units

**Acceptance criteria:**
- [ ] NULL = unlimited, 0 remaining = out of stock
- [ ] `createOrderRow` calls `checkout_place_order` when present
- [ ] Product form can set units

## Task 6: Autopilot defaults off

**Acceptance criteria:**
- [ ] Default masterEnabled false, all modes DISABLED
