-- Expand the validated user_data keys while preserving atomic order/outbox insertion.
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
     or exists (select 1 from jsonb_object_keys(v_user) as k where k not in ('em','ph','fn','ln','ct','zp','country','external_id','client_ip_address','client_user_agent','fbp','fbc'))
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
