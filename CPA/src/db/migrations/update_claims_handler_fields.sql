-- Migration to update claims table with claims handler fields and remove client contact fields

-- First, remove the client contact fields
ALTER TABLE claims 
DROP COLUMN IF EXISTS client_contact_name,
DROP COLUMN IF EXISTS client_contact_number,
DROP COLUMN IF EXISTS client_contact_email;

-- Then, add the claims handler fields
ALTER TABLE claims 
ADD COLUMN IF NOT EXISTS claims_handler_name TEXT,
ADD COLUMN IF NOT EXISTS claims_handler_contact TEXT,
ADD COLUMN IF NOT EXISTS claims_handler_email TEXT;

-- Add comments to explain the purpose of these fields
COMMENT ON COLUMN claims.claims_handler_name IS 'Name of the claims handler at the client';
COMMENT ON COLUMN claims.claims_handler_contact IS 'Contact number for the claims handler';
COMMENT ON COLUMN claims.claims_handler_email IS 'Email address for the claims handler';

-- Update the table comment
COMMENT ON TABLE claims IS 'Core table representing a single claim or inspection request and its lifecycle. Includes claims handler contact information.';
