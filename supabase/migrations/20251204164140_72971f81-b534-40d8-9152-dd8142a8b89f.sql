-- Add default_brief column to order_type_defaults table
ALTER TABLE public.order_type_defaults 
ADD COLUMN default_brief text DEFAULT '';