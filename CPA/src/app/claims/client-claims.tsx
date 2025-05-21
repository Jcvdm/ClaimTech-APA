'use client';

import React, { useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useClaimsList, ClaimFilterSchema, type ClaimListParams, type ClaimListItem } from "@/lib/api/domains/claims";
import { type ClaimListResponse } from "@/lib/api/domains/claims/types";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ApiStatus } from "@/lib/api/types";
import { api } from "@/trpc/react";

import { QueryClientProvider, HydrationBoundary, useQueryClient } from "@tanstack/react-query";
import { getQueryClient } from "@/trpc/query-client";
import { QUERY_KEYS } from "@/lib/api/domains/claims/constants";

export function ClientClaims({ dehydratedState }: { dehydratedState: unknown }) {
  const [qc] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={qc}>
      <HydrationBoundary state={dehydratedState}>
        <ClientClaimsInner />
      </HydrationBoundary>
    </QueryClientProvider>
  );
}

function ClientClaimsInner() {
  const [params, setParams] = useState<ClaimListParams>({
    filter: 'active',
    page: 1,
    limit: 10,
    search: "",
    sortBy: "created_at",
    sortOrder: "desc"
  });

  // Determine filter based on current path
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Update filter when path changes
  useEffect(() => {
    const getFilterFromPath = () => {
      if (pathname === "/claims/additionals") return "additionals";
      if (pathname === "/claims/frc") return "frc";
      if (pathname === "/claims/finalized") return "finalized";
      if (pathname === "/claims/history") return "history";
      return "active"; // Default
    };

    const filter = getFilterFromPath();
    if (ClaimFilterSchema.safeParse(filter).success) {
      setParams(prev => ({ ...prev, filter: filter as any }));
    }
  }, [pathname]);

  // Handle search parameter from URL
  useEffect(() => {
    const search = searchParams.get('search');
    if (search) {
      setParams(prev => ({ ...prev, search, page: 1 }));
    }
  }, [searchParams]);

  // Get the query client using the proper hook from TanStack Query
  const queryClient = useQueryClient();

  // Check if data is already in the cache - use a safer approach
  // We'll check for cached data using a more generic query key pattern
  // First try the tRPC query key format
  let cachedData = queryClient.getQueryData([['trpc', 'claim', 'list']]);

  // If not found, try the client-side query key format
  if (!cachedData) {
    cachedData = queryClient.getQueryData(['claims', 'list']);
  }

  // If still not found, try other possible formats
  if (!cachedData) {
    // Get all query keys and look for anything related to claims list
    const allQueries = queryClient.getQueryCache().findAll();
    const claimListQueries = allQueries.filter(query =>
      JSON.stringify(query.queryKey).includes('claim') &&
      JSON.stringify(query.queryKey).includes('list')
    );

    if (claimListQueries.length > 0) {
      console.log('[ClientClaims] Found potential claim list queries:',
        claimListQueries.map(q => ({ key: q.queryKey, dataExists: !!q.state.data })));

      // Use the first one that has data
      const queryWithData = claimListQueries.find(q => !!q.state.data);
      if (queryWithData) {
        cachedData = queryWithData.state.data;
      }
    }
  }

  // Log whether we're using cached data
  React.useEffect(() => {
    // Avoid running this effect if queryClient is not available
    if (!queryClient) return;

    try {
      // Log cache status
      console.log(`[ClientClaims] Cache status:`, {
        queryClientExists: true,
        usingCachedData: !!cachedData,
        cachedDataItemsCount: (cachedData as any)?.items?.length || 0,
        totalQueriesInCache: queryClient.getQueryCache().getAll().length
      });

      // Log the first few query keys for debugging (limit to avoid console spam)
      const allQueries = queryClient.getQueryCache().getAll();
      console.log(`[ClientClaims] First 5 query keys in cache:`,
        allQueries.slice(0, 5).map(q => ({
          key: q.queryKey,
          dataExists: !!q.state.data,
          dataUpdatedAt: new Date(q.state.dataUpdatedAt).toISOString()
        }))
      );

      // Log any claim-related queries specifically
      const claimQueries = allQueries.filter(q =>
        JSON.stringify(q.queryKey).includes('claim')
      );

      if (claimQueries.length > 0) {
        console.log(`[ClientClaims] Found ${claimQueries.length} claim-related queries:`,
          claimQueries.slice(0, 3).map(q => ({
            key: q.queryKey,
            dataExists: !!q.state.data,
            dataUpdatedAt: new Date(q.state.dataUpdatedAt).toISOString()
          }))
        );
      } else {
        console.log(`[ClientClaims] No claim-related queries found in cache`);
      }
    } catch (error) {
      console.error('[ClientClaims] Error in cache logging effect:', error);
    }
  }, [queryClient]); // Remove cachedData dependency to avoid re-renders

  // Log information about the cached data - using a ref to avoid dependency issues
  const cachedDataRef = React.useRef(cachedData);
  const paramsRef = React.useRef(params);

  // Update refs when values change
  React.useEffect(() => {
    cachedDataRef.current = cachedData;
  }, [cachedData]);

  React.useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  // Listen for claim creation events and refresh data
  React.useEffect(() => {
    // Check for force refresh flag in localStorage
    const forceRefresh = window.localStorage.getItem('forceClaimsRefresh');
    if (forceRefresh) {
      console.log(`[ClientClaims] Force refresh flag detected, invalidating queries`);
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      queryClient.invalidateQueries({ queryKey: [['trpc', 'claim']] });
      window.localStorage.removeItem('forceClaimsRefresh');

      // Force a refresh of the claims list
      setParams(prev => ({ ...prev, _refresh: Date.now() }));
    }

    // Set up event listener for claim creation
    const handleClaimCreated = (event: CustomEvent) => {
      console.log(`[ClientClaims] Claim created event detected:`, event.detail);
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      queryClient.invalidateQueries({ queryKey: [['trpc', 'claim']] });

      // Force a refresh of the claims list
      setParams(prev => ({ ...prev, _refresh: Date.now() }));
    };

    // Add event listener
    window.addEventListener('claimCreated', handleClaimCreated as EventListener);

    // Clean up
    return () => {
      window.removeEventListener('claimCreated', handleClaimCreated as EventListener);
    };
  }, [queryClient]);

  // Single effect for logging that doesn't depend on the values directly
  React.useEffect(() => {
    // Use a timer to avoid too frequent logging
    const timer = setTimeout(() => {
      try {
        console.log(`[ClientClaims] Params:`, paramsRef.current);
        console.log(`[ClientClaims] Using cached data:`, !!cachedDataRef.current);

        if (cachedDataRef.current) {
          console.log(`[ClientClaims] Cached data details:`, {
            itemsCount: (cachedDataRef.current as any)?.items?.length || 0,
            hasPagination: !!(cachedDataRef.current as any)?.pagination,
            totalItems: (cachedDataRef.current as any)?.pagination?.total || 0
          });
        }
      } catch (error) {
        console.error('[ClientClaims] Error in data logging effect:', error);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []); // Empty dependency array - the effect uses refs instead

  // If we have cached data, use it directly
  let data = cachedData;
  let status = cachedData ? ApiStatus.SUCCESS : ApiStatus.LOADING;
  let error = null;

  // Create a state to track if we need to use the direct API fallback
  const [useFallback, setUseFallback] = useState(false);
  const [fallbackData, setFallbackData] = useState<any>(null);
  const [fallbackStatus, setFallbackStatus] = useState<ApiStatus>(ApiStatus.LOADING);
  const [fallbackError, setFallbackError] = useState<Error | null>(null);

  // If we have cached data, use it directly
  // Otherwise, try to use the hook
  if (!cachedData && !useFallback) {
    try {
      console.log(`[ClientClaims] No cached data, using useClaimsList hook`);

      // Use the hook at the top level (not inside useEffect)
      const hookResult = useClaimsList(params, {
        staleTime: 60 * 1000, // 1 minute stale time
      });

      // Update our variables with the hook result
      data = hookResult.data;
      status = hookResult.status;
      error = hookResult.error as Error | null;

      // Log the hook result
      console.log(`[ClientClaims] useClaimsList result:`, {
        hasData: !!hookResult.data,
        status: hookResult.status,
        hasError: !!hookResult.error
      });

      // If the hook failed, try the fallback
      if (status === ApiStatus.ERROR) {
        console.log(`[ClientClaims] Hook failed, will try direct API fallback`);
        setUseFallback(true);
      }
    } catch (err) {
      console.error(`[ClientClaims] Error using useClaimsList:`, err);
      status = ApiStatus.ERROR;
      error = err as Error;

      // If the hook throws an error, try the fallback
      console.log(`[ClientClaims] Hook threw error, will try direct API fallback`);
      setUseFallback(true);
    }
  }

  // If we need to use the fallback, fetch the data directly using the API
  useEffect(() => {
    if (useFallback && !fallbackData && fallbackStatus === ApiStatus.LOADING) {
      console.log(`[ClientClaims] Using direct API fallback`);

      const fetchData = async () => {
        try {
          // Use the direct API call
          const result = await api.claim.list.query(params);

          console.log(`[ClientClaims] Direct API fallback succeeded:`, {
            hasData: !!result,
            itemsCount: result?.items?.length || 0
          });

          setFallbackData(result);
          setFallbackStatus(ApiStatus.SUCCESS);
        } catch (err) {
          console.error(`[ClientClaims] Direct API fallback failed:`, err);
          setFallbackError(err as Error);
          setFallbackStatus(ApiStatus.ERROR);
        }
      };

      fetchData();
    }
  }, [useFallback, fallbackData, fallbackStatus, params]);

  // If we're using the fallback and have fallback data, use it
  if (useFallback) {
    data = fallbackData;
    status = fallbackStatus;
    error = fallbackError;
  }

  // Log data for debugging (optional) - using a ref to avoid dependency issues
  const dataRef = React.useRef(data);

  // Update ref when data changes
  React.useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Single effect for data logging that doesn't depend on data directly
  React.useEffect(() => {
    // Use a timer to avoid too frequent logging and to ensure data is stable
    const timer = setTimeout(() => {
      if (dataRef.current) {
        try {
          const typedData = dataRef.current as unknown as ClaimListResponse;
          if (typedData.items?.length > 0) {
            // Log for debugging
            const firstItem = typedData.items[0];
            if (firstItem) {
              console.log("Claims data - first item:", {
                id: firstItem.id,
                job_number: firstItem.job_number,
                status: firstItem.status
              });
              console.log("Vehicle data:", firstItem.vehicle ? {
                make: firstItem.vehicle.make,
                model: firstItem.vehicle.model
              } : 'No vehicle data');
              console.log("Client data:", firstItem.client ? {
                name: firstItem.client.name
              } : 'No client data');
            }
          } else {
            console.log("Claims data is empty or has no items");
          }
        } catch (error) {
          console.error("Error processing claims data for logging:", error);
        }
      }
    }, 200);

    return () => clearTimeout(timer);
  }, []); // Empty dependency array - the effect uses ref instead

  // Search is now handled by the DataTable component

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setParams(prev => ({ ...prev, page: newPage }));
  };

  // If loading, show skeleton UI with loading message
  if (status === ApiStatus.LOADING) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="space-y-2 flex-grow">
            <Skeleton className="h-8 w-1/4" /> {/* Placeholder for title */}
            <Skeleton className="h-4 w-1/2" /> {/* Placeholder for description */}
          </div>
          <div className="text-sm text-muted-foreground animate-pulse">
            Loading claims data...
            {useFallback && <span className="ml-1">(using fallback method)</span>}
          </div>
        </div>
        <Skeleton className="h-10 w-full" /> {/* Placeholder for filter */}
        <Skeleton className="h-[400px] w-full rounded-md border" /> {/* Placeholder for table */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" /> {/* Placeholder for count */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20" /> {/* Previous button */}
            <Skeleton className="h-5 w-32" /> {/* Page indicator */}
            <Skeleton className="h-9 w-20" /> {/* Next button */}
          </div>
        </div>
      </div>
    );
  }

  // Function to retry loading the data
  const handleRetry = () => {
    console.log(`[ClientClaims] Retry requested`);

    // If we were using the fallback, reset it and try the hook again
    if (useFallback) {
      setUseFallback(false);
      setFallbackData(null);
      setFallbackStatus(ApiStatus.LOADING);
      setFallbackError(null);
      return;
    }

    // Otherwise, force a refetch by invalidating the query
    queryClient.invalidateQueries({ queryKey: ['claims'] });
    queryClient.invalidateQueries({ queryKey: [['trpc', 'claim']] });
  };

  // If error, show error message with retry button
  if (status === ApiStatus.ERROR) {
    console.error("Error fetching claims:", error?.message);
    return (
      <div className="rounded-md bg-destructive/15 p-4">
        <div className="flex">
          <div className="ml-3 flex-grow">
            <h3 className="text-sm font-medium text-destructive">
              Error loading claims
            </h3>
            <div className="mt-2 text-sm text-destructive/80">
              <p>{error?.message || "An unknown error occurred"}</p>
              <p className="mt-1">
                {useFallback
                  ? "Both the primary and fallback data sources failed."
                  : "The primary data source failed."}
              </p>
              <p className="mt-1">
                {cachedData
                  ? "Using cached data from a previous load."
                  : "No cached data is available."}
              </p>
            </div>
          </div>
          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Determine if we're using cached data
  const isUsingCachedData = !!cachedData && data === cachedData;

  return (
    <div className="space-y-4">
      {/* Show a message when using cached data */}
      {isUsingCachedData && (
        <div className="bg-blue-50 p-2 rounded-md text-sm text-blue-700 flex items-center justify-between">
          <div>
            <span className="font-medium">Using cached data.</span>
            <span className="ml-2">
              Showing {(data as unknown as ClaimListResponse)?.items?.length || 0} claims from cache.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="text-xs"
          >
            Refresh
          </Button>
        </div>
      )}

      {/* Add debugging to see what's being passed to DataTable */}
      {(() => {
        console.log("Data being passed to DataTable:", (data as unknown as ClaimListResponse)?.items);
        console.log("Data source:", isUsingCachedData ? "cache" : useFallback ? "fallback" : "hook");
        return null;
      })()}

      <DataTable<ClaimListItem, any>
        columns={columns}
        data={(data as unknown as ClaimListResponse)?.items || []}
        defaultFilterColumn="job_number"
        excludeFilterColumns={["select", "actions", "vehicles", "registration"]}
        enableExpanding={true}
      />

      {data !== undefined && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(data as unknown as ClaimListResponse)?.items?.length || 0} of {(data as unknown as ClaimListResponse)?.pagination?.total || 0} claims
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(params.page - 1)}
              disabled={params.page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {params.page} of {(data as unknown as ClaimListResponse)?.pagination?.pages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(params.page + 1)}
              disabled={params.page >= ((data as unknown as ClaimListResponse)?.pagination?.pages || 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
