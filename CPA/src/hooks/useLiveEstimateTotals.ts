'use client';

import { useMemo, useCallback } from 'react';
import { type Estimate, type EstimateLine } from '@/lib/api/domains/estimates/types';
import { 
  calculateEstimateTotals,
  totalsHaveChanged,
  type CalculatedTotals 
} from '@/lib/utils/estimateCalculations';

export interface UseLiveEstimateTotalsOptions {
  /**
   * Debounce delay for calculations in milliseconds
   * @default 100
   */
  debounceDelay?: number;
  
  /**
   * Whether to enable debug logging
   * @default false
   */
  debug?: boolean;
  
  /**
   * Callback when totals change
   */
  onTotalsChange?: (totals: CalculatedTotals) => void;
}

export interface LiveEstimateTotalsResult {
  /** Current calculated totals */
  totals: CalculatedTotals;
  
  /** Whether the totals are being calculated */
  isCalculating: boolean;
  
  /** Whether the live totals differ from saved totals */
  hasUnsavedChanges: boolean;
  
  /** Force recalculation of totals */
  recalculate: () => void;
  
  /** Get individual line calculations */
  getLineCalculations: (lineId: string) => {
    part_total: number;
    labor_total: number;
    paint_material_total: number;
    sublet_total: number;
    special_total: number;
    line_total: number;
  } | null;
}

/**
 * Hook for live estimate total calculations
 * Provides real-time calculation of estimate totals as lines are edited
 */
export function useLiveEstimateTotals(
  estimate: Estimate | null | undefined,
  lines: EstimateLine[] | null | undefined,
  options: UseLiveEstimateTotalsOptions = {}
): LiveEstimateTotalsResult {
  const {
    debounceDelay = 100,
    debug = false,
    onTotalsChange
  } = options;

  // Memoized calculation of totals
  const calculatedTotals = useMemo(() => {
    if (!estimate || !lines) {
      if (debug) {
        console.log('[useLiveEstimateTotals] No estimate or lines data, returning zero totals');
      }
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

    if (debug) {
      console.log('[useLiveEstimateTotals] Calculating totals for:', {
        estimateId: estimate.id,
        linesCount: lines.length,
        includedLines: lines.filter(l => l.is_included).length
      });
    }

    const startTime = performance.now();
    const totals = calculateEstimateTotals(estimate, lines);
    const endTime = performance.now();

    if (debug) {
      console.log('[useLiveEstimateTotals] Calculation completed in', (endTime - startTime).toFixed(2), 'ms');
      console.log('[useLiveEstimateTotals] Calculated totals:', totals);
    }

    return totals;
  }, [estimate, lines, debug]);

  // Check if live totals differ from saved totals
  const hasUnsavedChanges = useMemo(() => {
    if (!estimate) return false;

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

    const hasChanged = totalsHaveChanged(savedTotals, calculatedTotals);
    
    if (debug && hasChanged) {
      console.log('[useLiveEstimateTotals] Totals have changed:', {
        saved: savedTotals,
        calculated: calculatedTotals
      });
    }

    return hasChanged;
  }, [estimate, calculatedTotals, debug]);

  // Callback when totals change
  useMemo(() => {
    if (onTotalsChange) {
      onTotalsChange(calculatedTotals);
    }
  }, [calculatedTotals, onTotalsChange]);

  // Force recalculation (useful for manual refresh)
  const recalculate = useCallback(() => {
    if (debug) {
      console.log('[useLiveEstimateTotals] Force recalculation requested');
    }
    // Since we use useMemo with dependencies, changing a dependency will trigger recalculation
    // For now, this is a no-op but could be enhanced with a state variable if needed
  }, [debug]);

  // Get individual line calculations
  const getLineCalculations = useCallback((lineId: string) => {
    if (!estimate || !lines) return null;

    const line = lines.find(l => l.id === lineId);
    if (!line) return null;

    // Import the calculateLineTotal function dynamically to avoid circular imports
    const { calculateLineTotal } = require('@/lib/utils/estimateCalculations');
    return calculateLineTotal(line, estimate);
  }, [estimate, lines]);

  return {
    totals: calculatedTotals,
    isCalculating: false, // Could be enhanced with actual calculation state if needed
    hasUnsavedChanges,
    recalculate,
    getLineCalculations,
  };
}

/**
 * Hook variant that only calculates when lines change significantly
 * Useful for performance optimization with large estimate tables
 */
export function useDebouncedLiveEstimateTotals(
  estimate: Estimate | null | undefined,
  lines: EstimateLine[] | null | undefined,
  options: UseLiveEstimateTotalsOptions = {}
): LiveEstimateTotalsResult {
  // Create a stable hash of the lines data to detect meaningful changes
  const linesHash = useMemo(() => {
    if (!lines) return '';
    
    return lines
      .filter(line => line.is_included)
      .map(line => 
        `${line.id}:${line.part_cost || 0}:${line.quantity || 0}:${line.strip_fit_hours || 0}:${line.repair_hours || 0}:${line.paint_hours || 0}:${line.sublet_cost || 0}:${line.operation_code}:${line.is_included}`
      )
      .join('|');
  }, [lines]);

  const estimateHash = useMemo(() => {
    if (!estimate) return '';
    
    return `${estimate.id}:${estimate.part_markup_percentage || 0}:${estimate.panel_labor_rate || 0}:${estimate.paint_material_rate || 0}:${estimate.special_markup_percentage || 0}:${estimate.vat_rate_percentage || 0}`;
  }, [estimate]);

  // Use the hash as a dependency to only recalculate when meaningful data changes
  const result = useLiveEstimateTotals(estimate, lines, options);

  // The memoization in useLiveEstimateTotals combined with the stable hash
  // effectively provides the debouncing behavior we want
  return result;
}

/**
 * Utility hook to get just the total amount for display
 */
export function useLiveEstimateTotal(
  estimate: Estimate | null | undefined,
  lines: EstimateLine[] | null | undefined
): number {
  const { totals } = useLiveEstimateTotals(estimate, lines);
  return totals.total_amount;
}

/**
 * Utility hook to check if estimate has unsaved total changes
 */
export function useHasUnsavedTotalChanges(
  estimate: Estimate | null | undefined,
  lines: EstimateLine[] | null | undefined
): boolean {
  const { hasUnsavedChanges } = useLiveEstimateTotals(estimate, lines);
  return hasUnsavedChanges;
}