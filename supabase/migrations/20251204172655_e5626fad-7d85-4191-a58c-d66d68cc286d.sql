-- Add quantity column to orders table
ALTER TABLE public.orders 
ADD COLUMN quantity integer DEFAULT NULL;