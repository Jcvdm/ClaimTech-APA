-- Migration to add inspection_datetime column to claims table

-- Add the new column
ALTER TABLE claims 
ADD COLUMN IF NOT EXISTS inspection_datetime TIMESTAMPTZ;

-- Add a comment to explain the purpose of this field
COMMENT ON COLUMN claims.inspection_datetime IS 'Date and time when the inspection was performed';

-- Update the table comment
COMMENT ON TABLE claims IS 'Core table representing a single claim or inspection request and its lifecycle. Includes inspection date/time.';
