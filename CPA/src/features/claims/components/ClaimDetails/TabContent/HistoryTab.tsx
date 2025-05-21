"use client";

// src/features/claims/components/ClaimDetails/TabContent/HistoryTab.tsx
import { type ClaimDetails } from '@/lib/api/domains/claims/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { History } from 'lucide-react';

interface HistoryTabProps {
  claim: ClaimDetails;
}

export function HistoryTab({ claim }: HistoryTabProps) {
  // Format created date
  const formattedCreatedDate = claim.created_at
    ? format(new Date(claim.created_at), 'PPP')
    : 'Unknown';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">History</h2>

      {/* Basic claim creation info */}
      <Card>
        <CardHeader>
          <CardTitle>Claim Creation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 border-l-2 border-primary pl-4 pb-4">
              <div className="flex-1">
                <p className="font-medium">Claim Created</p>
                <p className="text-sm text-muted-foreground">
                  {formattedCreatedDate}
                </p>
                <p className="text-sm mt-1">
                  Claim was created with status: {claim.status}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col items-center justify-center py-8 text-center">
        <History className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">History tab is under development</h3>
        <p className="text-muted-foreground mt-2">
          The complete history functionality will be implemented in a future update.
          Activity logs can be found on the Overview tab.
        </p>
      </div>
    </div>
  );
}
