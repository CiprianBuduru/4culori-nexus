-- Add comercial and unitate_protejata columns to clients table
ALTER TABLE public.clients 
ADD COLUMN is_comercial boolean DEFAULT false,
ADD COLUMN is_unitate_protejata boolean DEFAULT false;