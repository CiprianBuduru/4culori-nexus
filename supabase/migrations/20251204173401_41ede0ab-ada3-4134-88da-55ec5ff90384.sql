-- Create table for raw materials
CREATE TABLE public.materials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'buc',
  unit_price numeric NOT NULL DEFAULT 0,
  category text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table for service tariffs
CREATE TABLE public.service_tariffs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'ora',
  unit_price numeric NOT NULL DEFAULT 0,
  department_id text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table for recipes
CREATE TABLE public.recipes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  brief_keywords text[],
  materials jsonb DEFAULT '[]'::jsonb,
  services jsonb DEFAULT '[]'::jsonb,
  base_price numeric DEFAULT 0,
  price_per_unit numeric DEFAULT 0,
  formula text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- RLS policies for materials
CREATE POLICY "Anyone can view materials" ON public.materials FOR SELECT USING (true);
CREATE POLICY "Admins can manage materials" ON public.materials FOR ALL USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'director'::app_role));

-- RLS policies for service_tariffs
CREATE POLICY "Anyone can view service tariffs" ON public.service_tariffs FOR SELECT USING (true);
CREATE POLICY "Admins can manage service tariffs" ON public.service_tariffs FOR ALL USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'director'::app_role));

-- RLS policies for recipes
CREATE POLICY "Anyone can view recipes" ON public.recipes FOR SELECT USING (true);
CREATE POLICY "Admins can manage recipes" ON public.recipes FOR ALL USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'director'::app_role));

-- Development policies
CREATE POLICY "Dev select materials" ON public.materials FOR SELECT USING (true);
CREATE POLICY "Dev insert materials" ON public.materials FOR INSERT WITH CHECK (true);
CREATE POLICY "Dev update materials" ON public.materials FOR UPDATE USING (true);
CREATE POLICY "Dev delete materials" ON public.materials FOR DELETE USING (true);

CREATE POLICY "Dev select service_tariffs" ON public.service_tariffs FOR SELECT USING (true);
CREATE POLICY "Dev insert service_tariffs" ON public.service_tariffs FOR INSERT WITH CHECK (true);
CREATE POLICY "Dev update service_tariffs" ON public.service_tariffs FOR UPDATE USING (true);
CREATE POLICY "Dev delete service_tariffs" ON public.service_tariffs FOR DELETE USING (true);

CREATE POLICY "Dev select recipes" ON public.recipes FOR SELECT USING (true);
CREATE POLICY "Dev insert recipes" ON public.recipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Dev update recipes" ON public.recipes FOR UPDATE USING (true);
CREATE POLICY "Dev delete recipes" ON public.recipes FOR DELETE USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_service_tariffs_updated_at BEFORE UPDATE ON public.service_tariffs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();