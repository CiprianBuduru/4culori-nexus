-- Add attachment column to orders table
ALTER TABLE public.orders ADD COLUMN attachment_url text;

-- Create storage bucket for order attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('order-attachments', 'order-attachments', true);

-- Storage policies for order attachments
CREATE POLICY "Authenticated users can upload order attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'order-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view order attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'order-attachments');

CREATE POLICY "Authenticated users can update order attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'order-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete order attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'order-attachments' AND auth.role() = 'authenticated');