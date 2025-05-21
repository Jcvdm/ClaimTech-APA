"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardList } from "lucide-react";
import { useEstimate, useCreateEstimate } from "@/lib/api/domains/estimates/hooks";
import { EstimateForm } from "./EstimateForm";
import { EditableEstimateLinesTable } from "./EditableEstimateLinesTable";
import { EstimateSummary } from "./EstimateSummary";
import { SyncStatusIndicator } from "@/components/ui/SyncStatusIndicator";

export function EstimateTabContent() {
  const { id: claimId } = useParams();
  const { data: estimate, isLoading, refetch } = useEstimate(claimId as string);
  const createEstimate = useCreateEstimate();
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Function to handle cancellation or completion of the form
  const handleFormClose = () => {
    setShowCreateForm(false);
    // Explicitly refetch the estimate data to ensure we have the latest
    refetch();
  };

  if (isLoading) {
    return (
      <>
        <SyncStatusIndicator />
        <div>Loading estimate data...</div>
      </>
    );
  }

  if (!estimate && !showCreateForm) {
    return (
      <>
        <SyncStatusIndicator />
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Repair Estimate</h2>
          <Card>
            <CardHeader>
              <CardTitle>Create Estimate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No estimate has been created for this claim yet.</h3>
                <p className="text-muted-foreground mt-2 mb-4">
                  Create an estimate to add repair lines and calculate costs.
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Estimate
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (showCreateForm) {
    return (
      <>
        <SyncStatusIndicator />
        <EstimateForm claimId={claimId as string} onCancel={handleFormClose} />
      </>
    );
  }

  return (
    <>
      <SyncStatusIndicator />
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Repair Estimate</h2>

        {/* Estimate Lines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Estimate Lines</CardTitle>
          </CardHeader>
          <CardContent>
            <EditableEstimateLinesTable estimate={estimate} />
          </CardContent>
        </Card>

        {/* Estimate Summary */}
        <EstimateSummary estimate={estimate} />
      </div>
    </>
  );
}
