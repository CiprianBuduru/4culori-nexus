-- Add development policies for clients table
CREATE POLICY "Allow insert for development" 
ON public.clients 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update for development" 
ON public.clients 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow select for development" 
ON public.clients 
FOR SELECT 
USING (true);

CREATE POLICY "Allow delete for development" 
ON public.clients 
FOR DELETE 
USING (true);