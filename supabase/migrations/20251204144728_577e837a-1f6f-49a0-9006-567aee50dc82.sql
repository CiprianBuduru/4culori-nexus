-- Add development policies for orders table
CREATE POLICY "Allow insert for development" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update for development" 
ON public.orders 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow select for development" 
ON public.orders 
FOR SELECT 
USING (true);

CREATE POLICY "Allow delete for development" 
ON public.orders 
FOR DELETE 
USING (true);

-- Add development policies for vacations table
CREATE POLICY "Allow insert for development" 
ON public.vacations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update for development" 
ON public.vacations 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow select for development" 
ON public.vacations 
FOR SELECT 
USING (true);

CREATE POLICY "Allow delete for development" 
ON public.vacations 
FOR DELETE 
USING (true);