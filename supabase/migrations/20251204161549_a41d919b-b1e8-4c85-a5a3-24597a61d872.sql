-- Add production_days column to orders table for tracking required production time
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS production_days integer DEFAULT 0;