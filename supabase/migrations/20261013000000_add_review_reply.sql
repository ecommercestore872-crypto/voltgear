-- add reply column to review tables
ALTER TABLE public.product_reviews
ADD COLUMN IF NOT EXISTS reply text;

ALTER TABLE public.review_submissions
ADD COLUMN IF NOT EXISTS reply text;
