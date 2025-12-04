-- Add contract fields to clients table
ALTER TABLE public.clients 
ADD COLUMN contract_number text,
ADD COLUMN contract_url text;