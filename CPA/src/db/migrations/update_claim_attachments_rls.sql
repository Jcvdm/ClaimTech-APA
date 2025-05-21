-- Migration to update RLS policies for the claim-attachments bucket

-- First, check if the bucket exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'claim-attachments'
  ) THEN
    -- Create the bucket if it doesn't exist
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('claim-attachments', 'claim-attachments', false);
  END IF;
END
$$;

-- Drop existing policies for the bucket
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated downloads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Create new policies for the claim-attachments bucket

-- Allow authenticated users to upload files to the claim-attachments bucket
CREATE POLICY "Allow authenticated uploads to claim-attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'claim-attachments'
);

-- Allow authenticated users to view files in the claim-attachments bucket
CREATE POLICY "Allow authenticated downloads from claim-attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'claim-attachments'
);

-- Allow authenticated users to delete files from the claim-attachments bucket
CREATE POLICY "Allow authenticated deletes from claim-attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'claim-attachments'
);

-- More restrictive policies can be added later if needed
-- For example, to restrict access to only files related to claims the user has access to
