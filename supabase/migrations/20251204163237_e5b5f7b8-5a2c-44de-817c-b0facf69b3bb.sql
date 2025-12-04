-- Create table for order type default settings
CREATE TABLE public.order_type_defaults (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_type text NOT NULL UNIQUE,
  order_type_label text NOT NULL,
  default_production_days integer NOT NULL DEFAULT 7,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_type_defaults ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Anyone can read order type defaults"
ON public.order_type_defaults
FOR SELECT
USING (true);

-- Only admins and directors can manage
CREATE POLICY "Admins and directors can manage order type defaults"
ON public.order_type_defaults
FOR ALL
USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'director'::app_role));

-- Development policies
CREATE POLICY "Allow insert for development"
ON public.order_type_defaults
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update for development"
ON public.order_type_defaults
FOR UPDATE
USING (true);

CREATE POLICY "Allow delete for development"
ON public.order_type_defaults
FOR DELETE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_order_type_defaults_updated_at
BEFORE UPDATE ON public.order_type_defaults
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert default values for each order type
INSERT INTO public.order_type_defaults (order_type, order_type_label, default_production_days) VALUES
  ('print', 'Tipărire', 5),
  ('personalizare', 'Personalizare', 7),
  ('gravura', 'Gravură', 4),
  ('broderie', 'Broderie', 10),
  ('dtf_uv', 'DTF/UV', 3),
  ('print_3d', 'Print 3D', 5),
  ('mixt', 'Mixt', 7);