-- Add contact person and contact method fields to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS contact_person text,
ADD COLUMN IF NOT EXISTS contact_method text;