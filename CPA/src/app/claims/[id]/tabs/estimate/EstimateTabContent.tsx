"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardList } from "lucide-react";
import { useEstimate, useCreateEstimate } from "@/lib/api/domains/estimates/hooks";
import { useEstimatePrefetching } from "@/lib/api/domains/estimates/estimateCache";
import { EstimateForm } from "./EstimateForm";
import { EstimateLineItemsContainer } from "@/components/estimate/EstimateLineItemsContainer";
import { EstimateErrorBoundary } from "@/components/estimate/error/EstimateErrorBoundary";
import { NotificationContainer } from "@/components/estimate/error/NotificationContainer";
import { useErrorNotifications } from "@/components/estimate/error/ErrorNotification";
import { SessionRecoveryBoundary } from "@/components/estimate/error/SessionRecoveryBoundary";
import { CacheFailureBoundary } from "@/components/estimate/error/CacheFailureBoundary";
import { EstimateSummary } from "./EstimateSummary";
import { SyncStatusIndicator } from "@/components/ui/SyncStatusIndicator";

export function EstimateTabContent() {
  const { id: claimId } = useParams();
  const { data: estimate, isLoading, refetch } = useEstimate(claimId as string);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // DAL prefetching - simplified initialization
  const { prefetchForEstimateTab, markSessionActive, markSessionInactive } = useEstimatePrefetching();

  // Single useEffect for DAL initialization and session management
  useEffect(() => {
    if (claimId && typeof claimId === 'string') {
      console.log('[EstimateTabContent] Initializing DAL for claim:', claimId);
      prefetchForEstimateTab(claimId, { priority: true });
      
      if (estimate?.id) {
        markSessionActive(estimate.id);
        return () => markSessionInactive(estimate.id);
      }
    }
  }, [claimId, estimate?.id]); // Removed function dependencies that cause infinite loop
  
  // Error notifications
  const { notifications, removeNotification, addError } = useErrorNotifications();

  // Simplified form close handler
  const handleFormClose = () => {
    setShowCreateForm(false);
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

        {/* Estimate Lines - New Modular Component with Enhanced Error Boundaries */}
        <SessionRecoveryBoundary
          estimateId={estimate.id}
          claimId={claimId as string}
        >
          <CacheFailureBoundary
            estimateId={estimate.id}
            claimId={claimId as string}
          >
            <EstimateErrorBoundary
              onError={(error, errorInfo) => {
                console.error('Estimate component error:', error, errorInfo);
                addError('Component Error', `An error occurred: ${error.message}`);
              }}
            >
              <EstimateLineItemsContainer
                estimate={estimate}
                claimId={claimId as string}
                readonly={false}
                maxRows={1000}
                enableBulkActions={true}
                enableKeyboardNavigation={true}
              />
            </EstimateErrorBoundary>
          </CacheFailureBoundary>
        </SessionRecoveryBoundary>

        {/* Estimate Summary with Live Totals */}
        <EstimateSummary 
          estimate={estimate} 
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
