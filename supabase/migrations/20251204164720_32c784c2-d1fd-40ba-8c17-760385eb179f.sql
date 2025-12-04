-- Add document_type column to distinguish between offers and orders
ALTER TABLE public.orders 
ADD COLUMN document_type text NOT NULL DEFAULT 'comanda' 
CHECK (document_type IN ('oferta', 'comanda'));