"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardList } from "lucide-react";
import { useEstimate, useCreateEstimate, useEstimateLines } from "@/lib/api/domains/estimates/hooks";
import { EstimateForm } from "./EstimateForm";
import { EstimateLineItemsContainer } from "@/components/estimate/EstimateLineItemsContainer";
import { EstimateErrorBoundary } from "@/components/estimate/error/EstimateErrorBoundary";
import { NotificationContainer } from "@/components/estimate/error/NotificationContainer";
import { useErrorNotifications } from "@/components/estimate/error/ErrorNotification";
import { EstimateSummary } from "./EstimateSummary";
import { SyncStatusIndicator } from "@/components/ui/SyncStatusIndicator";

export function EstimateTabContent() {
  const { id: claimId } = useParams();
  const { data: estimate, isLoading, refetch } = useEstimate(claimId as string);
  const createEstimate = useCreateEstimate();
  const [showCreateForm, setShowCreateForm] = useState(false);

  // State for live estimate lines (updated as user edits)
  const [liveEstimateLines, setLiveEstimateLines] = useState<EstimateLine[]>([]);

  // Fetch estimate lines for initial data
  const { data: estimateLines = [] } = useEstimateLines(
    estimate?.id || "", 
    { enabled: !!estimate?.id }
  );

  // Initialize live lines when server data loads
  useEffect(() => {
    if (estimateLines.length > 0 && liveEstimateLines.length === 0) {
      console.log("[EstimateTabContent] Initializing live lines with server data:", estimateLines.length);
      setLiveEstimateLines(estimateLines);
    }
  }, [estimateLines, liveEstimateLines.length]);
  
  // Error notifications for the estimate functionality
  const {
    notifications,
    removeNotification,
    addError,
    addSuccess,
    addWarning
  } = useErrorNotifications();

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

        {/* Estimate Lines - New Modular Component */}
        <EstimateErrorBoundary
          onError={(error, errorInfo) => {
            console.error('Estimate component error:', error, errorInfo);
            addError('Component Error', `An error occurred: ${error.message}`);
          }}
        >
          <EstimateLineItemsContainer
            estimate={estimate}
            readonly={false}
            maxRows={1000}
            enableBulkActions={true}
            enableKeyboardNavigation={true}
            onSelectionChange={(selectedIds) => {
              console.log('Selection changed:', selectedIds);
            }}
            onLinesChange={(lines) => {
              console.log('[EstimateTabContent] Received live lines update:', lines.length);
              setLiveEstimateLines(lines);
            }}
          />
        </EstimateErrorBoundary>

        {/* Estimate Summary with Live Totals */}
        <EstimateSummary 
          estimate={estimate} 
          liveLines={liveEstimateLines}
          showLiveIndicator={true}
        />
      </div>
      
      {/* Global notifications for estimate operations */}
      <NotificationContainer
        notifications={notifications}
        onClose={removeNotification}
        position="top-right"
        maxNotifications={3}
      />
    </>
  );
}
