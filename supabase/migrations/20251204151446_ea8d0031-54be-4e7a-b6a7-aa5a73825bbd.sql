-- Create departments table
CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  color text NOT NULL DEFAULT 'blue',
  sub_departments jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- RLS policies - Admins and directors can manage
CREATE POLICY "Admins and directors can manage departments"
ON public.departments
FOR ALL
USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'director'::app_role));

-- All authenticated users can view
CREATE POLICY "Authenticated users can view departments"
ON public.departments
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Development access policies
CREATE POLICY "Allow select for development"
ON public.departments
FOR SELECT
USING (true);

CREATE POLICY "Allow insert for development"
ON public.departments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update for development"
ON public.departments
FOR UPDATE
USING (true);

CREATE POLICY "Allow delete for development"
ON public.departments
FOR DELETE
USING (true);

-- Insert initial departments with proper UUIDs
INSERT INTO public.departments (name, description, color, sub_departments) VALUES
  ('Management', 'Departamentul de management și conducere', 'green', '[]'),
  ('Vânzări', 'Departamentul de vânzări și relații clienți', 'blue', '[]'),
  ('DTP', 'Departamentul de prepress și design grafic', 'orange', '[]'),
  ('Producție', 'Departamentul de producție și manufacturing', 'teal', '[{"id": "sub-1", "name": "Print 3D"}, {"id": "sub-2", "name": "Gravură"}, {"id": "sub-3", "name": "DTF-UV"}, {"id": "sub-4", "name": "Broderie"}, {"id": "sub-5", "name": "Tipografie"}]'),
  ('Marketing', 'Departamentul de marketing și comunicare', 'pink', '[]'),
  ('Financiar', 'Departamentul financiar-contabil', 'purple', '[]');

-- Add trigger for updated_at
CREATE TRIGGER update_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();