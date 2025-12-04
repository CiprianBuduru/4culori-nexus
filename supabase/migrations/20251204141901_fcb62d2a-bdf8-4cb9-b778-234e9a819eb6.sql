-- Create employees table for persistent storage
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  position TEXT NOT NULL,
  department_id TEXT NOT NULL,
  avatar TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  company TEXT,
  is_protected_unit BOOLEAN DEFAULT false,
  access_level INTEGER DEFAULT 0,
  birth_date DATE,
  hire_date DATE,
  vacation_days_per_year INTEGER DEFAULT 21,
  salary_gross NUMERIC,
  salary_net NUMERIC,
  service_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins and directors can manage employees"
ON public.employees FOR ALL
USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "Sef productie can view employees"
ON public.employees FOR SELECT
USING (has_role(auth.uid(), 'sef_productie'::app_role));

CREATE POLICY "Operators can view employees"
ON public.employees FOR SELECT
USING (has_role(auth.uid(), 'operator'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();