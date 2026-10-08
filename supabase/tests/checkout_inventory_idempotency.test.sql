-- Definition-level regression coverage for the final checkout RPC override.
-- Run after migrations in an isolated database with: supabase test db.
-- These assertions deliberately inspect the deployed function body so a later
-- migration cannot silently replace variant-safe inventory behavior.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(21);

SELECT ok(
  to_regprocedure('public.checkout_place_order(text,jsonb,text,numeric,numeric,numeric,numeric,text,boolean,jsonb,text,text)') IS NOT NULL,
  'final checkout RPC signature is installed');
SELECT ok(
  to_regprocedure('public.cancel_order_restore_inventory(text,text)') IS NOT NULL,
  'final cancellation RPC signature is installed');

SELECT ok(
  pg_get_functiondef(to_regprocedure('public.checkout_place_order(text,jsonb,text,numeric,numeric,numeric,numeric,text,boolean,jsonb,text,text)'))
    ~ '(?s)JOIN public\.product_variants pv.*FOR UPDATE OF pv',
  'variant purchase locks the selected variant row');
SELECT ok(
  pg_get_functiondef(to_regprocedure('public.checkout_place_order(text,jsonb,text,numeric,numeric,numeric,numeric,text,boolean,jsonb,text,text)'))
    ~ 'UPDATE public\.product_variants',
  'variant purchase decrements product_variants');
SELECT ok(
  pg_get_functiondef(to_regprocedure('public.checkout_place_order(text,jsonb,text,numeric,numeric,numeric,numeric,text,boolean,jsonb,text,text)'))
    ~ '(?s)SELECT id, quantity.*FROM public\.products.*FOR UPDATE',
  'non-variant purchase locks the parent product row');
SELECT ok(
  pg_get_functiondef(to_regprocedure('public.checkout_place_order(text,jsonb,text,numeric,numeric,numeric,numeric,text,boolean,jsonb,text,text)'))
    ~ 'UPDATE public\.products',
  'non-variant purchase decrements products');
SELECT ok(
  pg_get_functiondef(to_regprocedure('public.checkout_place_order(text,jsonb,text,numeric,numeric,numeric,numeric,text,boolean,jsonb,text,text)'))
    ~ 'Insufficient stock for % %',
  'insufficient variant stock is rejected');
SELECT ok(
  pg_get_functiondef(to_regprocedure('public.checkout_place_order(text,jsonb,text,numeric,numeric,numeric,numeric,text,boolean,jsonb,text,text)'))
    ~ 'IF v_current_stock IS NOT NULL',
  'NULL inventory remains unlimited/unconfigured');
SELECT ok(
  pg_get_functiondef(to_regprocedure('public.checkout_place_order(text,jsonb,text,numeric,numeric,numeric,numeric,text,boolean,jsonb,text,text)'))
    ~ 'WHEN v_remaining = 0 THEN ''out-of-stock''',
  'purchase recalculates out-of-stock transitions');
SELECT ok(
  pg_get_functiondef(to_regprocedure('public.checkout_place_order(text,jsonb,text,numeric,numeric,numeric,numeric,text,boolean,jsonb,text,text)'))
    ~ 'WHEN v_remaining <= v_low_stock THEN ''low-stock''',
  'purchase recalculates low-stock transitions');

SELECT ok(
  pg_get_functiondef(to_regprocedure('public.cancel_order_restore_inventory(text,text)'))
    ~ '(?s)JOIN public\.product_variants pv.*FOR UPDATE OF pv',
  'variant cancellation locks the same variant row');
SELECT ok(
  pg_get_functiondef(to_regprocedure('public.cancel_order_restore_inventory(text,text)'))
    ~ 'UPDATE public\.product_variants',
  'variant cancellation restores product_variants');
SELECT ok(
  pg_get_functiondef(to_regprocedure('public.cancel_order_restore_inventory(text,text)'))
    ~ '(?s)SELECT id, quantity.*FROM public\.products.*FOR UPDATE',
  'non-variant cancellation locks the parent product row');
SELECT ok(
  pg_get_functiondef(to_regprocedure('public.cancel_order_restore_inventory(text,text)'))
    ~ 'UPDATE public\.products',
  'non-variant cancellation restores products');
SELECT ok(
  pg_get_functiondef(to_regprocedure('public.cancel_order_restore_inventory(text,text)'))
    ~ 'WHEN v_remaining = 0 THEN ''out-of-stock''',
  'cancellation recalculates out-of-stock transitions');
SELECT ok(
  pg_get_functiondef(to_regprocedure('public.cancel_order_restore_inventory(text,text)'))
    ~ 'WHEN v_remaining <= v_low_stock THEN ''low-stock''',
  'cancellation recalculates low-stock transitions');
SELECT ok(
  pg_get_functiondef(to_regprocedure('public.cancel_order_restore_inventory(text,text)'))
    ~ 'IF v_order\.status = ''cancelled''',
  'cancellation is idempotent after the order lock');
SELECT ok(
  pg_get_functiondef(to_regprocedure('public.cancel_order_restore_inventory(text,text)'))
    ~ '(?s)SELECT \* INTO v_order.*FOR UPDATE',
  'cancellation serializes concurrent requests');

SELECT ok(
  pg_get_functiondef(to_regprocedure('public.checkout_place_order(text,jsonb,text,numeric,numeric,numeric,numeric,text,boolean,jsonb,text,text)'))
    ~ '(?s)EXCEPTION.*WHEN unique_violation',
  'concurrent duplicate checkout rolls back the losing inventory decrement');
SELECT ok(
  pg_get_functiondef(to_regprocedure('public.checkout_place_order(text,jsonb,text,numeric,numeric,numeric,numeric,text,boolean,jsonb,text,text)'))
    ~ 'BUSINESS_ERROR: IDEMPOTENCY_CONFLICT',
  'changed checkout intent is rejected for a reused key');
SELECT ok(
  has_index('public', 'orders', 'idx_orders_idempotency_key'),
  'idempotency key remains uniquely indexed');

SELECT * FROM finish();
ROLLBACK;
