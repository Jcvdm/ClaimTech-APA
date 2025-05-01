"use client";

import { useState } from "react";
import { type ClaimDetails, ClaimStatus } from '@/lib/api/domains/claims/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Search, Calendar, CheckCircle, Loader2, ClipboardCheck } from 'lucide-react';
import { useRecordInspection } from "@/lib/api/domains/inspections/hooks";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface InspectionTabProps {
  claim: ClaimDetails;
}

export function InspectionTab({ claim }: InspectionTabProps) {
  const recordInspection = useRecordInspection();
  const [isLoading, setIsLoading] = useState(false);
  const [inspectionDateTime, setInspectionDateTime] = useState<string | null>(
    claim.inspection_datetime || null
  );

  const handleStartInspection = async () => {
    if (!claim.id) return;

    setIsLoading(true);
    try {
      const now = new Date();
      const result = await recordInspection.mutateAsync({
        claim_id: claim.id,
        inspection_datetime: now
      });
      setInspectionDateTime(result.inspection_datetime || null);
    } catch (error) {
      console.error("Error recording inspection:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasInspectionData = inspectionDateTime ||
    (claim.status === ClaimStatus.IN_PROGRESS ||
     claim.status === ClaimStatus.REPORT_SENT ||
     claim.status === ClaimStatus.AUTHORIZED);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {hasInspectionData ? (
            <div className="flex items-center p-4">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Inspection Completed</span>
                  <Badge variant="outline" className="ml-2">
                    {claim.status || "In Progress"}
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