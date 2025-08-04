// src/lib/utils/estimateCalculations.ts
import { type Estimate, type EstimateLine, OperationCode } from "@/lib/api/domains/estimates/types";

/**
 * Client-side estimate calculation utilities
 * These functions mirror the server-side calculation logic in updateEstimateTotals()
 * to provide real-time calculations without server round trips
 */

export interface CalculatedTotals {
  subtotal_parts: number;
  subtotal_labor: number;
  subtotal_paint_materials: number;
  subtotal_sublet: number;
  subtotal_other: number;
  subtotal_special: number;
  total_before_vat: number;
  total_vat: number;
  total_amount: number;
}

export interface LineCalculations {
  part_total: number;
  labor_total: number;
  paint_material_total: number;
  sublet_total: number;
  special_total: number;
  line_total: number;
}

/**
 * Calculate part total with markup for a single line
 */
export function calculatePartTotal(
  partCost: number | null | undefined,
  quantity: number | null | undefined,
  partMarkupPercentage: number | null | undefined
): number {
  if (!partCost || !quantity || partCost <= 0 || quantity <= 0) {
    return 0;
  }

  let partTotal = partCost * quantity;

  // Apply part markup only to parts
  if (partMarkupPercentage && partMarkupPercentage > 0) {
    partTotal += partTotal * (partMarkupPercentage / 100);
  }

  return partTotal;
}

/**
 * Calculate labor total using single labor rate for a single line
 */
export function calculateLaborTotal(
  stripFitHours: number | null | undefined,
  repairHours: number | null | undefined,
  panelLaborRate: number | null | undefined
): number {
  const totalLaborHours = (stripFitHours || 0) + (repairHours || 0);
  
  if (totalLaborHours <= 0 || !panelLaborRate || panelLaborRate <= 0) {
    return 0;
  }

  return totalLaborHours * panelLaborRate;
}

/**
 * Calculate paint material total based on panel count (no markup)
 */
export function calculatePaintMaterialTotal(
  paintHours: number | null | undefined, // Actually represents panel count
  paintMaterialRate: number | null | undefined
): number {
  if (!paintHours || !paintMaterialRate || paintHours <= 0 || paintMaterialRate <= 0) {
    return 0;
  }

  // Paint hours now represents panel count, not actual hours
  return paintHours * paintMaterialRate;
}

/**
 * Calculate sublet total for a single line
 */
export function calculateSubletTotal(
  subletCost: number | null | undefined
): number {
  if (!subletCost || subletCost <= 0) {
    return 0;
  }

  return subletCost;
}

/**
 * Calculate special services total with markup for a single line
 */
export function calculateSpecialTotal(
  operationCode: string | null | undefined,
  subletCost: number | null | undefined,
  specialMarkupPercentage: number | null | undefined
): number {
  // Only special services (SC operation code) get special markup
  if (operationCode !== OperationCode.SPECIAL || !subletCost || subletCost <= 0) {
    return 0;
  }

  let specialCost = subletCost;

  // Apply special markup if available, default to 15% if not set
  const markupPercentage = specialMarkupPercentage || 15;
  specialCost += specialCost * (markupPercentage / 100);

  return specialCost;
}

/**
 * Calculate all totals for a single estimate line
 */
export function calculateLineTotal(
  line: EstimateLine,
  estimate: Estimate
): LineCalculations {
  const partTotal = calculatePartTotal(
    line.part_cost,
    line.quantity,
    estimate.part_markup_percentage
  );

  const laborTotal = calculateLaborTotal(
    line.strip_fit_hours,
    line.repair_hours,
    estimate.panel_labor_rate
  );

  const paintMaterialTotal = calculatePaintMaterialTotal(
    line.paint_hours,
    estimate.paint_material_rate
  );

  const subletTotal = calculateSubletTotal(line.sublet_cost);

  const specialTotal = calculateSpecialTotal(
    line.operation_code,
    line.sublet_cost,
    estimate.special_markup_percentage
  );

  // Line total is sum of all components
  // Note: Special services are counted separately from sublet
  const adjustedSubletTotal = line.operation_code === OperationCode.SPECIAL ? 0 : subletTotal;
  const lineTotal = partTotal + laborTotal + paintMaterialTotal + adjustedSubletTotal + specialTotal;

  return {
    part_total: partTotal,
    labor_total: laborTotal,
    paint_material_total: paintMaterialTotal,
    sublet_total: adjustedSubletTotal, // Adjusted to exclude special services
    special_total: specialTotal,
    line_total: lineTotal,
  };
}

/**
 * Calculate estimate totals from all lines
 * This mirrors the server-side updateEstimateTotals function
 */
export function calculateEstimateTotals(
  estimate: Estimate,
  lines: EstimateLine[]
): CalculatedTotals {
  // Filter to only included lines
  const includedLines = lines.filter(line => line.is_included);

  if (includedLines.length === 0) {
    return {
      subtotal_parts: 0,
      subtotal_labor: 0,
      subtotal_paint_materials: 0,
      subtotal_sublet: 0,
      subtotal_other: 0,
      subtotal_special: 0,
      total_before_vat: 0,
      total_vat: 0,
      total_amount: 0,
    };
  }

  let subtotalParts = 0;
  let subtotalLabor = 0;
  let subtotalPaintMaterials = 0;
  let subtotalSublet = 0;
  let subtotalOther = 0;
  let subtotalSpecial = 0;

  // Calculate totals for each line
  for (const line of includedLines) {
    const lineCalc = calculateLineTotal(line, estimate);
    
    subtotalParts += lineCalc.part_total;
    subtotalLabor += lineCalc.labor_total;
    subtotalPaintMaterials += lineCalc.paint_material_total;
    subtotalSublet += lineCalc.sublet_total;
    subtotalSpecial += lineCalc.special_total;
    // subtotalOther remains 0 for now as it's not used in current implementation
  }

  // Calculate final totals
  const totalBeforeVat = subtotalParts + subtotalLabor + subtotalPaintMaterials + subtotalSublet + subtotalOther + subtotalSpecial;
  const vatPercentage = estimate.vat_rate_percentage || 0;
  const totalVat = totalBeforeVat * (vatPercentage / 100);
  const totalAmount = totalBeforeVat + totalVat;

  return {
    subtotal_parts: Number(subtotalParts.toFixed(2)),
    subtotal_labor: Number(subtotalLabor.toFixed(2)),
    subtotal_paint_materials: Number(subtotalPaintMaterials.toFixed(2)),
    subtotal_sublet: Number(subtotalSublet.toFixed(2)),
    subtotal_other: Number(subtotalOther.toFixed(2)),
    subtotal_special: Number(subtotalSpecial.toFixed(2)),
    total_before_vat: Number(totalBeforeVat.toFixed(2)),
    total_vat: Number(totalVat.toFixed(2)),
    total_amount: Number(totalAmount.toFixed(2)),
  };
}

/**
 * Validate numeric input for calculations
 */
export function validateNumericInput(value: any): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) {
    return 0;
  }
  
  return Math.max(0, num); // Ensure non-negative
}

/**
 * Round to 2 decimal places for consistent formatting
 */
export function roundToTwoDecimals(value: number): number {
  return Number(value.toFixed(2));
}

/**
 * Check if totals have meaningful differences (avoid floating point precision issues)
 */
export function totalsHaveChanged(
  oldTotals: CalculatedTotals,
  newTotals: CalculatedTotals,
  threshold: number = 0.01
): boolean {
  const keys: (keyof CalculatedTotals)[] = [
    'subtotal_parts',
    'subtotal_labor', 
    'subtotal_paint_materials',
    'subtotal_sublet',
    'subtotal_other',
    'subtotal_special',
    'total_before_vat',
    'total_vat',
    'total_amount'
  ];

  return keys.some(key => 
    Math.abs(oldTotals[key] - newTotals[key]) >= threshold
  );
}