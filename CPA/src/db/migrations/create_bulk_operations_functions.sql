-- Migration: Create bulk operations functions for estimate lines
-- This migration creates optimized database functions for bulk operations
-- to improve performance and provide atomic transaction support

-- Function to get next sequence numbers for estimate lines
CREATE OR REPLACE FUNCTION get_next_estimate_line_sequences(
  estimate_id_param UUID,
  count_param INTEGER
)
RETURNS INTEGER[]
LANGUAGE plpgsql
AS $$
DECLARE
  max_sequence INTEGER;
  result INTEGER[];
BEGIN
  -- Get the current max sequence number with row locking to prevent races
  SELECT COALESCE(MAX(sequence_number), 0) INTO max_sequence
  FROM estimate_lines
  WHERE estimate_id = estimate_id_param
  FOR UPDATE;
  
  -- Generate array of next sequence numbers
  SELECT ARRAY(SELECT generate_series(max_sequence + 1, max_sequence + count_param))
  INTO result;
  
  RETURN result;
END;
$$;

-- Function to calculate estimate totals efficiently
CREATE OR REPLACE FUNCTION calculate_estimate_totals(estimate_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  estimate_record RECORD;
  totals JSON;
BEGIN
  -- Get estimate for rates
  SELECT * INTO estimate_record
  FROM estimates
  WHERE id = estimate_id_param;
  
  -- Return null if estimate not found
  IF estimate_record IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Calculate totals using optimized query with single scan
  WITH line_calculations AS (
    SELECT
      -- Part calculations with markup
      CASE 
        WHEN part_cost IS NOT NULL AND quantity IS NOT NULL AND quantity > 0
        THEN (part_cost * quantity) * (1 + COALESCE(estimate_record.part_markup_percentage, 0) / 100.0)
        ELSE 0
      END as part_total,
      
      -- Labor calculations (unified rate for all labor types)
      CASE 
        WHEN (COALESCE(strip_fit_hours, 0) + COALESCE(repair_hours, 0)) > 0 
          AND estimate_record.panel_labor_rate IS NOT NULL
        THEN (COALESCE(strip_fit_hours, 0) + COALESCE(repair_hours, 0)) * estimate_record.panel_labor_rate
        ELSE 0
      END as labor_total,
      
      -- Paint material calculations (per panel)
      CASE 
        WHEN paint_hours IS NOT NULL AND paint_hours > 0 
          AND estimate_record.paint_material_rate IS NOT NULL
        THEN paint_hours * estimate_record.paint_material_rate
        ELSE 0
      END as paint_total,
      
      -- Special services with markup
      CASE 
        WHEN operation_code = 'SC' AND sublet_cost IS NOT NULL AND sublet_cost > 0
        THEN sublet_cost * (1 + COALESCE(estimate_record.special_markup_percentage, 15) / 100.0)
        ELSE 0
      END as special_total,
      
      -- Regular sublet (excluding special services)
      CASE 
        WHEN operation_code != 'SC' AND sublet_cost IS NOT NULL AND sublet_cost > 0
        THEN sublet_cost
        ELSE 0
      END as sublet_total
      
    FROM estimate_lines
    WHERE estimate_id = estimate_id_param 
      AND is_included = true
  ),
  totals_summary AS (
    SELECT
      COALESCE(SUM(part_total), 0) as subtotal_parts,
      COALESCE(SUM(labor_total), 0) as subtotal_labor,
      COALESCE(SUM(paint_total), 0) as subtotal_paint_materials,
      COALESCE(SUM(sublet_total), 0) as subtotal_sublet,
      0 as subtotal_other, -- Placeholder for future use
      COALESCE(SUM(special_total), 0) as subtotal_special
    FROM line_calculations
  )
  SELECT json_build_object(
    'subtotal_parts', subtotal_parts,
    'subtotal_labor', subtotal_labor,
    'subtotal_paint_materials', subtotal_paint_materials,
    'subtotal_sublet', subtotal_sublet,
    'subtotal_other', subtotal_other,
    'subtotal_special', subtotal_special,
    'total_before_vat', (subtotal_parts + subtotal_labor + subtotal_paint_materials + subtotal_sublet + subtotal_other + subtotal_special),
    'total_vat', (subtotal_parts + subtotal_labor + subtotal_paint_materials + subtotal_sublet + subtotal_other + subtotal_special) * (COALESCE(estimate_record.vat_rate_percentage, 0) / 100.0),
    'total_amount', (subtotal_parts + subtotal_labor + subtotal_paint_materials + subtotal_sublet + subtotal_other + subtotal_special) * (1 + COALESCE(estimate_record.vat_rate_percentage, 0) / 100.0)
  ) INTO totals
  FROM totals_summary;
  
  RETURN totals;
END;
$$;

-- Function for bulk create estimate lines with transaction support
CREATE OR REPLACE FUNCTION execute_bulk_create_estimate_lines(
  operation_id_param UUID,
  estimate_id_param UUID,
  lines_data_param JSONB,
  batch_size_param INTEGER DEFAULT 20,
  fail_on_first_error_param BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  line_record RECORD;
  successful_count INTEGER := 0;
  failed_count INTEGER := 0;
  successful_lines JSONB := '[]'::JSONB;
  failed_lines JSONB := '[]'::JSONB;
  current_line JSONB;
  inserted_line RECORD;
  error_occurred BOOLEAN := false;
BEGIN
  -- Start transaction savepoint
  SAVEPOINT bulk_create_start;
  
  -- Process each line in the input data
  FOR line_record IN 
    SELECT * FROM jsonb_array_elements(lines_data_param)
  LOOP
    BEGIN
      -- Create savepoint for individual line
      SAVEPOINT individual_line;
      
      -- Insert the line
      INSERT INTO estimate_lines (
        estimate_id,
        damage_id,
        sequence_number,
        description,
        operation_code,
        part_type,
        part_number,
        part_cost,
        quantity,
        strip_fit_hours,
        repair_hours,
        paint_hours,
        sublet_cost,
        is_included,
        line_notes
      )
      SELECT 
        estimate_id_param,
        (line_record.value->>'damage_id')::UUID,
        (line_record.value->>'sequence_number')::INTEGER,
        line_record.value->>'description',
        line_record.value->>'operation_code',
        line_record.value->>'part_type',
        line_record.value->>'part_number',
        (line_record.value->>'part_cost')::NUMERIC,
        COALESCE((line_record.value->>'quantity')::NUMERIC, 1),
        (line_record.value->>'strip_fit_hours')::NUMERIC,
        (line_record.value->>'repair_hours')::NUMERIC,
        (line_record.value->>'paint_hours')::NUMERIC,
        (line_record.value->>'sublet_cost')::NUMERIC,
        COALESCE((line_record.value->>'is_included')::BOOLEAN, true),
        line_record.value->>'line_notes'
      RETURNING * INTO inserted_line;
      
      -- Add to successful lines
      successful_lines := successful_lines || to_jsonb(inserted_line);
      successful_count := successful_count + 1;
      
      -- Release individual savepoint
      RELEASE SAVEPOINT individual_line;
      
    EXCEPTION WHEN OTHERS THEN
      -- Rollback individual line
      ROLLBACK TO SAVEPOINT individual_line;
      
      -- Add to failed lines
      failed_lines := failed_lines || json_build_object(
        'index', successful_count + failed_count,
        'error', json_build_object(
          'code', SQLSTATE,
          'message', SQLERRM
        ),
        'data', line_record.value
      )::JSONB;
      
      failed_count := failed_count + 1;
      error_occurred := true;
      
      -- Check if we should fail on first error
      IF fail_on_first_error_param THEN
        ROLLBACK TO SAVEPOINT bulk_create_start;
        RAISE EXCEPTION 'Bulk create failed on first error: %', SQLERRM;
      END IF;
    END;
  END LOOP;
  
  -- If no errors or continuing despite errors, commit the transaction
  IF NOT error_occurred OR NOT fail_on_first_error_param THEN
    RELEASE SAVEPOINT bulk_create_start;
  END IF;
  
  -- Return results
  RETURN json_build_object(
    'operation_id', operation_id_param,
    'successful_count', successful_count,
    'failed_count', failed_count,
    'successful', successful_lines,
    'failed', failed_lines
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Rollback everything on critical error
  ROLLBACK TO SAVEPOINT bulk_create_start;
  RAISE EXCEPTION 'Critical error in bulk create: %', SQLERRM;
END;
$$;

-- Function for mixed bulk operations (create, update, delete)
CREATE OR REPLACE FUNCTION execute_mixed_bulk_operations(
  operation_id_param UUID,
  estimate_id_param UUID,
  create_operations_param JSONB DEFAULT '[]'::JSONB,
  update_operations_param JSONB DEFAULT '[]'::JSONB,
  delete_operations_param JSONB DEFAULT '[]'::JSONB,
  transaction_isolation_param TEXT DEFAULT 'read_committed'
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  operation_record RECORD;
  successful_count INTEGER := 0;
  failed_count INTEGER := 0;
  results JSONB := '[]'::JSONB;
  operation_result JSONB;
BEGIN
  -- Start transaction with specified isolation level
  EXECUTE format('SET TRANSACTION ISOLATION LEVEL %I', transaction_isolation_param);
  
  -- Start main savepoint
  SAVEPOINT mixed_operations_start;
  
  -- Process creates
  FOR operation_record IN 
    SELECT * FROM jsonb_array_elements(create_operations_param)
  LOOP
    BEGIN
      SAVEPOINT create_operation;
      
      -- Execute create (similar to bulk create but individual)
      INSERT INTO estimate_lines (
        estimate_id,
        damage_id,
        sequence_number,
        description,
        operation_code,
        part_type,
        part_number,
        part_cost,
        quantity,
        strip_fit_hours,
        repair_hours,
        paint_hours,
        sublet_cost,
        is_included,
        line_notes
      )
      SELECT 
        estimate_id_param,
        (operation_record.value->>'damage_id')::UUID,
        (operation_record.value->>'sequence_number')::INTEGER,
        operation_record.value->>'description',
        operation_record.value->>'operation_code',
        operation_record.value->>'part_type',
        operation_record.value->>'part_number',
        (operation_record.value->>'part_cost')::NUMERIC,
        COALESCE((operation_record.value->>'quantity')::NUMERIC, 1),
        (operation_record.value->>'strip_fit_hours')::NUMERIC,
        (operation_record.value->>'repair_hours')::NUMERIC,
        (operation_record.value->>'paint_hours')::NUMERIC,
        (operation_record.value->>'sublet_cost')::NUMERIC,
        COALESCE((operation_record.value->>'is_included')::BOOLEAN, true),
        operation_record.value->>'line_notes';
      
      successful_count := successful_count + 1;
      RELEASE SAVEPOINT create_operation;
      
    EXCEPTION WHEN OTHERS THEN
      ROLLBACK TO SAVEPOINT create_operation;
      failed_count := failed_count + 1;
    END;
  END LOOP;
  
  -- Process updates
  FOR operation_record IN 
    SELECT * FROM jsonb_array_elements(update_operations_param)
  LOOP
    BEGIN
      SAVEPOINT update_operation;
      
      -- Execute update
      UPDATE estimate_lines 
      SET 
        description = COALESCE(operation_record.value->'data'->>'description', description),
        operation_code = COALESCE(operation_record.value->'data'->>'operation_code', operation_code),
        part_type = COALESCE(operation_record.value->'data'->>'part_type', part_type),
        part_number = COALESCE(operation_record.value->'data'->>'part_number', part_number),
        part_cost = COALESCE((operation_record.value->'data'->>'part_cost')::NUMERIC, part_cost),
        quantity = COALESCE((operation_record.value->'data'->>'quantity')::NUMERIC, quantity),
        strip_fit_hours = COALESCE((operation_record.value->'data'->>'strip_fit_hours')::NUMERIC, strip_fit_hours),
        repair_hours = COALESCE((operation_record.value->'data'->>'repair_hours')::NUMERIC, repair_hours),
        paint_hours = COALESCE((operation_record.value->'data'->>'paint_hours')::NUMERIC, paint_hours),
        sublet_cost = COALESCE((operation_record.value->'data'->>'sublet_cost')::NUMERIC, sublet_cost),
        is_included = COALESCE((operation_record.value->'data'->>'is_included')::BOOLEAN, is_included),
        line_notes = COALESCE(operation_record.value->'data'->>'line_notes', line_notes),
        updated_at = NOW()
      WHERE id = (operation_record.value->>'id')::UUID
        AND estimate_id = estimate_id_param;
      
      successful_count := successful_count + 1;
      RELEASE SAVEPOINT update_operation;
      
    EXCEPTION WHEN OTHERS THEN
      ROLLBACK TO SAVEPOINT update_operation;
      failed_count := failed_count + 1;
    END;
  END LOOP;
  
  -- Process deletes
  FOR operation_record IN 
    SELECT * FROM jsonb_array_elements(delete_operations_param)
  LOOP
    BEGIN
      SAVEPOINT delete_operation;
      
      -- Execute delete
      DELETE FROM estimate_lines 
      WHERE id = operation_record.value::UUID
        AND estimate_id = estimate_id_param;
      
      successful_count := successful_count + 1;
      RELEASE SAVEPOINT delete_operation;
      
    EXCEPTION WHEN OTHERS THEN
      ROLLBACK TO SAVEPOINT delete_operation;
      failed_count := failed_count + 1;
    END;
  END LOOP;
  
  -- Commit if successful
  RELEASE SAVEPOINT mixed_operations_start;
  
  -- Return results
  RETURN json_build_object(
    'operation_id', operation_id_param,
    'successful_count', successful_count,
    'failed_count', failed_count,
    'total_operations', (
      jsonb_array_length(create_operations_param) + 
      jsonb_array_length(update_operations_param) + 
      jsonb_array_length(delete_operations_param)
    )
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Rollback everything on critical error
  ROLLBACK TO SAVEPOINT mixed_operations_start;
  RAISE EXCEPTION 'Critical error in mixed bulk operations: %', SQLERRM;
END;
$$;

-- Create indexes for better bulk operation performance
CREATE INDEX IF NOT EXISTS idx_estimate_lines_estimate_id_sequence 
ON estimate_lines(estimate_id, sequence_number);

CREATE INDEX IF NOT EXISTS idx_estimate_lines_estimate_id_included 
ON estimate_lines(estimate_id, is_included);

CREATE INDEX IF NOT EXISTS idx_estimate_lines_operation_code 
ON estimate_lines(operation_code);

-- Create partial index for faster totals calculation
CREATE INDEX IF NOT EXISTS idx_estimate_lines_included_totals 
ON estimate_lines(estimate_id, part_cost, quantity, strip_fit_hours, repair_hours, paint_hours, sublet_cost) 
WHERE is_included = true;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_next_estimate_line_sequences(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_estimate_totals(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_bulk_create_estimate_lines(UUID, UUID, JSONB, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_mixed_bulk_operations(UUID, UUID, JSONB, JSONB, JSONB, TEXT) TO authenticated;