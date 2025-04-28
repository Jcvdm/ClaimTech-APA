-- Migration to add client contact fields to claims table

-- Add the new columns
ALTER TABLE claims 
ADD COLUMN IF NOT EXISTS time_of_loss TEXT,
ADD COLUMN IF NOT EXISTS client_contact_name TEXT,
ADD COLUMN IF NOT EXISTS client_contact_number TEXT,
ADD COLUMN IF NOT EXISTS client_contact_email TEXT;

-- Add a comment to explain the purpose of these fields
COMMENT ON COLUMN claims.time_of_loss IS 'Time of loss in HH:MM format';
COMMENT ON COLUMN claims.client_contact_name IS 'Name of the contact person for this claim';
COMMENT ON COLUMN claims.client_contact_number IS 'Phone number for the contact person';
COMMENT ON COLUMN claims.client_contact_email IS 'Email address for the contact person (optional)';

-- Update the table comment
COMMENT ON TABLE claims IS 'Core table representing a single claim or inspection request and its lifecycle. Includes client contact information.';
