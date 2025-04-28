'use client';

import { useClaimFullDetails } from "@/lib/api/domains/claims";
import { ClaimStatus } from "@/lib/api/domains/claims/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusUpdate } from "./status-update";
import { DeleteClaimButton } from "../delete-claim-button";

export function ClaimDetails({ claimId }: { claimId: string }) {
  // Validate UUID format client-side as well
  const isValidUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  // Only fetch if ID is valid
  const isValidId = claimId && isValidUUID(claimId);

  // Use our orchestrated query hook
  const { data: claim, isLoading, isError, error } = useClaimFullDetails(claimId);

  if (isLoading) {
    return <p>Loading claim details...</p>;
  }

  if (isError) {
    return <p className="text-destructive">Error: {error?.message || "Failed to load claim"}</p>;
  }

  if (!claim) {
    return <p>Claim not found</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Job #{claim?.job_number ?? 'N/A'}</h2>
          <p className="text-muted-foreground">Reference: {claim?.client_reference ?? "N/A"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{claim?.status ?? 'Unknown'}</Badge>
          <StatusUpdate claimId={claimId} currentStatus={(claim?.status as ClaimStatus) ?? ClaimStatus.NEW} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Name:</strong> {claim?.client_name ?? 'No client information available'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehicle Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <strong>Make/Model:</strong> {claim?.vehicle_make && claim?.vehicle_model
                  ? `${claim.vehicle_make} ${claim.vehicle_model}`
                  : 'N/A'}
              </p>
              <p><strong>Registration:</strong> {claim?.vehicle_registration ?? "N/A"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional claim details would go here */}

      <div className="flex justify-end">
        <DeleteClaimButton claimId={claimId} claimNumber={claim?.job_number ?? ''} />
      </div>
    </div>
  );
}
