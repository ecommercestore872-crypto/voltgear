-- PostEx booking: short-lived server claim to prevent duplicate create-order calls.

alter table public.orders
  add column if not exists postex_booking_claimed_at timestamptz;
