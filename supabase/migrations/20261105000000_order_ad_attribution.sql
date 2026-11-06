-- Preserve ad creative and ad identifiers from consented campaign clicks.
-- Service-role order updates use these columns; no new public grants or policies.
alter table public.orders
  add column if not exists attrib_content text,
  add column if not exists attrib_ad_id text;
