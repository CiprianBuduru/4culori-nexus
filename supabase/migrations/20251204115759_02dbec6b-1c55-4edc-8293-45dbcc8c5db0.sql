-- Add production operations column to orders table (stores ordered array of operation IDs)
ALTER TABLE public.orders ADD COLUMN production_operations text[] DEFAULT '{}'::text[];