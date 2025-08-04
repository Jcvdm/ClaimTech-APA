// src/lib/utils/estimateCalculationsDebug.ts
import { type Estimate, type EstimateLine } from '@/lib/api/domains/estimates/types';
import { 
  calculateEstimateTotals, 
  calculateLineTotal,
  type CalculatedTotals 
} from './estimateCalculations';

/**
 * Debug utilities for estimate calculations
 * These functions help with testing and debugging the calculation logic
 */

export interface CalculationDebugInfo {
  estimate: Estimate;
  lines: EstimateLine[];
  includedLinesCount: number;
  totalLinesCount: number;
  calculationTime: number;
  totals: CalculatedTotals;
  lineBreakdown: Array<{
    lineId: string;
    description: string;
    partTotal: number;
    laborTotal: number;
    paintMaterialTotal: number;
    subletTotal: number;
    specialTotal: number;
    lineTotal: number;
    isIncluded: boolean;
  }>;
}

/**
 * Generate comprehensive debug information for estimate calculations
 */
export function debugEstimateCalculations(
  estimate: Estimate,
  lines: EstimateLine[]
): CalculationDebugInfo {
  console.log('[debugEstimateCalculations] Starting calculation debug for estimate:', estimate.id);
  
  const startTime = performance.now();
  
  // Calculate totals
  const totals = calculateEstimateTotals(estimate, lines);
  
  const endTime = performance.now();
  const calculationTime = endTime - startTime;
  
  // Generate line-by-line breakdown
  const lineBreakdown = lines.map(line => {
    const lineCalc = calculateLineTotal(line, estimate);
    return {
      lineId: line.id,
      description: line.description || '(No description)',
      partTotal: lineCalc.part_total,
      laborTotal: lineCalc.labor_total,
      paintMaterialTotal: lineCalc.paint_material_total,
      subletTotal: lineCalc.sublet_total,
      specialTotal: lineCalc.special_total,
      lineTotal: lineCalc.line_total,
      isIncluded: line.is_included,
    };
  });
  
  const debugInfo: CalculationDebugInfo = {
    estimate,
    lines,
    includedLinesCount: lines.filter(l => l.is_included).length,
    totalLinesCount: lines.length,
    calculationTime,
    totals,
    lineBreakdown,
  };
  
  console.log('[debugEstimateCalculations] Debug info generated:', {
    estimateId: estimate.id,
    calculationTime: `${calculationTime.toFixed(2)}ms`,
    includedLines: debugInfo.includedLinesCount,
    totalLines: debugInfo.totalLinesCount,
    finalTotal: totals.total_amount,
  });
  
  return debugInfo;
}

/**
 * Compare client-side calculated totals with server-side saved totals
 */
export function compareCalculatedVsSavedTotals(
  estimate: Estimate,
  lines: EstimateLine[]
): {
  match: boolean;
  differences: Record<string, { calculated: number; saved: number; diff: number }>;
  calculatedTotals: CalculatedTotals;
  savedTotals: CalculatedTotals;
} {
  const calculatedTotals = calculateEstimateTotals(estimate, lines);
  
  const savedTotals: CalculatedTotals = {
    subtotal_parts: estimate.subtotal_parts || 0,
    subtotal_labor: estimate.subtotal_labor || 0,
    subtotal_paint_materials: estimate.subtotal_paint_materials || 0,
    subtotal_sublet: estimate.subtotal_sublet || 0,
    subtotal_other: estimate.subtotal_other || 0,
    subtotal_special: estimate.subtotal_special || 0,
    total_before_vat: estimate.total_before_vat || 0,
    total_vat: estimate.total_vat || 0,
    total_amount: estimate.total_amount || 0,
  };
  
  const keys: (keyof CalculatedTotals)[] = [
    'subtotal_parts',
    'subtotal_labor',
    'subtotal_paint_materials',
    'subtotal_sublet',
    'subtotal_other',
    'subtotal_special',
    'total_before_vat',
    'total_vat',
    'total_amount',
  ];
  
  const differences: Record<string, { calculated: number; saved: number; diff: number }> = {};
  let match = true;
  
  for (const key of keys) {
    const calculated = calculatedTotals[key];
    const saved = savedTotals[key];
    const diff = Math.abs(calculated - saved);
    
    if (diff > 0.01) { // More than 1 cent difference
      match = false;
      differences[key] = { calculated, saved, diff };
    }
  }
  
  console.log('[compareCalculatedVsSavedTotals] Comparison result:', {
    match,
    differenceCount: Object.keys(differences).length,
    differences,
  });
  
  return {
    match,
    differences,
    calculatedTotals,
    savedTotals,
  };
}

/**
 * Performance test for calculations with large numbers of lines
 */
export function performanceTestCalculations(
  estimate: Estimate,
  lineCount: number = 100
): {
  executionTime: number;
  linesPerSecond: number;
  memoryUsage?: number;
} {
  console.log(`[performanceTestCalculations] Starting performance test with ${lineCount} lines`);
  
  // Generate test lines
  const testLines: EstimateLine[] = [];
  for (let i = 0; i < lineCount; i++) {
    testLines.push({
      id: `test-line-${i}`,
      estimate_id: estimate.id,
      damage_id: null,
      sequence_number: i + 1,
      description: `Test line ${i + 1}`,
      operation_code: 'R' as any,
      part_type: 'D' as any,
      part_number: `PART-${i}`,
      part_cost: Math.random() * 1000,
      quantity: Math.floor(Math.random() * 5) + 1,
      strip_fit_hours: Math.random() * 2,
      repair_hours: Math.random() * 3,
      paint_hours: Math.random() * 1,
      sublet_cost: Math.random() * 500,
      is_included: true,
      line_notes: null,
      calculated_part_total: null,
      calculated_labor_total: null,
      calculated_paint_material_total: null,
      calculated_sublet_total: null,
      calculated_line_total: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }
  
  // Measure memory before (if available)
  const memoryBefore = (performance as any).memory?.usedJSHeapSize;
  
  // Time the calculation
  const startTime = performance.now();
  const totals = calculateEstimateTotals(estimate, testLines);
  const endTime = performance.now();
  
  // Measure memory after (if available)
  const memoryAfter = (performance as any).memory?.usedJSHeapSize;
  
  const executionTime = endTime - startTime;
  const linesPerSecond = (lineCount / executionTime) * 1000;
  const memoryUsage = memoryBefore && memoryAfter ? memoryAfter - memoryBefore : undefined;
  
  console.log('[performanceTestCalculations] Performance test results:', {
    lineCount,
    executionTime: `${executionTime.toFixed(2)}ms`,
    linesPerSecond: `${linesPerSecond.toFixed(0)} lines/sec`,
    memoryUsage: memoryUsage ? `${(memoryUsage / 1024).toFixed(2)}KB` : 'N/A',
    finalTotal: totals.total_amount,
  });
  
  return {
    executionTime,
    linesPerSecond,
    memoryUsage,
  };
}

/**
 * Validate calculation logic by testing edge cases
 */
export function validateCalculationLogic(): {
  passed: boolean;
  failedTests: string[];
  results: Record<string, any>;
} {
  console.log('[validateCalculationLogic] Running validation tests');
  
  const failedTests: string[] = [];
  const results: Record<string, any> = {};
  
  // Test estimate with default values
  const testEstimate: Estimate = {
    id: 'test-estimate',
    claim_id: 'test-claim',
    estimate_number: 'TEST-001',
    estimate_type: 'incident' as any,
    estimate_source: 'in_house' as any,
    status: 'draft' as any,
    version: 1,
    repairer_id: null,
    vat_rate_percentage: 15,
    panel_labor_rate: 100,
    part_markup_percentage: 25,
    paint_material_rate: 50,
    special_markup_percentage: 25,
    subtotal_parts: null,
    subtotal_labor: null,
    subtotal_paint_materials: null,
    subtotal_sublet: null,
    subtotal_other: null,
    subtotal_special: null,
    total_before_vat: null,
    total_vat: null,
    total_amount: null,
    notes: null,
    created_at: new Date(),
    updated_at: new Date(),
  };
  
  // Test 1: Empty lines array
  try {
    const emptyResult = calculateEstimateTotals(testEstimate, []);
    results.emptyLines = emptyResult;
    if (emptyResult.total_amount !== 0) {
      failedTests.push('Empty lines should result in zero total');
    }
  } catch (error) {
    failedTests.push(`Empty lines test failed: ${error}`);
  }
  
  // Test 2: Single part line
  try {
    const singlePartLine: EstimateLine = {
      id: 'test-1',
      estimate_id: 'test-estimate',
      damage_id: null,
      sequence_number: 1,
      description: 'Test part',
      operation_code: 'R' as any,
      part_type: 'D' as any,
      part_number: 'TEST-001',
      part_cost: 100,
      quantity: 2,
      strip_fit_hours: null,
      repair_hours: null,
      paint_hours: null,
      sublet_cost: null,
      is_included: true,
      line_notes: null,
      calculated_part_total: null,
      calculated_labor_total: null,
      calculated_paint_material_total: null,
      calculated_sublet_total: null,
      calculated_line_total: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    const partResult = calculateEstimateTotals(testEstimate, [singlePartLine]);
    results.singlePart = partResult;
    
    // Expected: 100 * 2 * 1.25 = 250 parts, 15% VAT = 37.5, total = 287.5
    if (Math.abs(partResult.subtotal_parts - 250) > 0.01) {
      failedTests.push('Single part calculation incorrect');
    }
  } catch (error) {
    failedTests.push(`Single part test failed: ${error}`);
  }
  
  // Test 3: Excluded line should not affect totals
  try {
    const excludedLine: EstimateLine = {
      ...results.singlePart ? {} as EstimateLine : {} as EstimateLine,
      id: 'test-excluded',
      estimate_id: 'test-estimate',
      damage_id: null,
      sequence_number: 2,
      description: 'Excluded line',
      operation_code: 'R' as any,
      part_type: 'D' as any,
      part_number: 'EXCLUDED',
      part_cost: 1000,
      quantity: 1,
      strip_fit_hours: null,
      repair_hours: null,
      paint_hours: null,
      sublet_cost: null,
      is_included: false, // This line is excluded
      line_notes: null,
      calculated_part_total: null,
      calculated_labor_total: null,
      calculated_paint_material_total: null,
      calculated_sublet_total: null,
      calculated_line_total: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    const excludedResult = calculateEstimateTotals(testEstimate, [excludedLine]);
    results.excludedLine = excludedResult;
    
    if (excludedResult.total_amount !== 0) {
      failedTests.push('Excluded lines should not affect totals');
    }
  } catch (error) {
    failedTests.push(`Excluded line test failed: ${error}`);
  }
  
  const passed = failedTests.length === 0;
  
  console.log('[validateCalculationLogic] Validation complete:', {
    passed,
    failedTestCount: failedTests.length,
    failedTests,
  });
  
  return {
    passed,
    failedTests,
    results,
  };
}

// Export for browser console debugging
if (typeof window !== 'undefined') {
  (window as any).estimateCalculationsDebug = {
    debugEstimateCalculations,
    compareCalculatedVsSavedTotals,
    performanceTestCalculations,
    validateCalculationLogic,
  };
}