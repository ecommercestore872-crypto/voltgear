\set ON_ERROR_STOP on
create extension if not exists pgcrypto;
do $$begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end$$;
create table public.products(id uuid primary key default gen_random_uuid(), slug text unique, quantity integer, stock_status text);
create table public.product_variants(id uuid primary key default gen_random_uuid(), product_id uuid references products(id), key text);
create table public.orders(
 id uuid primary key default gen_random_uuid(), order_id text unique not null,
 customer jsonb, payment text, subtotal numeric, shipping numeric, total numeric,
 discount numeric, promo_code text, status text, is_demo boolean,
 idempotency_key text, idempotency_fingerprint text,
 created_at timestamptz default now()
);
create unique index idx_orders_idempotency_key on public.orders(idempotency_key) where idempotency_key is not null;
create table public.order_items(
 order_id uuid references orders(id), slug text, name text, price numeric,
 quantity integer, variant_key text, variant_name text, variant_sku text, line_total numeric
);
create table public.order_status_history(order_id uuid references orders(id), status text, note text, at timestamptz);
create table public.promo_codes(
 id uuid primary key default gen_random_uuid(), code text unique, active boolean,
 starts_at timestamptz, ends_at timestamptz, first_order_only boolean,
 usage_count integer default 0, max_usage integer, updated_at timestamptz
);
insert into products(slug,quantity,stock_status) values ('qa-product',10,'in-stock');
\i /tmp/checkout-rpc.sql
\i /tmp/meta-outbox.sql

do $$
declare v_payload jsonb;
declare v_result jsonb;
declare v_row public.meta_purchase_outbox%rowtype;
declare v_claim public.meta_purchase_outbox%rowtype;
declare v_count integer;
begin
  -- Denied consent is passed as NULL intent: accepted order, no marketing row.
  v_result := public.checkout_place_order_with_meta('BNT-QA-1','{"email":"qa@example.com"}'::jsonb,'cod',100,20,120,0,'',false,
    '[{"slug":"qa-product","name":"QA","price":100,"quantity":1,"lineTotal":100}]'::jsonb,
    'qa-key-1','fingerprint-1',null);
  if v_result->>'order_id' <> 'BNT-QA-1' or exists(select 1 from public.meta_purchase_outbox) then
    raise exception 'denied consent inserted intent';
  end if;
  v_payload := jsonb_build_object('data',jsonb_build_array(jsonb_build_object(
    'event_name','Purchase','event_id','BNT-QA-2','event_time',extract(epoch from now())::integer,
    'action_source','website','event_source_url','https://buyntryy.com/checkout',
    'user_data',jsonb_build_object('em',jsonb_build_array(repeat('a',64))),
    'custom_data',jsonb_build_object('currency','PKR','value',120,'content_ids',jsonb_build_array('qa-product')))));
  v_result := public.checkout_place_order_with_meta('BNT-QA-2','{"email":"qa@example.com"}'::jsonb,'cod',100,20,120,0,'',false,
    '[{"slug":"qa-product","name":"QA","price":100,"quantity":1,"lineTotal":100}]'::jsonb,
    'qa-key-2','fingerprint-2',v_payload);
  if v_result->>'order_id' <> 'BNT-QA-2' or (select count(*) from public.meta_purchase_outbox) <> 1 then
    raise exception 'atomic intent missing';
  end if;
  v_result := public.checkout_place_order_with_meta('BNT-QA-NEW-ID','{"email":"qa@example.com"}'::jsonb,'cod',100,20,120,0,'',false,
    '[{"slug":"qa-product","name":"QA","price":100,"quantity":1,"lineTotal":100}]'::jsonb,
    'qa-key-2','fingerprint-2',v_payload);
  if v_result->>'replayed' <> 'true' or (select count(*) from public.meta_purchase_outbox) <> 1 then
    raise exception 'replay duplicated intent';
  end if;
  begin
    perform public.checkout_place_order_with_meta('BNT-QA-3','{"email":"qa@example.com"}'::jsonb,'cod',100,20,120,0,'',false,
      '[{"slug":"qa-product","name":"QA","price":100,"quantity":1,"lineTotal":100}]'::jsonb,
      'qa-key-3','fingerprint-3',v_payload);
    raise exception 'invalid intent was accepted';
  exception when others then
    if sqlerrm = 'invalid intent was accepted' then raise; end if;
  end;
  if exists(select 1 from public.orders where order_id='BNT-QA-3') or
     (select quantity from public.products where slug='qa-product') <> 8 then
    raise exception 'failed outbox insert did not roll back order/inventory';
  end if;
  select * into v_claim from public.claim_meta_purchase_outbox(1,'BNT-QA-2');
  if v_claim.order_id <> 'BNT-QA-2' or v_claim.attempts <> 1 then raise exception 'claim failed'; end if;
  select count(*) into v_count from public.claim_meta_purchase_outbox(1,'BNT-QA-2');
  if v_count <> 0 then raise exception 'duplicate worker claim'; end if;
  if not public.finish_meta_purchase_outbox(v_claim.id,v_claim.lease_token,false,429,'rate_limit',90) then
    raise exception 'finish retry failed';
  end if;
  select * into v_row from public.meta_purchase_outbox where id=v_claim.id;
  if v_row.status <> 'pending' or v_row.attempts <> 1 or v_row.next_attempt_at < now()+interval '85 seconds' then
    raise exception 'backoff or retry-after missing';
  end if;
  update public.meta_purchase_outbox set next_attempt_at=now()-interval '1 second' where id=v_claim.id;
  select * into v_claim from public.claim_meta_purchase_outbox(1,'BNT-QA-2');
  if v_claim.attempts <> 2 then raise exception 'retry claim failed'; end if;
  if public.finish_meta_purchase_outbox(v_claim.id,gen_random_uuid(),true,200,null,null) then
    raise exception 'stale lease completed delivery';
  end if;
  if not public.finish_meta_purchase_outbox(v_claim.id,v_claim.lease_token,true,200,null,null) then
    raise exception 'delivery completion failed';
  end if;
  select * into v_row from public.meta_purchase_outbox where id=v_claim.id;
  if v_row.status <> 'delivered' or v_row.payload <> '{}'::jsonb then raise exception 'delivered payload not scrubbed'; end if;
  if has_table_privilege('anon','public.meta_purchase_outbox','SELECT') or
     has_function_privilege('anon','public.claim_meta_purchase_outbox(integer,text)','EXECUTE') then
    raise exception 'public outbox privilege leak';
  end if;
end$$;
select 'meta outbox isolated SQL passed' as result;
