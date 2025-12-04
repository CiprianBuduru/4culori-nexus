-- Add development policy to allow inserts for testing
-- This allows any request to insert employees (for development only)
CREATE POLICY "Allow insert for development" 
ON public.employees 
FOR INSERT 
WITH CHECK (true);

-- Also allow updates for development
CREATE POLICY "Allow update for development" 
ON public.employees 
FOR UPDATE 
USING (true);

-- Also allow select for everyone (for development)
CREATE POLICY "Allow select for development" 
ON public.employees 
FOR SELECT 
USING (true);

-- Also allow delete for development
CREATE POLICY "Allow delete for development" 
ON public.employees 
FOR DELETE 
USING (true);