-- Publish a product and all of its dependent catalog rows as one transaction.
-- Only the service role may call this function; shoppers remain read-only.

alter table public.products
  add column if not exists addons jsonb not null default '[]'::jsonb;

drop function if exists public.admin_publish_product(uuid, jsonb, jsonb, jsonb, jsonb);

create or replace function public.admin_publish_product(
  p_product_id uuid,
  p_live_row jsonb,
  p_images jsonb default '[]'::jsonb,
  p_variants jsonb default '[]'::jsonb,
  p_reviews jsonb default '[]'::jsonb,
  p_collection_ids jsonb default null
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if jsonb_typeof(p_live_row) is distinct from 'object'
     or jsonb_typeof(p_images) is distinct from 'array'
     or jsonb_typeof(p_variants) is distinct from 'array'
     or jsonb_typeof(p_reviews) is distinct from 'array' then
    raise exception 'BUSINESS_ERROR: Invalid product publish payload';
  end if;

  perform 1 from public.products where id = p_product_id for update;
  if not found then
    raise exception 'BUSINESS_ERROR: Product not found';
  end if;

  update public.products set
    name = p_live_row->>'name',
    slug = p_live_row->>'slug',
    brand = nullif(p_live_row->>'brand', ''),
    sku = nullif(p_live_row->>'sku', ''),
    category = p_live_row->>'category',
    price = (p_live_row->>'price')::numeric,
    compare_at_price = (p_live_row->>'compare_at_price')::numeric,
    short_description = nullif(p_live_row->>'short_description', ''),
    description = p_live_row->'description',
    features = coalesce(p_live_row->'features', '[]'::jsonb),
    specifications = coalesce(p_live_row->'specifications', '[]'::jsonb),
    compatibility = coalesce(p_live_row->'compatibility', '[]'::jsonb),
    in_the_box = coalesce(p_live_row->'in_the_box', '[]'::jsonb),
    product_video = coalesce(p_live_row->'product_video', '{}'::jsonb),
    product_faq = coalesce(p_live_row->'product_faq', '[]'::jsonb),
    stock_status = p_live_row->>'stock_status',
    quantity = (p_live_row->>'quantity')::integer,
    rating = (p_live_row->>'rating')::numeric,
    review_count = coalesce((p_live_row->>'review_count')::integer, 0),
    featured = coalesce((p_live_row->>'featured')::boolean, false),
    badge = nullif(p_live_row->>'badge', ''),
    cloudinary_images = coalesce(p_live_row->'cloudinary_images', '[]'::jsonb),
    cost_price = (p_live_row->>'cost_price')::numeric,
    is_demo = coalesce((p_live_row->>'is_demo')::boolean, false),
    color_enabled = coalesce((p_live_row->>'color_enabled')::boolean, false),
    size_enabled = coalesce((p_live_row->>'size_enabled')::boolean, false),
    color_options = coalesce(p_live_row->'color_options', '[]'::jsonb),
    size_options = coalesce(p_live_row->'size_options', '[]'::jsonb),
    addons = coalesce(p_live_row->'addons', '[]'::jsonb),
    free_shipping = coalesce((p_live_row->>'free_shipping')::boolean, false),
    status = 'published',
    draft = null,
    updated_at = now()
  where id = p_product_id;

  delete from public.product_images where product_id = p_product_id;
  insert into public.product_images (product_id, url, sort_order, source)
  select p_product_id, image.url, coalesce(image.sort_order, 0), coalesce(nullif(image.source, ''), 'cloudinary')
  from jsonb_to_recordset(p_images) as image(url text, sort_order integer, source text)
  where nullif(image.url, '') is not null;

  delete from public.product_variants where product_id = p_product_id;
  insert into public.product_variants
    (product_id, key, name, sku, price, compare_at_price, stock_status, image_url, is_default)
  select
    p_product_id,
    variant.key,
    variant.name,
    variant.sku,
    variant.price,
    variant.compare_at_price,
    coalesce(nullif(variant.stock_status, ''), 'in-stock'),
    variant.image_url,
    coalesce(variant.is_default, false)
  from jsonb_to_recordset(p_variants) as variant(
    key text,
    name text,
    sku text,
    price numeric,
    compare_at_price numeric,
    stock_status text,
    image_url text,
    is_default boolean
  )
  where nullif(variant.name, '') is not null;

  delete from public.product_reviews where product_id = p_product_id;
  insert into public.product_reviews
    (product_id, name, rating, review_date, comment, reply, verified, image, is_demo)
  select
    p_product_id,
    review.name,
    review.rating,
    review.review_date,
    review.comment,
    review.reply,
    coalesce(review.verified, false),
    review.image,
    coalesce(review.is_demo, false)
  from jsonb_to_recordset(p_reviews) as review(
    name text,
    rating numeric,
    review_date text,
    comment text,
    reply text,
    verified boolean,
    image text,
    is_demo boolean
  );

  -- NULL means the caller did not edit membership. Otherwise replace only
  -- manual-collection links; generated/automatic collection links are preserved.
  if p_collection_ids is not null then
    if jsonb_typeof(p_collection_ids) is distinct from 'array' then
      raise exception 'BUSINESS_ERROR: Invalid collection membership payload';
    end if;

    delete from public.collection_products membership
    using public.collections collection
    where membership.product_id = p_product_id
      and membership.collection_id = collection.id
      and collection.mode = 'manual'
      and not exists (
        select 1
        from jsonb_array_elements_text(p_collection_ids) desired(id)
        where desired.id = collection.id::text
      );

    insert into public.collection_products (collection_id, product_id, sort_order)
    select
      collection.id,
      p_product_id,
      coalesce((
        select max(existing.sort_order) + 1
        from public.collection_products existing
        where existing.collection_id = collection.id
      ), 0)
    from public.collections collection
    where collection.mode = 'manual'
      and exists (
        select 1
        from jsonb_array_elements_text(p_collection_ids) desired(id)
        where desired.id = collection.id::text
      )
    on conflict (collection_id, product_id) do nothing;
  end if;

  return jsonb_build_object('ok', true, 'product_id', p_product_id);
end;
$$;

revoke all on function public.admin_publish_product(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) from public;
revoke all on function public.admin_publish_product(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) from anon;
revoke all on function public.admin_publish_product(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) from authenticated;
grant execute on function public.admin_publish_product(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) to service_role;

create or replace function public.admin_create_product_draft(
  p_draft jsonb,
  p_collection_ids jsonb default null
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_product_id uuid;
begin
  if jsonb_typeof(p_draft) is distinct from 'object'
     or (p_collection_ids is not null and jsonb_typeof(p_collection_ids) is distinct from 'array') then
    raise exception 'BUSINESS_ERROR: Invalid product draft payload';
  end if;

  insert into public.products (
    name, slug, category, price, stock_status, quantity,
    status, draft, is_demo, cost_price
  ) values (
    p_draft->>'name',
    p_draft->>'slug',
    p_draft->>'category',
    coalesce((p_draft->>'price')::numeric, 0),
    coalesce(nullif(p_draft->>'stockStatus', ''), 'in-stock'),
    (p_draft->>'quantity')::integer,
    'draft',
    p_draft,
    coalesce((p_draft->>'isDemo')::boolean, false),
    (p_draft->>'costPrice')::numeric
  ) returning id into v_product_id;

  if p_collection_ids is not null then
    insert into public.collection_products (collection_id, product_id, sort_order)
    select
      collection.id,
      v_product_id,
      coalesce((
        select max(existing.sort_order) + 1
        from public.collection_products existing
        where existing.collection_id = collection.id
      ), 0)
    from public.collections collection
    where collection.mode = 'manual'
      and exists (
        select 1
        from jsonb_array_elements_text(p_collection_ids) desired(id)
        where desired.id = collection.id::text
      );
  end if;

  return v_product_id;
end;
$$;

revoke all on function public.admin_create_product_draft(jsonb, jsonb) from public;
revoke all on function public.admin_create_product_draft(jsonb, jsonb) from anon;
revoke all on function public.admin_create_product_draft(jsonb, jsonb) from authenticated;
grant execute on function public.admin_create_product_draft(jsonb, jsonb) to service_role;
