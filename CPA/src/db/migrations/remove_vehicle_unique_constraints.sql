-- Migration to remove unique constraints from vehicles table
-- This allows multiple claims to be created for the same vehicle (same VIN or registration number)

-- First, drop the existing unique constraints
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_vin_key;
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_registration_number_key;

-- Create non-unique indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);
CREATE INDEX IF NOT EXISTS idx_vehicles_registration_number ON vehicles(registration_number);

-- Add comment explaining the design decision
COMMENT ON TABLE vehicles IS 'Stores details about vehicles involved in claims. Multiple records can exist for the same physical vehicle (same VIN/registration) as each claim creates a new vehicle record.';
