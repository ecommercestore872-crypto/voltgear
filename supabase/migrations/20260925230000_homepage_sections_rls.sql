-- Remediation step 8: RLS on homepage section tables (service role only, like other CMS tables).

alter table public.homepage_sections enable row level security;
alter table public.homepage_section_products enable row level security;
