-- Migration to add client_id column to vehicles table
-- This allows vehicles to be associated with clients

-- First, add the client_id column
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id);

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_vehicles_client_id ON vehicles(client_id);

-- Update the table comment to reflect the relationship
COMMENT ON TABLE vehicles IS 'Stores details about vehicles involved in claims. Multiple records can exist for the same physical vehicle (same VIN/registration) as each claim creates a new vehicle record. Each vehicle can be associated with a client.';
