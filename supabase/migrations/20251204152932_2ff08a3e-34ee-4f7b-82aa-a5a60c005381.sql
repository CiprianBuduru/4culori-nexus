-- Create production_tasks table
CREATE TABLE public.production_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  department_id TEXT NOT NULL,
  assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'delayed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  client_name TEXT,
  quantity INTEGER,
  notes TEXT,
  operation_name TEXT, -- If task is for specific operation (Print 3D, Gravură, etc.)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.production_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins and directors can manage production tasks"
ON public.production_tasks
FOR ALL
USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "Sef productie can manage production tasks"
ON public.production_tasks
FOR ALL
USING (has_role(auth.uid(), 'sef_productie'::app_role));

CREATE POLICY "Operators can view production tasks"
ON public.production_tasks
FOR SELECT
USING (has_role(auth.uid(), 'operator'::app_role));

-- Development policies
CREATE POLICY "Allow select for development" ON public.production_tasks FOR SELECT USING (true);
CREATE POLICY "Allow insert for development" ON public.production_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for development" ON public.production_tasks FOR UPDATE USING (true);
CREATE POLICY "Allow delete for development" ON public.production_tasks FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_production_tasks_updated_at
BEFORE UPDATE ON public.production_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.production_tasks;