-- Add new fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS order_type text,
ADD COLUMN IF NOT EXISTS brief text;