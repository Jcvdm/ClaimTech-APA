-- Migration to create the vehicle_inspections table and storage bucket

-- Create the vehicle_inspections table
CREATE TABLE IF NOT EXISTS vehicle_inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  inspection_datetime TIMESTAMPTZ NOT NULL,
  inspector_id UUID NOT NULL REFERENCES profiles(id),

  -- Registration details
  registration_number TEXT,
  registration_photo_path TEXT,

  -- License disc details
  license_disc_present BOOLEAN DEFAULT FALSE,
  license_disc_expiry DATE,
  license_disc_photo_path TEXT,

  -- VIN details
  vin_number TEXT,
  vin_dash_photo_path TEXT,
  vin_plate_photo_path TEXT,
  vin_number_photo_path TEXT,

  -- 360 view photos
  front_view_photo_path TEXT,
  right_front_view_photo_path TEXT,
  right_side_view_photo_path TEXT,
  right_rear_view_photo_path TEXT,
  rear_view_photo_path TEXT,
  left_rear_view_photo_path TEXT,
  left_side_view_photo_path TEXT,
  left_front_view_photo_path TEXT,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_claim_id ON vehicle_inspections(claim_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_vehicle_id ON vehicle_inspections(vehicle_id);

-- Add comments
COMMENT ON TABLE vehicle_inspections IS 'Stores detailed vehicle inspection data including photos and metadata';
COMMENT ON COLUMN vehicle_inspections.claim_id IS 'Reference to the claim this inspection belongs to';
COMMENT ON COLUMN vehicle_inspections.vehicle_id IS 'Reference to the vehicle being inspected';
COMMENT ON COLUMN vehicle_inspections.inspection_datetime IS 'Date and time when the inspection was performed';
COMMENT ON COLUMN vehicle_inspections.inspector_id IS 'Reference to the profile who performed the inspection';

-- Create a trigger to update the updated_at column
CREATE TRIGGER update_vehicle_inspections_updated_at
BEFORE UPDATE ON vehicle_inspections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies for the vehicle_inspections table
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select vehicle inspections
CREATE POLICY "Allow authenticated users to select vehicle inspections"
ON vehicle_inspections
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert vehicle inspections
CREATE POLICY "Allow authenticated users to insert vehicle inspections"
ON vehicle_inspections
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update vehicle inspections
CREATE POLICY "Allow authenticated users to update vehicle inspections"
ON vehicle_inspections
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete vehicle inspections
CREATE POLICY "Allow authenticated users to delete vehicle inspections"
ON vehicle_inspections
FOR DELETE
TO authenticated
USING (true);

-- Create a development policy function for vehicle_inspections
CREATE OR REPLACE FUNCTION create_dev_policy_for_vehicle_inspections()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vehicle_inspections' AND policyname = 'Allow development access for vehicle_inspections'
  ) THEN
    -- Create a policy for development that allows all users to access
    EXECUTE 'CREATE POLICY "Allow development access for vehicle_inspections" ON vehicle_inspections FOR ALL TO anon USING (true) WITH CHECK (true)';
  END IF;
END;
$$;
