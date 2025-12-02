-- Add CUI field to clients table
ALTER TABLE public.clients ADD COLUMN cui VARCHAR(20) UNIQUE;