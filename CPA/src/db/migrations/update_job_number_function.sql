-- Migration to update the job number generation function
-- This makes it more resilient to different UUID formats and adds a fallback mechanism

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS trg_generate_job_number ON claims;

-- Drop the existing function
DROP FUNCTION IF EXISTS generate_client_job_number();

-- Create an improved version of the function
CREATE OR REPLACE FUNCTION generate_client_job_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  client_code VARCHAR(5);
  next_seq INTEGER;
  client_record RECORD;
BEGIN
  -- Add debug logging
  RAISE NOTICE 'Generating job number for client_id: %', NEW.client_id;
  
  -- Try to find the client with more detailed error handling
  BEGIN
    -- Lock the client row and get the code + sequence
    SELECT c.*, c.code AS code, c.last_claim_sequence AS last_claim_sequence 
    INTO client_record
    FROM public.clients c
    WHERE c.id = NEW.client_id::uuid
    FOR UPDATE; -- Lock the row
    
    -- Check if client was found
    IF client_record IS NULL THEN
      RAISE NOTICE 'Client not found with ID: %', NEW.client_id;
      
      -- Fallback: Use a default code if client not found
      client_code := 'UNK';
      next_seq := 1;
    ELSE
      -- Use the found client data
      client_code := client_record.code;
      next_seq := client_record.last_claim_sequence + 1;
      
      -- Check if code is null
      IF client_code IS NULL THEN
        RAISE NOTICE 'Client code is NULL for client_id: %', NEW.client_id;
        client_code := 'UNK';
      END IF;
      
      -- Update the client's sequence number
      UPDATE public.clients
      SET last_claim_sequence = next_seq
      WHERE id = NEW.client_id::uuid;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log the error and use a fallback
    RAISE NOTICE 'Error finding client: % - %', SQLERRM, SQLSTATE;
    client_code := 'ERR';
    next_seq := floor(random() * 10000)::integer;
  END;
  
  -- Format the job number (e.g., ABC00001 - adjust padding as needed)
  NEW.job_number := client_code || lpad(next_seq::text, 5, '0'); -- Using 5 digits padding
  
  RAISE NOTICE 'Generated job number: %', NEW.job_number;
  
  RETURN NEW; -- Allow the INSERT to proceed
END;
$$;

-- Re-create the trigger
CREATE TRIGGER trg_generate_job_number
BEFORE INSERT ON public.claims
FOR EACH ROW
EXECUTE FUNCTION generate_client_job_number();
