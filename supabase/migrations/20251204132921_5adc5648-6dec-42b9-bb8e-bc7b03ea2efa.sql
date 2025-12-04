-- Add contract company field to clients table
ALTER TABLE public.clients 
ADD COLUMN contract_company text;