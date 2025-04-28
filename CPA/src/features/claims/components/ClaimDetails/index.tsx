"use client";

// src/features/claims/components/ClaimDetails/index.tsx
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useClaimFullDetails } from '@/lib/api/domains/claims';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClaimTabs, type ClaimTabValue } from '../../hooks/useClaimTabs';
import { Skeleton } from '@/components/ui/skeleton';
import { TabNavigation } from './TabNavigation';
import { SummaryTab } from './TabContent/SummaryTab';
// AppointmentTab has been moved to the App Router structure
import { InspectionTab } from './TabContent/InspectionTab';
import { ThreeSixtyTab } from './TabContent/ThreeSixtyTab';
import { EstimateTab } from './TabContent/EstimateTab';
import { PreIncidentTab } from './TabContent/PreIncidentTab';
import { HistoryTab } from './TabContent/HistoryTab';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface ClaimDetailsProps {
  id: string;
}

export function ClaimDetails({ id }: ClaimDetailsProps) {
  // Server-side prefetching now handles data loading

  // Use the hook directly. It will fetch if data is not cached or stale.
  // Prefetching should happen *before* navigating here (e.g., on hover/click in list).
  const { data: claim, isLoading, isError, error } = useClaimFullDetails(id, {
    // Keep staleTime/gcTime consistent if needed, but rely on hook defaults mostly
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    // Let the hook handle refetching logic based on cache status and staleTime
  });

  // Tab state
  const { activeTab, changeTab } = useClaimTabs();

  // If loading, show skeleton UI
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton key="skeleton-header" className="h-8 w-1/3" />
        <Skeleton key="skeleton-tabs" className="h-10 w-full" />
        <Skeleton key="skeleton-content" className="h-[400px] w-full" />
      </div>
    );
  }

  // If error, show error message
  if (isError || !claim) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error?.message || 'Failed to load claim details'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => changeTab(value as ClaimTabValue)}>
        <TabNavigation activeTab={activeTab} />

        <TabsContent value="summary" className="mt-6">
          <SummaryTab claim={claim} />
        </TabsContent>

        <TabsContent value="appointment" className="mt-6">
          {/* AppointmentTab has been moved to the App Router structure */}
          <div className="p-4 border rounded-md bg-muted/50">
            <p className="text-center text-muted-foreground">
              Appointment functionality has been moved to the App Router structure.
              Please use the new implementation at /claims/[id]/tabs/appointments.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="inspection" className="mt-6">
          <InspectionTab claim={claim} />
        </TabsContent>

        <TabsContent value="360" className="mt-6">
          <ThreeSixtyTab claim={claim} />
        </TabsContent>

        <TabsContent value="estimate" className="mt-6">
          <EstimateTab claim={claim} />
        </TabsContent>

        <TabsContent value="pre-incident" className="mt-6">
          <PreIncidentTab claim={claim} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <HistoryTab claim={claim} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

