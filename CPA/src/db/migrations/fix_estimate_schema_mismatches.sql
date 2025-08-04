-- Migration: Fix estimate schema mismatches with TypeScript types
-- This migration aligns the database schema with TypeScript definitions
-- and ensures type safety across the application

-- Create ENUMs for better data integrity
CREATE TYPE estimate_status_enum AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'authorized');
CREATE TYPE estimate_type_enum AS ENUM ('incident', 'pre_incident', 'supplementary');
CREATE TYPE estimate_source_enum AS ENUM ('in_house', 'third_party');
CREATE TYPE operation_code_enum AS ENUM ('N', 'R', 'S', 'P', 'B', 'O', 'SC');
CREATE TYPE part_type_enum AS ENUM ('D', 'ALT', 'U', 'O');

-- 1. Add missing columns to estimates table
ALTER TABLE estimates 
ADD COLUMN IF NOT EXISTS special_markup_percentage NUMERIC(5, 2) DEFAULT 25.00,
ADD COLUMN IF NOT EXISTS subtotal_special NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS paint_material_rate NUMERIC(10, 2) NULL;

-- 2. Update estimates table to use ENUMs and align with TypeScript
-- First add new columns with correct types
ALTER TABLE estimates 
ADD COLUMN IF NOT EXISTS status_new estimate_status_enum DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS estimate_type_new estimate_type_enum DEFAULT 'incident',
ADD COLUMN IF NOT EXISTS estimate_source_new estimate_source_enum DEFAULT 'in_house';

-- Copy existing data with proper casting
UPDATE estimates 
SET 
    status_new = CASE 
        WHEN status = 'draft' THEN 'draft'::estimate_status_enum
        WHEN status = 'submitted' THEN 'submitted'::estimate_status_enum
        WHEN status = 'approved' THEN 'approved'::estimate_status_enum
        WHEN status = 'rejected' THEN 'rejected'::estimate_status_enum
        WHEN status = 'authorized' THEN 'authorized'::estimate_status_enum
        ELSE 'draft'::estimate_status_enum
    END,
    estimate_type_new = CASE 
        WHEN estimate_type = 'incident' THEN 'incident'::estimate_type_enum
        WHEN estimate_type = 'pre_incident' THEN 'pre_incident'::estimate_type_enum
        WHEN estimate_type = 'supplementary' THEN 'supplementary'::estimate_type_enum
        ELSE 'incident'::estimate_type_enum
    END,
    estimate_source_new = CASE 
        WHEN estimate_source = 'in_house' THEN 'in_house'::estimate_source_enum
        WHEN estimate_source = 'third_party' THEN 'third_party'::estimate_source_enum
        ELSE 'in_house'::estimate_source_enum
    END;

-- Drop old columns and rename new ones
ALTER TABLE estimates 
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS estimate_type,
DROP COLUMN IF EXISTS estimate_source;

ALTER TABLE estimates 
RENAME COLUMN status_new TO status;
ALTER TABLE estimates 
RENAME COLUMN estimate_type_new TO estimate_type;
ALTER TABLE estimates 
RENAME COLUMN estimate_source_new TO estimate_source;

-- Make status and types NOT NULL after data migration
ALTER TABLE estimates 
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN estimate_type SET NOT NULL,
ALTER COLUMN estimate_source SET NOT NULL;

-- 3. Update estimate_lines table to use ENUMs
ALTER TABLE estimate_lines 
ADD COLUMN IF NOT EXISTS operation_code_new operation_code_enum,
ADD COLUMN IF NOT EXISTS part_type_new part_type_enum;

-- Copy existing data with proper casting
UPDATE estimate_lines 
SET 
    operation_code_new = CASE 
        WHEN operation_code = 'N' THEN 'N'::operation_code_enum
        WHEN operation_code = 'R' THEN 'R'::operation_code_enum
        WHEN operation_code = 'S' THEN 'S'::operation_code_enum
        WHEN operation_code = 'P' THEN 'P'::operation_code_enum
        WHEN operation_code = 'B' THEN 'B'::operation_code_enum
        WHEN operation_code = 'O' THEN 'O'::operation_code_enum
        WHEN operation_code = 'SC' THEN 'SC'::operation_code_enum
        ELSE 'N'::operation_code_enum
    END,
    part_type_new = CASE 
        WHEN part_type = 'D' THEN 'D'::part_type_enum
        WHEN part_type = 'ALT' THEN 'ALT'::part_type_enum
        WHEN part_type = 'U' THEN 'U'::part_type_enum
        WHEN part_type = 'O' THEN 'O'::part_type_enum
        ELSE NULL
    END;

-- Drop old columns and rename new ones
ALTER TABLE estimate_lines 
DROP COLUMN IF EXISTS operation_code,
DROP COLUMN IF EXISTS part_type;

ALTER TABLE estimate_lines 
RENAME COLUMN operation_code_new TO operation_code;
ALTER TABLE estimate_lines 
RENAME COLUMN part_type_new TO part_type;

-- Make operation_code NOT NULL
ALTER TABLE estimate_lines 
ALTER COLUMN operation_code SET NOT NULL;

-- 4. Update the calculate_estimate_totals function to use new columns
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
        THEN sublet_cost * (1 + COALESCE(estimate_record.special_markup_percentage, 25) / 100.0)
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

-- 5. Update indexes for better performance with ENUMs
DROP INDEX IF EXISTS idx_estimate_lines_operation_code;
CREATE INDEX idx_estimate_lines_operation_code ON estimate_lines(operation_code);

DROP INDEX IF EXISTS idx_estimates_status;
CREATE INDEX idx_estimates_status ON estimates(status);

-- 6. Create constraints for better data integrity
ALTER TABLE estimates 
ADD CONSTRAINT chk_vat_rate_valid CHECK (vat_rate_percentage >= 0 AND vat_rate_percentage <= 100),
ADD CONSTRAINT chk_special_markup_valid CHECK (special_markup_percentage >= 0 AND special_markup_percentage <= 500),
ADD CONSTRAINT chk_part_markup_valid CHECK (part_markup_percentage >= 0 AND part_markup_percentage <= 500);

ALTER TABLE estimate_lines
ADD CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
ADD CONSTRAINT chk_sequence_positive CHECK (sequence_number > 0),
ADD CONSTRAINT chk_hours_non_negative CHECK (
    COALESCE(strip_fit_hours, 0) >= 0 AND 
    COALESCE(repair_hours, 0) >= 0 AND 
    COALESCE(paint_hours, 0) >= 0
),
ADD CONSTRAINT chk_costs_non_negative CHECK (
    COALESCE(part_cost, 0) >= 0 AND 
    COALESCE(sublet_cost, 0) >= 0
);

-- 7. Add comments for documentation
COMMENT ON COLUMN estimates.special_markup_percentage IS 'Markup percentage applied to special services (operation_code = SC). Default 25%.';
COMMENT ON COLUMN estimates.subtotal_special IS 'Calculated subtotal for special services including markup.';
COMMENT ON COLUMN estimates.paint_material_rate IS 'Rate per panel for paint materials calculation.';

COMMENT ON TYPE estimate_status_enum IS 'Valid estimate workflow statuses matching TypeScript EstimateStatus enum.';
COMMENT ON TYPE estimate_type_enum IS 'Valid estimate types matching TypeScript EstimateType enum.';
COMMENT ON TYPE estimate_source_enum IS 'Valid estimate sources matching TypeScript EstimateSource enum.';
COMMENT ON TYPE operation_code_enum IS 'Valid operation codes matching TypeScript OperationCode enum.';
COMMENT ON TYPE part_type_enum IS 'Valid part types matching TypeScript PartType enum.';

-- 8. Grant necessary permissions
GRANT USAGE ON TYPE estimate_status_enum TO authenticated;
GRANT USAGE ON TYPE estimate_type_enum TO authenticated;
GRANT USAGE ON TYPE estimate_source_enum TO authenticated;
GRANT USAGE ON TYPE operation_code_enum TO authenticated;
GRANT USAGE ON TYPE part_type_enum TO authenticated;

-- 9. Update RLS policies if they reference the old column types
-- (This would need to be customized based on existing RLS policies)

-- Migration completed successfully
-- The database schema now matches TypeScript type definitions