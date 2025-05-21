"use client";

import { InspectionForm } from "@/components/inspection/InspectionForm";
import { useClaimFullDetails } from "@/lib/api/domains/claims/hooks";
import { useVehicle } from "@/lib/api/domains/vehicles/hooks";
import { useInspectionsByClaim } from "@/lib/api/domains/inspections/hooks";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface InspectionFormWrapperProps {
  claimId: string;
}

export function InspectionFormWrapper({ claimId }: InspectionFormWrapperProps) {
  // Use the DAL hooks to access prefetched data
  const { data: claim, isLoading: isLoadingClaim } = useClaimFullDetails(claimId);
  const { data: vehicle, isLoading: isLoadingVehicle } = useVehicle(claim?.vehicle_id || "");
  const { data: existingInspections } = useInspectionsByClaim(claimId);

  if (isLoadingClaim || isLoadingVehicle) {
    return <div>Loading...</div>;
  }

  if (!claim || !vehicle) {
    return <div>Claim or vehicle data not found</div>;
  }

  const fallback = (
    <div className="p-4 border border-red-200 rounded-md bg-red-50">
      <div className="flex items-center gap-2 text-red-600 mb-2">
        <AlertCircle className="h-5 w-5" />
        <h3 className="font-medium">Error loading inspection form</h3>
      </div>
      <p className="text-sm text-red-600 mb-4">
        There was an error loading the inspection form. Please try again.
      </p>
      <Button variant="outline" onClick={() => window.location.reload()}>
        Reload page
      </Button>
    </div>
  );

  return (
    <ErrorBoundary fallback={fallback}>
      <InspectionForm
        claimId={claimId}
        vehicleId={vehicle.id}
        existingInspection={existingInspections?.[0]}
      />
    </ErrorBoundary>
  );
}
