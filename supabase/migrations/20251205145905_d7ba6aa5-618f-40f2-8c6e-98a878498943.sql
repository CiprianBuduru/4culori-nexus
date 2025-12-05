-- Create stock movements table to track inventory changes
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL, -- positive for additions, negative for deductions
  movement_type TEXT NOT NULL, -- 'order', 'manual_add', 'manual_remove', 'adjustment'
  reason TEXT, -- explanation for the movement
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Development policies
CREATE POLICY "Allow select for development"
ON public.stock_movements FOR SELECT USING (true);

CREATE POLICY "Allow insert for development"
ON public.stock_movements FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow delete for development"
ON public.stock_movements FOR DELETE USING (true);

-- Production policies
CREATE POLICY "Admins and directors can manage stock movements"
ON public.stock_movements FOR ALL
USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "Authenticated users can view stock movements"
ON public.stock_movements FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create order_products junction table
CREATE TABLE public.order_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_products ENABLE ROW LEVEL SECURITY;

-- Development policies
CREATE POLICY "Allow select for development"
ON public.order_products FOR SELECT USING (true);

CREATE POLICY "Allow insert for development"
ON public.order_products FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for development"
ON public.order_products FOR UPDATE USING (true);

CREATE POLICY "Allow delete for development"
ON public.order_products FOR DELETE USING (true);

-- Production policies
CREATE POLICY "Admins and directors can manage order products"
ON public.order_products FOR ALL
USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'director'::app_role));