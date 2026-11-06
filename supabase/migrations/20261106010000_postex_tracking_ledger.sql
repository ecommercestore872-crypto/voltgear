-- Persist only provider-observed tracking snapshots. No webhook assumptions.
alter table public.orders
  add column if not exists postex_last_synced_at timestamptz,
  add column if not exists postex_latest_event_at timestamptz,
  add column if not exists postex_latest_raw_status text,
  add column if not exists postex_latest_normalized_status text;

create table if not exists public.postex_tracking_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  tracking_number text not null,
  provider_status text not null,
  normalized_status text,
  provider_event_at timestamptz,
  received_at timestamptz not null default now(),
  provider_history jsonb not null default '[]'::jsonb,
  fingerprint text not null,
  unique (order_id, fingerprint)
);
create index if not exists postex_tracking_events_order_received_idx
  on public.postex_tracking_events(order_id, received_at desc);
alter table public.postex_tracking_events enable row level security;
revoke all on public.postex_tracking_events from public, anon, authenticated;
grant select, insert on public.postex_tracking_events to service_role;
grant usage, select on sequence public.postex_tracking_events_id_seq to service_role;

create or replace function public.postex_record_tracking_snapshot(
  p_order_id text,
  p_tracking_number text,
  p_provider_status text,
  p_normalized_status text,
  p_provider_event_at timestamptz,
  p_provider_history jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_fingerprint text;
  v_inserted bigint;
  v_previous_rank integer;
  v_next_rank integer;
  v_event_is_current boolean;
  v_advanced boolean := false;
begin
  if nullif(trim(p_order_id), '') is null
     or nullif(trim(p_tracking_number), '') is null
     or nullif(trim(p_provider_status), '') is null
     or p_normalized_status not in ('processing', 'shipped', 'delivered')
        and p_normalized_status is not null
     or p_provider_history is null
     or jsonb_typeof(p_provider_history) <> 'array' then
    raise exception 'BUSINESS_ERROR: Invalid tracking snapshot';
  end if;

  select * into v_order from public.orders
    where order_id = trim(p_order_id) for update;
  if not found then
    raise exception 'BUSINESS_ERROR: Order not found';
  end if;
  if v_order.postex_tracking_number is distinct from trim(p_tracking_number) then
    raise exception 'BUSINESS_ERROR: Tracking number changed';
  end if;

  v_fingerprint := md5(
    lower(trim(p_provider_status)) || '|' ||
    coalesce(p_normalized_status, '') || '|' ||
    coalesce(p_provider_event_at::text, '') || '|' ||
    p_provider_history::text
  );
  insert into public.postex_tracking_events (
    order_id, tracking_number, provider_status, normalized_status,
    provider_event_at, provider_history, fingerprint
  ) values (
    v_order.id, trim(p_tracking_number), trim(p_provider_status),
    p_normalized_status, p_provider_event_at, p_provider_history, v_fingerprint
  ) on conflict (order_id, fingerprint) do nothing returning id into v_inserted;

  v_previous_rank := case v_order.status
    when 'new' then 0 when 'processing' then 1
    when 'shipped' then 2 when 'delivered' then 3 else -1 end;
  v_next_rank := case p_normalized_status
    when 'processing' then 1 when 'shipped' then 2
    when 'delivered' then 3 else -1 end;
  v_event_is_current :=
    (p_provider_event_at is not null and
      (v_order.postex_latest_event_at is null or p_provider_event_at >= v_order.postex_latest_event_at))
    or (p_provider_event_at is null and v_order.postex_latest_event_at is null
      and v_next_rank >= v_previous_rank);

  if v_event_is_current and v_next_rank > v_previous_rank
     and v_previous_rank >= 0
     and v_order.postex_shipment_cancelled_at is null then
    update public.orders set status = p_normalized_status,
      status_updated_at = now()
      where id = v_order.id;
    insert into public.order_status_history(order_id, status, note, at)
      values (v_order.id, p_normalized_status,
        left('PostEx status sync: ' || trim(p_provider_status), 500), now());
    v_advanced := true;
  end if;

  update public.orders set
    postex_last_synced_at = now(),
    postex_latest_event_at = case when p_provider_event_at is not null
      and (postex_latest_event_at is null or p_provider_event_at >= postex_latest_event_at)
      then p_provider_event_at else postex_latest_event_at end,
    postex_latest_raw_status = case when v_event_is_current and p_normalized_status is not null
      then trim(p_provider_status) else postex_latest_raw_status end,
    postex_latest_normalized_status = case when v_event_is_current and p_normalized_status is not null
      then p_normalized_status else postex_latest_normalized_status end
    where id = v_order.id;

  return jsonb_build_object(
    'ok', true, 'inserted', v_inserted is not null,
    'advanced', v_advanced, 'status',
    case when v_advanced then p_normalized_status else v_order.status end
  );
end;
$$;
revoke all on function public.postex_record_tracking_snapshot(text, text, text, text, timestamptz, jsonb)
  from public, anon, authenticated;
grant execute on function public.postex_record_tracking_snapshot(text, text, text, text, timestamptz, jsonb)
  to service_role;
