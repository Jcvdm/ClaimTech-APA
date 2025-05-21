"use client";

import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle, Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ClaimStatus } from '@/lib/api/domains/claims/types';
import { Badge } from '@/components/ui/badge';
// Import from claims domain for backward compatibility
import { useRecordInspection } from '@/lib/api/domains/claims/hooks';

interface InspectionHeaderProps {
  claimId: string;
  claimStatus: string | null;
  inspectionDateTime: string | null;
  onInspectionDateTimeChange: (dateTime: string | null) => void;
}

export function InspectionHeader({
  claimId,
  claimStatus,
  inspectionDateTime,
  onInspectionDateTimeChange
}: InspectionHeaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const recordInspection = useRecordInspection();

  const handleStartInspection = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      // Use id parameter for backward compatibility with claims domain
      const result = await recordInspection.mutateAsync({
        id: claimId,
        inspection_datetime: now
      });
      onInspectionDateTimeChange(result.inspection_datetime || null);
    } catch (error) {
      console.error("Error recording inspection:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if inspection has already been done based on status or inspection date
  const hasInspectionData = inspectionDateTime ||
    (claimStatus === ClaimStatus.IN_PROGRESS ||
     claimStatus === ClaimStatus.REPORT_SENT ||
     claimStatus === ClaimStatus.AUTHORIZED);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-4 w-4 text-muted-foreground mr-2 animate-spin" />
            <span className="text-sm">Recording inspection...</span>
          </div>
        ) : hasInspectionData ? (
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Inspection Completed</span>
                  <Badge variant="outline" className="ml-2">
                    {claimStatus || "In Progress"}
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
            <div className="flex gap-2">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
