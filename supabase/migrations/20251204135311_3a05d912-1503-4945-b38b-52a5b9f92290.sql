-- Drop existing policies for employee-avatars that might be restrictive
DROP POLICY IF EXISTS "Authenticated users can upload employee avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can view employee avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update employee avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete employee avatars" ON storage.objects;

-- Create new permissive policies for employee-avatars bucket (public bucket)
CREATE POLICY "Anyone can upload employee avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'employee-avatars');

CREATE POLICY "Anyone can view employee avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'employee-avatars');

CREATE POLICY "Anyone can update employee avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'employee-avatars');

CREATE POLICY "Anyone can delete employee avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'employee-avatars');