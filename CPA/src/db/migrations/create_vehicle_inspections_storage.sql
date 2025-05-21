-- Migration to create the vehicle-inspections storage bucket

-- Note: This is a SQL representation of what needs to be done in Supabase.
-- In practice, this would be executed through the Supabase dashboard or API.

/*
Storage Bucket Configuration:
- Name: vehicle-inspections
- Public access: No (private)
- File size limit: 10MB
- Allowed MIME types: image/jpeg, image/png, image/webp

Folder structure:
vehicle-inspections/
  ├── {claim_id}/
  │   ├── {inspection_id}/
  │   │   ├── 360-view/
  │   │   │   ├── front.jpg
  │   │   │   ├── right-front.jpg
  │   │   │   ├── right-side.jpg
  │   │   │   ├── right-rear.jpg
  │   │   │   ├── rear.jpg
  │   │   │   ├── left-rear.jpg
  │   │   │   ├── left-side.jpg
  │   │   │   └── left-front.jpg
  │   │   ├── registration/
  │   │   │   └── registration.jpg
  │   │   ├── license-disc/
  │   │   │   └── license-disc.jpg
  │   │   └── vin/
  │   │       ├── dash.jpg
  │   │       ├── plate.jpg
  │   │       └── number.jpg
*/

-- RLS Policies for the storage bucket:

-- Allow authenticated users to select files
-- storage.policy('Allow authenticated users to select files', 'vehicle-inspections', 'SELECT', 'authenticated', true);

-- Allow authenticated users to insert files
-- storage.policy('Allow authenticated users to insert files', 'vehicle-inspections', 'INSERT', 'authenticated', true);

-- Allow authenticated users to update files
-- storage.policy('Allow authenticated users to update files', 'vehicle-inspections', 'UPDATE', 'authenticated', true);

-- Allow authenticated users to delete files
-- storage.policy('Allow authenticated users to delete files', 'vehicle-inspections', 'DELETE', 'authenticated', true);

-- Note: The above SQL-like syntax is for documentation purposes only.
-- In practice, these policies would be created through the Supabase dashboard or API.
