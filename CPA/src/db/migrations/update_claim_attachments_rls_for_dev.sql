-- Migration to update RLS policies for the claim-attachments bucket for development

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
DROP POLICY IF EXISTS "Allow authenticated uploads to claim-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated downloads from claim-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from claim-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow dev user uploads to claim-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow dev user downloads from claim-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow dev user deletes from claim-attachments" ON storage.objects;

-- Create new policies for the claim-attachments bucket specifically for the development user

-- Allow the development user to upload files to the claim-attachments bucket
CREATE POLICY "Allow dev user uploads to claim-attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'claim-attachments' AND
  auth.uid() = 'fb0c14a7-550a-4d41-90f4-86d714961f87'
);

-- Allow the development user to view files in the claim-attachments bucket
CREATE POLICY "Allow dev user downloads from claim-attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'claim-attachments' AND
  auth.uid() = 'fb0c14a7-550a-4d41-90f4-86d714961f87'
);

-- Allow the development user to delete files from the claim-attachments bucket
CREATE POLICY "Allow dev user deletes from claim-attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'claim-attachments' AND
  auth.uid() = 'fb0c14a7-550a-4d41-90f4-86d714961f87'
);

-- For development purposes, also add a policy that allows all authenticated users
-- This is a fallback in case the specific user policy doesn't work

-- Allow all authenticated users to upload files to the claim-attachments bucket
CREATE POLICY "Allow all authenticated uploads to claim-attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'claim-attachments'
);

-- Allow all authenticated users to view files in the claim-attachments bucket
CREATE POLICY "Allow all authenticated downloads from claim-attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'claim-attachments'
);

-- Allow all authenticated users to delete files from the claim-attachments bucket
CREATE POLICY "Allow all authenticated deletes from claim-attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'claim-attachments'
);
