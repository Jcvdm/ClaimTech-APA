"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { type Estimate, type EstimateLine } from "@/lib/api/domains/estimates/types";
import { useLiveEstimateTotals } from "@/hooks/useLiveEstimateTotals";
import { useEstimateSessionStore } from "@/stores/estimateSessionStore";

// Note: This component uses DAL through the session store (useEstimateSessionStore)
// No direct tRPC calls needed - all data comes through the DAL session management

interface EstimateSummaryProps {
  estimate: Estimate;
  liveLines?: EstimateLine[] | null;
  showLiveIndicator?: boolean;
}

export function EstimateSummary({ 
  estimate, 
  liveLines, 
  showLiveIndicator = true 
}: EstimateSummaryProps) {
  // Get display lines directly from session store if this is the active estimate
  const { currentEstimateId, getDisplayLines, hasUnsavedChanges } = useEstimateSessionStore();
  
  // Use provided liveLines, or get from session store if active, or fallback to empty
  const linesToUse = liveLines || 
    (currentEstimateId === estimate.id ? getDisplayLines() : []);
  
  // Get live totals when live lines are available
  const { totals: liveTotals } = useLiveEstimateTotals(
    estimate, 
    linesToUse, 
    { debug: false }
  );
  
  // Check if we have unsaved changes for this estimate
  const hasLocalUnsavedChanges = currentEstimateId === estimate.id ? hasUnsavedChanges() : false;

  // Use live totals if available, otherwise fall back to saved estimate totals
  const displayTotals = linesToUse ? liveTotals : {
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

  // Debug logging
  console.log('[EstimateSummary] Rendering with:', {
    estimateId: estimate.id,
    hasLiveLines: !!liveLines,
    liveLineCount: linesToUse?.length || 0,
    hasLocalUnsavedChanges,
    displayTotalAmount: displayTotals.total_amount,
    liveTotalAmount: liveTotals.total_amount,
    savedTotalAmount: estimate.total_amount || 0,
  });

  // Format number as plain decimal without locale formatting
  const formatNumber = (amount: number | null | undefined, decimals = 2) => {
    if (amount === null || amount === undefined) return "0.00";
    return amount.toFixed(decimals);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Estimate Summary</CardTitle>
          {liveLines && showLiveIndicator && (
            <div className="flex items-center gap-2">
              {hasLocalUnsavedChanges && (
                <Badge variant="secondary" className="text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Rates</h3>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Labor Rate (per hour):</span>
                  <span>{formatNumber(estimate.panel_labor_rate, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paint Material Rate (per panel, no markup):</span>
                  <span>{formatNumber(estimate.paint_material_rate, 2)}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Markup & VAT</h3>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <span>VAT Rate:</span>
                  <span>{estimate.vat_rate_percentage}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Part Markup (only on parts):</span>
                  <span>{estimate.part_markup_percentage || 25}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Special Services Markup:</span>
                  <span>{estimate.special_markup_percentage || 25}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t pt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Cost Breakdown</h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Parts:</span>
                <span>{formatNumber(displayTotals.subtotal_parts)}</span>
              </div>
              <div className="flex justify-between">
                <span>Labor:</span>
                <span>{formatNumber(displayTotals.subtotal_labor)}</span>
              </div>
              <div className="flex justify-between">
                <span>Paint Materials:</span>
                <span>{formatNumber(displayTotals.subtotal_paint_materials)}</span>
              </div>
              <div className="flex justify-between">
                <span>Sublet:</span>
                <span>{formatNumber(displayTotals.subtotal_sublet)}</span>
              </div>
              <div className="flex justify-between">
                <span>Special Services:</span>
                <span>{formatNumber(displayTotals.subtotal_special)}</span>
              </div>
              <div className="flex justify-between">
                <span>Other:</span>
                <span>{formatNumber(displayTotals.subtotal_other)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 border-t pt-4">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatNumber(displayTotals.total_before_vat)}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT ({estimate.vat_rate_percentage}%):</span>
                <span>{formatNumber(displayTotals.total_vat)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span className={liveLines && hasLocalUnsavedChanges ? "text-blue-600 font-semibold" : ""}>
                  {formatNumber(displayTotals.total_amount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
