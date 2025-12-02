-- Create clients table
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    address TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    total_amount DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for clients
CREATE POLICY "Admins and directors can manage clients"
ON public.clients
FOR ALL
USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "Sef productie can view clients"
ON public.clients
FOR SELECT
USING (has_role(auth.uid(), 'sef_productie'::app_role));

-- RLS policies for orders
CREATE POLICY "Admins and directors can manage orders"
ON public.orders
FOR ALL
USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "Sef productie can view and update orders"
ON public.orders
FOR SELECT
USING (has_role(auth.uid(), 'sef_productie'::app_role));

CREATE POLICY "Sef productie can update orders"
ON public.orders
FOR UPDATE
USING (has_role(auth.uid(), 'sef_productie'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();