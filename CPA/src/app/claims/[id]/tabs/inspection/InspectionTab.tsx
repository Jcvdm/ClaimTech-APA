"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Calendar, CheckCircle, Loader2, ClipboardCheck } from "lucide-react";
import { useClaimFullDetails } from "@/lib/api/domains/claims/hooks";
import { useRecordInspection, useInspectionsByClaim } from "@/lib/api/domains/inspections/hooks";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { ClaimStatus } from "@/lib/api/domains/claims/types";
import { Badge } from "@/components/ui/badge";
import { type Inspection } from "@/lib/api/domains/inspections/types";

interface InspectionTabProps {
  inspectionsData?: Inspection[];
}

export default function InspectionTab({ inspectionsData = [] }: InspectionTabProps) {
  const params = useParams();
  const claimId = params.id as string;
  const { data: claim, isLoading: isLoadingClaim } = useClaimFullDetails(claimId);
  const { data: inspections } = useInspectionsByClaim(claimId, {
    initialData: inspectionsData
  });
  const recordInspection = useRecordInspection();
  const [isLoading, setIsLoading] = useState(false);
  const [inspectionDateTime, setInspectionDateTime] = useState<string | null>(null);

  // Initialize the inspection date/time from the claim data when it loads
  useEffect(() => {
    if (claim?.inspection_datetime) {
      setInspectionDateTime(claim.inspection_datetime);
    }
  }, [claim?.inspection_datetime]);

  const handleStartInspection = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const result = await recordInspection.mutateAsync({
        claim_id: claimId,
        inspection_datetime: now
      });
      setInspectionDateTime(result.inspection_datetime || null);
    } catch (error) {
      console.error("Error recording inspection:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if inspection has already been done based on status or inspection date
  const hasInspectionData = inspectionDateTime ||
    (claim?.status === ClaimStatus.IN_PROGRESS ||
     claim?.status === ClaimStatus.REPORT_SENT ||
     claim?.status === ClaimStatus.AUTHORIZED);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoadingClaim ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 text-muted-foreground mr-2 animate-spin" />
              <span className="text-sm">Loading inspection data...</span>
            </div>
          ) : hasInspectionData ? (
            <div className="flex items-center p-4">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Inspection Completed</span>
                  <Badge variant="outline" className="ml-2">
                    {claim?.status || "In Progress"}
                  </Badge>
                </div>
                {inspectionDateTime && (
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    <span>{format(new Date(inspectionDateTime), "PPp")}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center">
                <Search className="h-5 w-5 text-muted-foreground mr-3" />
                <div>
                  <span className="font-medium">No inspection recorded</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    Record the current date and time as the inspection date
                  </p>
                </div>
              </div>
              <Button
                onClick={handleStartInspection}
                disabled={isLoading}
                size="sm"
                className="gap-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Recording...</span>
                  </>
                ) : (
                  <>
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Record Inspection</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
