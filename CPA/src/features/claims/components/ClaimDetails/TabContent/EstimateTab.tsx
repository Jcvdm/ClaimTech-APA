"use client";

import { type ClaimDetails } from '@/lib/api/domains/claims/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList } from 'lucide-react';

interface EstimateTabProps {
  claim: ClaimDetails;
}

export function EstimateTab({ claim }: EstimateTabProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Repair Estimate</h2>
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No estimate data available</h3>
            <p className="text-muted-foreground mt-2">
              Repair estimate functionality will be implemented in a future update.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 