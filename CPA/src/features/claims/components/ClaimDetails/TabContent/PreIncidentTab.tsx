"use client";

import { type ClaimDetails } from '@/lib/api/domains/claims/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileQuestion } from 'lucide-react';

interface PreIncidentTabProps {
  claim: ClaimDetails;
}

export function PreIncidentTab({ claim }: PreIncidentTabProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Pre-Incident Condition</h2>
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Condition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No pre-incident data available</h3>
            <p className="text-muted-foreground mt-2">
              Pre-incident condition reporting will be implemented in a future update.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 