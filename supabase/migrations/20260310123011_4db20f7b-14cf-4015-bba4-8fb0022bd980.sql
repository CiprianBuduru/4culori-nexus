
ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS weight_gsm integer,
  ADD COLUMN IF NOT EXISTS format text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
