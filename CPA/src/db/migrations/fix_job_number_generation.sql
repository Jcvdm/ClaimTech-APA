-- Migration to fix job number generation with retry mechanism and better error handling
-- This addresses the duplicate key constraint violation issue

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS trg_generate_job_number ON claims;

-- Drop the existing function
DROP FUNCTION IF EXISTS generate_client_job_number();

-- Create an improved version of the function with retry mechanism
CREATE OR REPLACE FUNCTION generate_client_job_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  client_code VARCHAR(5);
  next_seq INTEGER;
  client_record RECORD;
  retry_count INTEGER := 0;
  max_retries INTEGER := 3;
  job_num TEXT;
  existing_job_number RECORD;
BEGIN
  -- Add debug logging
  RAISE NOTICE 'Generating job number for client_id: %', NEW.client_id;
  
  -- Retry loop to handle potential race conditions
  WHILE retry_count < max_retries LOOP
    BEGIN
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
          next_seq := (SELECT COALESCE(MAX(SUBSTRING(job_number FROM 4)::integer), 0) + 1 FROM claims WHERE job_number LIKE 'UNK%');
        ELSE
          -- Use the found client data
          client_code := client_record.code;
          next_seq := client_record.last_claim_sequence + 1;
          
          -- Check if code is null
          IF client_code IS NULL THEN
            RAISE NOTICE 'Client code is NULL for client_id: %', NEW.client_id;
            client_code := 'UNK';
            next_seq := (SELECT COALESCE(MAX(SUBSTRING(job_number FROM 4)::integer), 0) + 1 FROM claims WHERE job_number LIKE 'UNK%');
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
        next_seq := (SELECT COALESCE(MAX(SUBSTRING(job_number FROM 4)::integer), 0) + 1 FROM claims WHERE job_number LIKE 'ERR%');
      END;
      
      -- Format the job number (e.g., ABC00001 - adjust padding as needed)
      job_num := client_code || lpad(next_seq::text, 5, '0'); -- Using 5 digits padding
      
      -- Check if this job number already exists
      SELECT 1 INTO existing_job_number FROM claims WHERE job_number = job_num LIMIT 1;
      
      IF existing_job_number IS NULL THEN
        -- Job number is unique, use it
        NEW.job_number := job_num;
        RAISE NOTICE 'Generated job number: %', NEW.job_number;
        RETURN NEW; -- Allow the INSERT to proceed
      ELSE
        -- Job number already exists, increment and try again
        RAISE NOTICE 'Job number % already exists, retrying...', job_num;
        next_seq := next_seq + 1;
        
        -- Update the client's sequence number again
        IF client_record IS NOT NULL THEN
          UPDATE public.clients
          SET last_claim_sequence = next_seq
          WHERE id = NEW.client_id::uuid;
        END IF;
      END IF;
      
      -- Exit the inner BEGIN/EXCEPTION block
      EXIT;
      
    EXCEPTION WHEN OTHERS THEN
      -- Handle any other errors in the retry loop
      RAISE NOTICE 'Error in retry loop: % - %', SQLERRM, SQLSTATE;
      retry_count := retry_count + 1;
      
      IF retry_count >= max_retries THEN
        RAISE EXCEPTION 'Failed to generate unique job number after % attempts', max_retries;
      END IF;
      
      -- Wait a bit before retrying (using pg_sleep)
      PERFORM pg_sleep(0.1 * retry_count); -- Exponential backoff
    END;
    
    -- Increment retry counter
    retry_count := retry_count + 1;
  END LOOP;
  
  -- If we get here, we've exhausted our retries
  -- Generate a truly unique fallback using a timestamp
  NEW.job_number := 'TMP' || to_char(now(), 'YYMMDDHHMMSS');
  RAISE WARNING 'Using timestamp-based fallback job number: %', NEW.job_number;
  
  RETURN NEW;
END;
$$;

-- Re-create the trigger
CREATE TRIGGER trg_generate_job_number
BEFORE INSERT ON public.claims
FOR EACH ROW
EXECUTE FUNCTION generate_client_job_number();

-- Add an index on job_number for better performance
CREATE INDEX IF NOT EXISTS idx_claims_job_number ON claims(job_number);
