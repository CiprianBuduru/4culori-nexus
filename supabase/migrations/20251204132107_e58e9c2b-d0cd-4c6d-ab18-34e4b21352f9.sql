-- Create storage bucket for client contracts
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-contracts', 'client-contracts', true);

-- Allow authenticated users to upload contracts
CREATE POLICY "Authenticated users can upload contracts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-contracts');

-- Allow authenticated users to view contracts
CREATE POLICY "Authenticated users can view contracts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-contracts');

-- Allow authenticated users to delete contracts
CREATE POLICY "Authenticated users can delete contracts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-contracts');