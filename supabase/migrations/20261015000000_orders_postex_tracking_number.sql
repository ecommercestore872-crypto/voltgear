-- PostEx booking: store courier tracking on the order (nullable; existing rows unchanged).

alter table public.orders
  add column if not exists postex_tracking_number text;
