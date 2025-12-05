-- Create products table for stock management
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Development policies (will be restricted in production)
CREATE POLICY "Allow select for development"
ON public.products FOR SELECT
USING (true);

CREATE POLICY "Allow insert for development"
ON public.products FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update for development"
ON public.products FOR UPDATE
USING (true);

CREATE POLICY "Allow delete for development"
ON public.products FOR DELETE
USING (true);

-- Production policies
CREATE POLICY "Admins and directors can manage products"
ON public.products FOR ALL
USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "Authenticated users can view products"
ON public.products FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();