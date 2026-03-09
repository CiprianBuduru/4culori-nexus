
-- Production Orders table
CREATE TABLE public.production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  client_name text,
  title text NOT NULL,
  product_type text,
  quantity integer DEFAULT 1,
  priority text NOT NULL DEFAULT 'normal',
  due_date date,
  status text NOT NULL DEFAULT 'nou',
  notes text,
  production_manager_id uuid REFERENCES public.employees(id),
  created_by uuid,
  source_order_id uuid REFERENCES public.orders(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Production Stages table
CREATE TABLE public.production_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  stage_name text NOT NULL,
  department_name text NOT NULL,
  assigned_user_id uuid REFERENCES public.employees(id),
  sequence integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'nou',
  due_at timestamp with time zone,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  blocked_reason text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_stages ENABLE ROW LEVEL SECURITY;

-- RLS for production_orders
CREATE POLICY "Admins and directors can manage production orders"
  ON public.production_orders FOR ALL
  USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "Sef productie can manage production orders"
  ON public.production_orders FOR ALL
  USING (has_role(auth.uid(), 'sef_productie'::app_role));

CREATE POLICY "Operators can view production orders"
  ON public.production_orders FOR SELECT
  USING (has_role(auth.uid(), 'operator'::app_role));

-- RLS for production_stages
CREATE POLICY "Admins and directors can manage production stages"
  ON public.production_stages FOR ALL
  USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "Sef productie can manage production stages"
  ON public.production_stages FOR ALL
  USING (has_role(auth.uid(), 'sef_productie'::app_role));

CREATE POLICY "Operators can view production stages"
  ON public.production_stages FOR SELECT
  USING (has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Operators can update their assigned stages"
  ON public.production_stages FOR UPDATE
  USING (assigned_user_id IN (
    SELECT e.id FROM public.employees e
    WHERE e.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
  ));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.production_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.production_stages;

-- Auto-generate order numbers
CREATE OR REPLACE FUNCTION public.generate_production_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 'PO-(\d+)') AS integer)), 0) + 1
  INTO next_num
  FROM public.production_orders
  WHERE order_number LIKE 'PO-%';
  
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'PO-' || LPAD(next_num::text, 5, '0');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_production_order_number
  BEFORE INSERT ON public.production_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_production_order_number();
