\set ON_ERROR_STOP on

alter table public.orders
  add column if not exists status_updated_at timestamptz,
  add column if not exists postex_shipment_cancelled_at timestamptz;
create table if not exists public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id),
  status text not null,
  note text,
  at timestamptz not null default now()
);
insert into public.orders (order_id, status, total, inventory_reserved, postex_tracking_number)
  values ('QA-TRACK-1', 'processing', 2399, 2, 'PX-TRACK-1'),
         ('QA-TRACK-CANCELLED', 'cancelled', 2399, 0, 'PX-TRACK-2');

\i /tmp/postex-tracking-ledger.sql

do $$
declare
  first_result jsonb;
  replay_result jsonb;
  older_result jsonb;
  delivered_result jsonb;
  cancelled_result jsonb;
  row_state record;
begin
  if has_function_privilege('anon', 'public.postex_record_tracking_snapshot(text,text,text,text,timestamptz,jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.postex_record_tracking_snapshot(text,text,text,text,timestamptz,jsonb)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.postex_record_tracking_snapshot(text,text,text,text,timestamptz,jsonb)', 'EXECUTE') then
    raise exception 'Tracking RPC permission boundary failed';
  end if;
  first_result := public.postex_record_tracking_snapshot('QA-TRACK-1','PX-TRACK-1','Picked By PostEx','shipped',
    '2026-11-06T09:00:00Z','[{"transactionStatusMessage":"Picked By PostEx"}]'::jsonb);
  replay_result := public.postex_record_tracking_snapshot('QA-TRACK-1','PX-TRACK-1','Picked By PostEx','shipped',
    '2026-11-06T09:00:00Z','[{"transactionStatusMessage":"Picked By PostEx"}]'::jsonb);
  older_result := public.postex_record_tracking_snapshot('QA-TRACK-1','PX-TRACK-1','Booked','processing',
    '2026-11-06T08:00:00Z','[]'::jsonb);
  delivered_result := public.postex_record_tracking_snapshot('QA-TRACK-1','PX-TRACK-1','Delivered','delivered',
    '2026-11-06T10:00:00Z','[]'::jsonb);
  cancelled_result := public.postex_record_tracking_snapshot('QA-TRACK-CANCELLED','PX-TRACK-2','Delivered','delivered',
    '2026-11-06T10:00:00Z','[]'::jsonb);
  if first_result->>'inserted' <> 'true' or first_result->>'advanced' <> 'true'
     or replay_result->>'inserted' <> 'false' or replay_result->>'advanced' <> 'false'
     or older_result->>'advanced' <> 'false' or delivered_result->>'advanced' <> 'true'
     or cancelled_result->>'advanced' <> 'false' then
    raise exception 'Tracking state result incorrect: %, %, %, %, %', first_result,replay_result,older_result,delivered_result,cancelled_result;
  end if;
  select status,total,inventory_reserved,postex_tracking_number,postex_latest_raw_status,postex_last_synced_at
    into row_state from public.orders where order_id='QA-TRACK-1';
  if row_state.status <> 'delivered' or row_state.total <> 2399 or row_state.inventory_reserved <> 2
     or row_state.postex_tracking_number <> 'PX-TRACK-1'
     or row_state.postex_latest_raw_status <> 'Delivered' or row_state.postex_last_synced_at is null then
    raise exception 'Tracking altered financial/inventory fields or latest status';
  end if;
  if (select count(*) from public.postex_tracking_events e join public.orders o on o.id=e.order_id
      where o.order_id='QA-TRACK-1') <> 3 then
    raise exception 'Duplicate tracking snapshot was inserted';
  end if;
  if (select status from public.orders where order_id='QA-TRACK-CANCELLED') <> 'cancelled' then
    raise exception 'Tracking advanced a cancelled order';
  end if;
end;
$$;

select 'postex tracking isolated migration and transitions passed';
