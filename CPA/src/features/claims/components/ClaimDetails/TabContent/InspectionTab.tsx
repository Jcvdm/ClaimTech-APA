"use client";

import { type ClaimDetails } from '@/lib/api/domains/claims/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search } from 'lucide-react';

interface InspectionTabProps {
  claim: ClaimDetails;
}

export function InspectionTab({ claim }: InspectionTabProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Inspection Details</h2>
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Inspection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No inspection data available</h3>
            <p className="text-muted-foreground mt-2">
              Inspection functionality will be implemented in a future update.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}