-- Add needs_dtp column to orders table for workflow tracking
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS needs_dtp boolean DEFAULT false;