-- Migration to allow public access to the claim-attachments bucket for development

-- First, check if the bucket exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'claim-attachments'
  ) THEN
    -- Create the bucket if it doesn't exist
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('claim-attachments', 'claim-attachments', true);
  ELSE
    -- Update the bucket to be public
    UPDATE storage.buckets
    SET public = true
    WHERE name = 'claim-attachments';
  END IF;
END
$$;

-- Drop existing policies for the bucket
DROP POLICY IF EXISTS "Allow authenticated uploads to claim-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated downloads from claim-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from claim-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow dev user uploads to claim-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow dev user downloads from claim-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow dev user deletes from claim-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated uploads to claim-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated downloads from claim-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated deletes from claim-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to claim-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated access to claim-attachments" ON storage.objects;

-- Create a policy that allows public access to the claim-attachments bucket
CREATE POLICY "Allow public access to claim-attachments"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'claim-attachments')
WITH CHECK (bucket_id = 'claim-attachments');

-- Also create a policy for authenticated users
CREATE POLICY "Allow authenticated access to claim-attachments"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'claim-attachments')
WITH CHECK (bucket_id = 'claim-attachments');
