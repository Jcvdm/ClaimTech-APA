'use client';

/**
 * TabContainer - Client-side tab navigation component
 *
 * IMPORTANT: This component intentionally does NOT update the URL when tabs are changed.
 * This is to prevent the server component (page.tsx) from re-rendering, which would
 * trigger unnecessary data prefetching. The initial tab is still read from the URL
 * on first load, but subsequent tab changes are handled entirely client-side.
 *
 * This approach ensures that once data is prefetched and cached, it remains available
 * without triggering new server-side prefetches when switching tabs.
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { HydrationBoundary, QueryClient, QueryClientProvider, dehydrate } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { CACHE_TIMES, QUERY_KEYS } from '@/lib/api/domains/claims/constants';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load the appointment tab skeleton for better performance
const AppointmentTabSkeleton = lazy(() => import('./tabs/appointments/components/AppointmentTabSkeleton'));

interface TabContainerProps {
  id: string;
  tabContents: {
    overview: React.ReactNode;
    appointment: React.ReactNode;
    inspection: React.ReactNode;
    threesixty: React.ReactNode;
    estimate: React.ReactNode;
    preincident: React.ReactNode;
  };
  initialData: {
    claim: any;
    appointments?: any;
    attachments?: any;
    vehicle?: any;
    client?: any;
  };
}

export default function TabContainer({ id, tabContents, initialData }: TabContainerProps) {
  // Create a client-side query client with extended cache times for active sessions
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: CACHE_TIMES.ACTIVE_SESSION.STALE_TIME, // 60 minutes - use active session time
          gcTime: CACHE_TIMES.ACTIVE_SESSION.GC_TIME, // 120 minutes - use active session time
          refetchOnWindowFocus: false, // Disable refetch on window focus
          refetchOnMount: false, // Disable refetch on mount
        },
      },
    });

    // Hydrate the query client with the initial data using both client-side and tRPC-compatible query keys
    if (initialData.claim?.details) {
      // Client-side query key
      client.setQueryData(
        ['claims', 'details', { id }],
        initialData.claim.details
      );

      // tRPC-compatible query key
      client.setQueryData(
        QUERY_KEYS.TRPC.DETAILS(id),
        initialData.claim.details
      );
    }

    if (initialData.claim?.summary) {
      // Client-side query key
      client.setQueryData(
        ['claims', 'summary', { id }],
        initialData.claim.summary
      );

      // tRPC-compatible query key
      client.setQueryData(
        QUERY_KEYS.TRPC.SUMMARY(id),
        initialData.claim.summary
      );
    }

    if (initialData.appointments) {
      // Client-side query key
      client.setQueryData(
        ['appointment', 'getByClaim', { claim_id: id }],
        initialData.appointments
      );

      // tRPC-compatible query key
      client.setQueryData(
        QUERY_KEYS.TRPC.APPOINTMENTS(id),
        initialData.appointments
      );
    }

    if (initialData.attachments) {
      // Client-side query key
      client.setQueryData(
        ['attachment', 'getByClaim', { claim_id: id }],
        initialData.attachments
      );

      // tRPC-compatible query key
      client.setQueryData(
        QUERY_KEYS.TRPC.ATTACHMENTS(id),
        initialData.attachments
      );
    }

    if (initialData.vehicle && initialData.claim?.details?.vehicle_id) {
      const vehicleId = initialData.claim.details.vehicle_id;

      // Client-side query key
      client.setQueryData(
        ['vehicle', 'getById', { id: vehicleId }],
        initialData.vehicle
      );

      // tRPC-compatible query key
      client.setQueryData(
        QUERY_KEYS.TRPC.VEHICLE(vehicleId),
        initialData.vehicle
      );
    }

    if (initialData.client && initialData.claim?.details?.client_id) {
      const clientId = initialData.claim.details.client_id;

      // Client-side query key
      client.setQueryData(
        ['client', 'getById', { id: clientId }],
        initialData.client
      );

      // tRPC-compatible query key
      client.setQueryData(
        QUERY_KEYS.TRPC.CLIENT(clientId),
        initialData.client
      );
    }

    return client;
  });

  // Get the current tab from the URL
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const validTabs = ['overview', 'appointment', 'inspection', 'threesixty', 'estimate', 'preincident'];
  const [activeTab, setActiveTab] = useState(
    tabParam && validTabs.includes(tabParam) ? tabParam : 'overview'
  );

  // Add loading state to track which tab is currently loading
  const [loadingTab, setLoadingTab] = useState<string | null>(null);

  // No need to simulate loading since we're using real data from the cache
  const simulateLoading = async (tab: string) => {
    // Return immediately without delay
    return Promise.resolve();
  };

  // Update the URL when the tab changes
  const handleTabChange = async (value: string) => {
    // Set loading state for the clicked tab
    setLoadingTab(value);

    // Update active tab immediately for better UX
    setActiveTab(value);

    // Log tab change
    console.log(`[TabContainer] Tab changed to: ${value}`);

    // Log cache state for the tab (both client-side and tRPC-compatible query keys)
    if (value === 'appointment') {
      const clientAppointmentsKey = ['appointment', 'getByClaim', { claim_id: id }];
      const trpcAppointmentsKey = QUERY_KEYS.TRPC.APPOINTMENTS(id);

      const clientCachedData = queryClient.getQueryData(clientAppointmentsKey);
      const trpcCachedData = queryClient.getQueryData(trpcAppointmentsKey);

      console.log(`[TabContainer] Appointments tab cache:`, {
        client: {
          hasCachedData: !!clientCachedData,
          dataSize: clientCachedData ? (Array.isArray(clientCachedData) ? clientCachedData.length : 'not an array') : 'no data',
        },
        trpc: {
          hasCachedData: !!trpcCachedData,
          dataSize: trpcCachedData ? (Array.isArray(trpcCachedData) ? trpcCachedData.length : 'not an array') : 'no data',
        }
      });
    }

    // Comment out URL updating to prevent server component re-rendering
    // This keeps all tab navigation client-side only
    /*
    // Create a new URLSearchParams object
    const params = new URLSearchParams(searchParams);
    params.set('tab', value);

    // Update the URL without refreshing the page
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    */

    // Just log the tab change without updating the URL
    console.log(`[TabContainer] Tab changed to: ${value} (URL not updated to prevent server re-renders)`);

    try {
      // Simulate loading/fetching data for the tab
      await simulateLoading(value);
    } catch (error) {
      console.error(`Error loading tab ${value}:`, error);
    } finally {
      // Clear loading state when done
      setLoadingTab(null);
    }
  };

  // Update the active tab when the URL changes (only on initial load)
  useEffect(() => {
    // Only set the active tab from URL on initial load
    if (tabParam && validTabs.includes(tabParam)) {
      console.log(`[TabContainer] Setting initial tab from URL: ${tabParam}`);
      setActiveTab(tabParam);
    }
    // Remove the dependency on activeTab to prevent this from running when activeTab changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam, validTabs]);

  // Log when component mounts and cache settings
  useEffect(() => {
    console.log(`[TabContainer] Mounted with ID: ${id}`);
    console.log(`[TabContainer] Cache settings:`, {
      staleTime: CACHE_TIMES.ACTIVE_SESSION.STALE_TIME / (60 * 1000) + ' minutes',
      gcTime: CACHE_TIMES.ACTIVE_SESSION.GC_TIME / (60 * 1000) + ' minutes',
    });

    // Log the current cache state for both client-side and tRPC-compatible query keys
    const clientDetailsKey = ['claims', 'details', { id }];
    const clientSummaryKey = ['claims', 'summary', { id }];
    const clientAppointmentsKey = ['appointment', 'getByClaim', { claim_id: id }];

    const trpcDetailsKey = QUERY_KEYS.TRPC.DETAILS(id);
    const trpcSummaryKey = QUERY_KEYS.TRPC.SUMMARY(id);
    const trpcAppointmentsKey = QUERY_KEYS.TRPC.APPOINTMENTS(id);

    console.log(`[TabContainer] Cache state:`, {
      details: {
        client: !!queryClient.getQueryData(clientDetailsKey),
        trpc: !!queryClient.getQueryData(trpcDetailsKey)
      },
      summary: {
        client: !!queryClient.getQueryData(clientSummaryKey),
        trpc: !!queryClient.getQueryData(trpcSummaryKey)
      },
      appointments: {
        client: !!queryClient.getQueryData(clientAppointmentsKey),
        trpc: !!queryClient.getQueryData(trpcAppointmentsKey)
      }
    });

    // Add a global query cache listener to log when queries are refetched
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'queryUpdated' && event.action.type === 'fetch') {
        console.log(`[Cache] Query refetched:`, {
          queryKey: event.query.queryKey,
          time: new Date().toISOString(),
        });
      }
    });

    // Return cleanup function
    return () => {
      console.log(`[TabContainer] Unmounting with ID: ${id}`);
      unsubscribe(); // Remove the cache listener
    };
  }, [id, queryClient]);

  // Check if we only have partial data
  const isPartialData = initialData.claim?.details?.isPartialData ||
                        (initialData.claim?.summary && !initialData.claim?.details);

  // Tab loading skeleton component
  const TabLoadingSkeleton = () => (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center space-x-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading tab content...</span>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </div>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        {isPartialData && (
          <Alert variant="warning" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Limited Data Available</AlertTitle>
            <AlertDescription>
              Only partial claim data is available. Some details may be missing.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" disabled={loadingTab !== null}>
              {loadingTab === 'overview' ? (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Overview
                </div>
              ) : (
                'Overview'
              )}
            </TabsTrigger>
            <TabsTrigger value="appointment" disabled={loadingTab !== null}>
              {loadingTab === 'appointment' ? (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Appointment
                </div>
              ) : (
                'Appointment'
              )}
            </TabsTrigger>
            <TabsTrigger value="inspection" disabled={loadingTab !== null}>
              {loadingTab === 'inspection' ? (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Inspection
                </div>
              ) : (
                'Inspection'
              )}
            </TabsTrigger>
            <TabsTrigger value="threesixty" disabled={loadingTab !== null}>
              {loadingTab === 'threesixty' ? (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  360°
                </div>
              ) : (
                '360°'
              )}
            </TabsTrigger>
            <TabsTrigger value="estimate" disabled={loadingTab !== null}>
              {loadingTab === 'estimate' ? (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Estimate
                </div>
              ) : (
                'Estimate'
              )}
            </TabsTrigger>
            <TabsTrigger value="preincident" disabled={loadingTab !== null}>
              {loadingTab === 'preincident' ? (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Pre-Incident
                </div>
              ) : (
                'Pre-Incident'
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {loadingTab === 'overview' ? <TabLoadingSkeleton /> : tabContents.overview}
          </TabsContent>

          <TabsContent value="appointment" className="space-y-4">
            {loadingTab === 'appointment' ? (
              <Suspense fallback={<TabLoadingSkeleton />}>
                <AppointmentTabSkeleton />
              </Suspense>
            ) : tabContents.appointment}
          </TabsContent>

          <TabsContent value="inspection" className="space-y-4">
            {loadingTab === 'inspection' ? <TabLoadingSkeleton /> : tabContents.inspection}
          </TabsContent>

          <TabsContent value="threesixty" className="space-y-4">
            {loadingTab === 'threesixty' ? <TabLoadingSkeleton /> : tabContents.threesixty}
          </TabsContent>

          <TabsContent value="estimate" className="space-y-4">
            {loadingTab === 'estimate' ? <TabLoadingSkeleton /> : tabContents.estimate}
          </TabsContent>

          <TabsContent value="preincident" className="space-y-4">
            {loadingTab === 'preincident' ? <TabLoadingSkeleton /> : tabContents.preincident}
          </TabsContent>
        </Tabs>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}
