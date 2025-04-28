import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ClaimDetails, type ClaimSummary } from "@/lib/api/domains/claims/types";
import { type Vehicle } from "@/lib/api/domains/vehicles/types";

interface VehicleTabProps {
  claimData: {
    details?: ClaimDetails | null;
    summary?: ClaimSummary | null;
  };
  vehicleData?: Vehicle | null;
}

export default function VehicleTab({ claimData, vehicleData }: VehicleTabProps) {
  // Use details if available, otherwise fall back to summary
  const data = claimData.details || claimData.summary;
  
  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Vehicle Details</h2>
        <p className="text-muted-foreground">No claim data available</p>
      </div>
    );
  }

  // Use vehicleData if available, otherwise use the vehicle data from the claim
  const vehicle = vehicleData || data.vehicle;

  if (!vehicle) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Vehicle Details</h2>
        <p className="text-muted-foreground">No vehicle data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Vehicle Details</h2>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Vehicle Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Make</p>
              <p>{vehicle.make || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Model</p>
              <p>{vehicle.model || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Registration Number</p>
              <p>{vehicle.registration_number || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Year</p>
              <p>{(vehicle as any).year || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Color</p>
              <p>{(vehicle as any).color || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">VIN</p>
              <p>{(vehicle as any).vin || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Engine Number</p>
              <p>{(vehicle as any).engine_number || 'Not specified'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {((vehicle as any).owner_name || (vehicle as any).owner_contact) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Owner Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Owner Name</p>
                <p>{(vehicle as any).owner_name || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Owner Contact</p>
                <p>{(vehicle as any).owner_contact || 'Not specified'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
