# T-38 — Autopilot honesty (slice A)

Date: 2026-09-05  
Status: approved (“a”)  
Scope: Tell the truth on Autopilot screens. Do not turn engines on.

## Problem

Autopilot settings and ads look live (ONLINE, Active/Shadow, mock ROAS). Toggles are in-memory and do nothing. Ads use fake products.

## Slice A

`/admin/autopilot/settings` becomes a status board:

- Waiting to pack (new + processing) → Orders
- Low / zero units → Products
- Orders that have a PostEx tracking number (real column), or 0

Each automation: purpose, “Not running”, and the real control (Book with PostEx, order status, units on hand).

`/admin/autopilot/ads`: real published products (name, price, units). No fake ROAS, spend, or budget advice. “Ad accounts are not connected.”

Remove: ONLINE/OFFLINE, Active/Shadow/Off, telemetry theater, success toast, unmounted fake command-center claims.

## Out of scope (B)

Auto-book, rescue, settlement, Meta/Google. Separate yes later.
