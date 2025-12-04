-- Create vacations table for employee leave tracking
CREATE TABLE public.vacations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  employee_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'concediu',
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vacations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins and directors can manage vacations"
ON public.vacations FOR ALL
USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "Sef productie can view vacations"
ON public.vacations FOR SELECT
USING (has_role(auth.uid(), 'sef_productie'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_vacations_updated_at
BEFORE UPDATE ON public.vacations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();