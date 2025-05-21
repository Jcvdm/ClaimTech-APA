-- Migration to update the create_claim_with_vehicle function to properly cast time_of_loss
-- This addresses the type mismatch error when creating claims with time_of_loss values

-- Update the create_claim_with_vehicle function to properly cast the time_of_loss value
CREATE OR REPLACE FUNCTION create_claim_with_vehicle(
  p_vehicle_data JSONB,
  p_claim_data JSONB,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_vehicle_id UUID;
  v_claim_id UUID;
  v_job_number TEXT;
  v_result JSONB;
  v_client_id UUID;
  v_client_code TEXT;
  v_next_seq INTEGER;
  v_instruction claim_instruction_enum;
  v_time_of_loss TIME;
BEGIN
  -- Extract client_id from claim data
  v_client_id := (p_claim_data->>'client_id')::UUID;
  
  -- Validate and convert instruction to enum type
  BEGIN
    v_instruction := (p_claim_data->>'instruction')::claim_instruction_enum;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid instruction value: %', p_claim_data->>'instruction';
  END;
  
  -- Validate and convert time_of_loss to time type
  BEGIN
    IF p_claim_data->>'time_of_loss' IS NOT NULL AND p_claim_data->>'time_of_loss' != '' THEN
      v_time_of_loss := (p_claim_data->>'time_of_loss')::TIME;
    END IF;
  EXCEPTION WHEN invalid_datetime_format THEN
    RAISE EXCEPTION 'Invalid time format for time_of_loss: %. Expected format: HH:MM', p_claim_data->>'time_of_loss';
  END;
  
  -- Step 1: Create the vehicle
  INSERT INTO vehicles (
    make,
    model,
    year,
    color,
    registration_number,
    vin,
    engine_number,
    owner_name,
    owner_contact,
    created_at,
    updated_at
  ) VALUES (
    p_vehicle_data->>'make',
    p_vehicle_data->>'model',
    (p_vehicle_data->>'year')::INTEGER,
    p_vehicle_data->>'color',
    p_vehicle_data->>'registration_number',
    p_vehicle_data->>'vin',
    p_vehicle_data->>'engine_number',
    p_vehicle_data->>'owner_name',
    p_vehicle_data->>'owner_contact',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_vehicle_id;
  
  -- Step 2: Generate a unique job number
  -- Lock the client row to prevent concurrent updates
  SELECT code, last_claim_sequence + 1 INTO v_client_code, v_next_seq
  FROM clients
  WHERE id = v_client_id
  FOR UPDATE;
  
  -- Handle case where client code is null or not found
  IF v_client_code IS NULL THEN
    -- Use a fallback code
    v_client_code := 'UNK';
    -- Get the next sequence for UNK
    SELECT COALESCE(MAX(SUBSTRING(job_number FROM 4)::integer), 0) + 1 INTO v_next_seq 
    FROM claims 
    WHERE job_number LIKE 'UNK%';
  END IF;
  
  -- Format the job number
  v_job_number := v_client_code || LPAD(v_next_seq::TEXT, 5, '0');
  
  -- Update the client's sequence number
  UPDATE clients
  SET last_claim_sequence = v_next_seq
  WHERE id = v_client_id;
  
  -- Step 3: Create the claim with the vehicle ID and job number
  INSERT INTO claims (
    client_id,
    vehicle_id,
    job_number,
    client_reference,
    instruction,
    date_of_loss,
    time_of_loss,
    type_of_loss,
    accident_description,
    claims_handler_name,
    claims_handler_contact,
    claims_handler_email,
    province_id,
    assigned_employee_id,
    status,
    created_by_employee_id,
    client_special_instructions
  ) VALUES (
    v_client_id,
    v_vehicle_id,
    v_job_number,
    p_claim_data->>'client_reference',
    v_instruction, -- Use the validated enum value
    (p_claim_data->>'date_of_loss')::TIMESTAMPTZ,
    v_time_of_loss, -- Use the validated time value
    p_claim_data->>'type_of_loss',
    p_claim_data->>'accident_description',
    p_claim_data->>'claims_handler_name',
    p_claim_data->>'claims_handler_contact',
    p_claim_data->>'claims_handler_email',
    (p_claim_data->>'province_id')::UUID,
    (p_claim_data->>'assigned_employee_id')::UUID,
    COALESCE(p_claim_data->>'status', 'New'),
    p_user_id,
    p_claim_data->>'client_special_instructions'
  )
  RETURNING id INTO v_claim_id;
  
  -- Step 4: Return the created data
  SELECT jsonb_build_object(
    'id', v_claim_id,
    'vehicle_id', v_vehicle_id,
    'job_number', v_job_number
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Add a comment to explain the function
COMMENT ON FUNCTION create_claim_with_vehicle(JSONB, JSONB, UUID) IS 
'Creates a vehicle and claim in a single transaction, ensuring atomicity and preventing job number collisions. Properly validates and casts the instruction value to the claim_instruction_enum type and time_of_loss to the time type.';
