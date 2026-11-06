-- New, consented purchases only. No historical rows are inserted or backfilled.
create table if not exists public.meta_purchase_outbox (
  id uuid primary key default gen_random_uuid(),
  order_pk uuid not null unique references public.orders(id) on delete cascade,
  order_id text not null unique,
  event_time timestamptz not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','processing','delivered','failed','expired')),
  attempts integer not null default 0 check (attempts between 0 and 6),
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  last_http_status integer,
  last_reason text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists meta_purchase_outbox_due_idx
  on public.meta_purchase_outbox(next_attempt_at, created_at)
  where status in ('pending','processing');
alter table public.meta_purchase_outbox enable row level security;
revoke all on public.meta_purchase_outbox from public, anon, authenticated;
grant select, insert, update on public.meta_purchase_outbox to service_role;

-- Calling the existing order RPC and inserting intent inside one outer transaction
-- preserves its stock, promo, and idempotency behavior. An outbox insert failure
-- rolls back the accepted order. Replays never create a second logical event.
create or replace function public.checkout_place_order_with_meta(
  p_order_id text, p_customer jsonb, p_payment text, p_subtotal numeric,
  p_shipping numeric, p_total numeric, p_discount numeric, p_promo_code text,
  p_is_demo boolean, p_items jsonb, p_idempotency_key text,
  p_idempotency_fingerprint text, p_meta_payload jsonb
) returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_result jsonb;
  v_event jsonb;
  v_user jsonb;
  v_event_time timestamptz;
begin
  v_result := public.checkout_place_order(
    p_order_id, p_customer, p_payment, p_subtotal, p_shipping, p_total,
    p_discount, p_promo_code, p_is_demo, p_items,
    p_idempotency_key, p_idempotency_fingerprint
  );
  if p_is_demo or coalesce((v_result->>'replayed')::boolean, false) or p_meta_payload is null then
    return v_result;
  end if;
  v_event := p_meta_payload->'data'->0;
  v_user := v_event->'user_data';
  if jsonb_typeof(p_meta_payload->'data') <> 'array'
     or jsonb_array_length(p_meta_payload->'data') <> 1
     or v_event->>'event_name' <> 'Purchase'
     or v_event->>'event_id' <> p_order_id
     or v_event->>'action_source' <> 'website'
     or v_event->'custom_data'->>'currency' <> 'PKR'
     or (v_event->'custom_data'->>'value')::numeric is distinct from p_total
     or jsonb_typeof(v_user) <> 'object'
     or v_user = '{}'::jsonb
     or exists (select 1 from jsonb_object_keys(v_user) as k where k not in ('em','ph','fbp','fbc'))
  then
    raise exception 'BUSINESS_ERROR: Invalid Meta Purchase intent';
  end if;
  v_event_time := to_timestamp((v_event->>'event_time')::double precision);
  if v_event_time < now() - interval '2 minutes' or v_event_time > now() + interval '1 minute' then
    raise exception 'BUSINESS_ERROR: Invalid Meta Purchase time';
  end if;
  insert into public.meta_purchase_outbox(order_pk, order_id, event_time, payload)
  values ((v_result->>'internal_id')::uuid, p_order_id, v_event_time, p_meta_payload);
  return v_result;
end;
$$;
revoke all on function public.checkout_place_order_with_meta(text,jsonb,text,numeric,numeric,numeric,numeric,text,boolean,jsonb,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.checkout_place_order_with_meta(text,jsonb,text,numeric,numeric,numeric,numeric,text,boolean,jsonb,text,text,jsonb) to service_role;

create or replace function public.claim_meta_purchase_outbox(p_limit integer, p_order_id text default null)
returns setof public.meta_purchase_outbox language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  update public.meta_purchase_outbox
  set status = 'expired', payload = '{}'::jsonb, lease_token = null,
      lease_expires_at = null, updated_at = now()
  where status in ('pending','processing') and event_time < now() - interval '6 days 23 hours';
  return query
  with due as (
    select id from public.meta_purchase_outbox
    where (status = 'pending' or (status = 'processing' and lease_expires_at < now()))
      and next_attempt_at <= now() and attempts < 6
      and event_time >= now() - interval '6 days 23 hours'
      and (p_order_id is null or order_id = p_order_id)
    order by next_attempt_at, created_at
    for update skip locked
    limit least(greatest(coalesce(p_limit, 1), 1), 20)
  )
  update public.meta_purchase_outbox q
  set status = 'processing', attempts = q.attempts + 1,
      lease_token = gen_random_uuid(), lease_expires_at = now() + interval '2 minutes',
      updated_at = now()
  from due where q.id = due.id
  returning q.*;
end;
$$;
revoke all on function public.claim_meta_purchase_outbox(integer,text) from public, anon, authenticated;
grant execute on function public.claim_meta_purchase_outbox(integer,text) to service_role;

create or replace function public.finish_meta_purchase_outbox(
  p_id uuid, p_lease_token uuid, p_delivered boolean,
  p_http_status integer default null, p_reason text default null,
  p_retry_after_seconds integer default null
) returns boolean language plpgsql security invoker set search_path = public, pg_temp as $$
declare v_row public.meta_purchase_outbox%rowtype;
declare v_delay integer;
begin
  select * into v_row from public.meta_purchase_outbox
  where id = p_id and status = 'processing' and lease_token = p_lease_token
  for update;
  if not found then return false; end if;
  if p_reason is not null and p_reason not in ('timeout','network','rate_limit','provider_rejected','invalid_response','configuration') then
    raise exception 'Invalid outbox reason';
  end if;
  if p_delivered then
    update public.meta_purchase_outbox
    set status = 'delivered', delivered_at = now(), payload = '{}'::jsonb,
        lease_token = null, lease_expires_at = null, last_http_status = p_http_status,
        last_reason = null, updated_at = now()
    where id = p_id;
  elsif v_row.attempts >= 6 or v_row.event_time < now() - interval '6 days 23 hours' then
    update public.meta_purchase_outbox
    set status = 'failed', payload = '{}'::jsonb, lease_token = null,
        lease_expires_at = null, last_http_status = p_http_status,
        last_reason = p_reason, updated_at = now()
    where id = p_id;
  else
    v_delay := greatest(30 * power(2, v_row.attempts - 1)::integer,
                        least(greatest(coalesce(p_retry_after_seconds, 0), 0), 21600));
    update public.meta_purchase_outbox
    set status = 'pending', next_attempt_at = now() + make_interval(secs => least(v_delay, 21600)),
        lease_token = null, lease_expires_at = null,
        last_http_status = p_http_status, last_reason = p_reason, updated_at = now()
    where id = p_id;
  end if;
  return true;
end;
$$;
revoke all on function public.finish_meta_purchase_outbox(uuid,uuid,boolean,integer,text,integer) from public, anon, authenticated;
grant execute on function public.finish_meta_purchase_outbox(uuid,uuid,boolean,integer,text,integer) to service_role;
