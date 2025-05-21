"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Estimate } from "@/lib/api/domains/estimates/types";

interface EstimateSummaryProps {
  estimate: Estimate;
}

export function EstimateSummary({ estimate }: EstimateSummaryProps) {
  // Format number with decimal places
  const formatNumber = (amount: number | null | undefined, decimals = 2) => {
    if (amount === null || amount === undefined) return "0.00";
    return new Intl.NumberFormat('en-GB', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimate Summary</CardTitle>
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
                <span>{formatNumber(estimate.subtotal_parts)}</span>
              </div>
              <div className="flex justify-between">
                <span>Labor:</span>
                <span>{formatNumber(estimate.subtotal_labor)}</span>
              </div>
              <div className="flex justify-between">
                <span>Paint Materials:</span>
                <span>{formatNumber(estimate.subtotal_paint_materials)}</span>
              </div>
              <div className="flex justify-between">
                <span>Sublet:</span>
                <span>{formatNumber(estimate.subtotal_sublet)}</span>
              </div>
              <div className="flex justify-between">
                <span>Special Services:</span>
                <span>{formatNumber(estimate.subtotal_special || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Other:</span>
                <span>{formatNumber(estimate.subtotal_other)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 border-t pt-4">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatNumber(estimate.total_before_vat)}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT ({estimate.vat_rate_percentage}%):</span>
                <span>{formatNumber(estimate.total_vat)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>{formatNumber(estimate.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
