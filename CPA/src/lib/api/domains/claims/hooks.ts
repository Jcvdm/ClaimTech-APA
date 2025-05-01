// src/lib/api/domains/claims/hooks.ts
import React from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { claimQueries } from "./queries";
import { claimMutations } from "./mutations";
import {
  type ClaimListParams,
  type ClaimWithRelations,
  type ClaimCreateInput,
  type ClaimUpdateInput,
  type ClaimListResponse,
  ClaimStatus,
  type ClaimCreateInputWithOptionalFields,
  type ClaimSummary,
  type ClaimDetails
} from "./types";
import { getQueryKey, combineQueryData, createEntityQueryKey } from "@/lib/api/utils";
import { useQueryState, useInfiniteData, useDependentQuery, useParallelQueries } from "@/lib/api/hooks";
import { apiClient } from "@/lib/api/client";
import { type UseTRPCQueryResult } from "@trpc/react-query/shared";
import { type TRPCClientErrorLike } from "@trpc/react-query";
import { type AppRouter } from "@/server/api/root";

// Function to validate UUID format
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Hook for fetching claims with filtering
 * @param params The filter parameters
 * @param options Optional query options (initialData, staleTime, etc.)
 */
export function useClaimsList(
  params: ClaimListParams,
  options?: {
    initialData?: any;
    staleTime?: number;
    gcTime?: number;
    enabled?: boolean;
  }
) {
  // Use a try-catch block to handle any errors in the query creation
  try {
    const query = claimQueries.list(params, options);

    // Wrap the useQueryState call in a try-catch to handle any hook errors
    try {
      return useQueryState(() => query);
    } catch (error) {
      console.error('[useClaimsList] Error in useQueryState:', error);

      // Return a fallback state object that matches the expected shape
      return {
        data: undefined,
        isLoading: false,
        isError: true,
        error: error instanceof Error ? error : new Error(String(error)),
        status: 'error',
        refetch: async () => {
          console.warn('[useClaimsList] Refetch called on error state');
          return { data: undefined, error: new Error('Cannot refetch from error state') };
        }
      };
    }
  } catch (error) {
    console.error('[useClaimsList] Error creating query:', error);

    // Return a fallback state object
    return {
      data: undefined,
      isLoading: false,
      isError: true,
      error: error instanceof Error ? error : new Error(String(error)),
      status: 'error',
      refetch: async () => {
        console.warn('[useClaimsList] Refetch called on error state');
        return { data: undefined, error: new Error('Cannot refetch from error state') };
      }
    };
  }
}

/**
 * Hook for fetching sidebar badge counts
 */
export function useClaimCounts() {
  try {
    const query = claimQueries.getCounts();

    try {
      return useQueryState(() => query);
    } catch (error) {
      console.error('[useClaimCounts] Error in useQueryState:', error);

      // Return a fallback state object with default counts
      return {
        data: {
          active: 0,
          additionals: 0,
          frc: 0,
          finalized: 0,
          history: 0
        },
        isLoading: false,
        isError: true,
        error: error instanceof Error ? error : new Error(String(error)),
        status: 'error',
        refetch: async () => {
          console.warn('[useClaimCounts] Refetch called on error state');
          return {
            data: {
              active: 0,
              additionals: 0,
              frc: 0,
              finalized: 0,
              history: 0
            },
            error: new Error('Cannot refetch from error state')
          };
        }
      };
    }
  } catch (error) {
    console.error('[useClaimCounts] Error creating query:', error);

    // Return a fallback state object with default counts
    return {
      data: {
        active: 0,
        additionals: 0,
        frc: 0,
        finalized: 0,
        history: 0
      },
      isLoading: false,
      isError: true,
      error: error instanceof Error ? error : new Error(String(error)),
      status: 'error',
      refetch: async () => {
        console.warn('[useClaimCounts] Refetch called on error state');
        return {
          data: {
            active: 0,
            additionals: 0,
            frc: 0,
            finalized: 0,
            history: 0
          },
          error: new Error('Cannot refetch from error state')
        };
      }
    };
  }
}

/**
 * Hook for fetching a single claim by ID
 * @param id The claim ID (can be undefined/null during initial render)
 */
export function useClaim(id: string | undefined | null) {
  try {
    // Validate the ID if provided
    if (id && !isValidUUID(id)) {
      console.warn(`[useClaim] Invalid UUID format for claim ID: ${id}`);
      return {
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error(`Invalid UUID format: ${id}`),
        status: 'error',
        refetch: async () => ({ data: undefined, error: new Error('Invalid UUID') })
      };
    }

    const query = claimQueries.getById(id);

    try {
      return useQueryState(() => query);
    } catch (error) {
      console.error('[useClaim] Error in useQueryState:', error);

      // Return a fallback state object
      return {
        data: undefined,
        isLoading: false,
        isError: true,
        error: error instanceof Error ? error : new Error(String(error)),
        status: 'error',
        refetch: async () => {
          console.warn('[useClaim] Refetch called on error state');
          return { data: undefined, error: new Error('Cannot refetch from error state') };
        }
      };
    }
  } catch (error) {
    console.error('[useClaim] Error creating query:', error);

    // Return a fallback state object
    return {
      data: undefined,
      isLoading: false,
      isError: true,
      error: error instanceof Error ? error : new Error(String(error)),
      status: 'error',
      refetch: async () => {
        console.warn('[useClaim] Refetch called on error state');
        return { data: undefined, error: new Error('Cannot refetch from error state') };
      }
    };
  }
}

/**
 * Hook for creating a claim with cache invalidation
 */
export function useCreateClaim() {
  const queryClient = useQueryClient();

  return claimMutations.create({
    onSuccess: () => {
      // Invalidate relevant queries after successful creation
      queryClient.invalidateQueries({ queryKey: getQueryKey(apiClient.raw.claim.list) });
      queryClient.invalidateQueries({ queryKey: getQueryKey(apiClient.raw.claim.getCounts) });
    }
  });
}

/**
 * Hook for updating a claim with cache invalidation
 */
export function useUpdateClaim() {
  const queryClient = useQueryClient();

  return claimMutations.update({
    onSuccess: (updatedClaim) => {
      // Update the cache for the specific claim
      queryClient.setQueryData(
        getQueryKey(apiClient.raw.claim.getById, { id: updatedClaim.id }),
        updatedClaim
      );

      // Invalidate lists that might contain this claim
      queryClient.invalidateQueries({ queryKey: getQueryKey(apiClient.raw.claim.list) });
      queryClient.invalidateQueries({ queryKey: getQueryKey(apiClient.raw.claim.getCounts) });
    }
  });
}

/**
 * Hook for updating claim status with optimistic updates
 */
export function useOptimisticUpdateClaimStatus() {
  const queryClient = useQueryClient();
  const mutation = apiClient.raw.claim.updateStatus.useMutation();

  return useMutation({
    mutationFn: (variables: { id: string; status: ClaimStatus }) =>
      mutation.mutateAsync(variables),

    // Optimistic update
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: getQueryKey(apiClient.raw.claim.getById, { id: variables.id })
      });

      // Snapshot the previous value
      const previousClaim = queryClient.getQueryData(
        getQueryKey(apiClient.raw.claim.getById, { id: variables.id })
      );

      // Optimistically update to the new value
      queryClient.setQueryData(
        getQueryKey(apiClient.raw.claim.getById, { id: variables.id }),
        (old: any) => old ? { ...old, status: variables.status } : undefined
      );

      // Return a context object with the snapshot
      return { previousClaim };
    },

    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, variables, context) => {
      queryClient.setQueryData(
        getQueryKey(apiClient.raw.claim.getById, { id: variables.id }),
        context?.previousClaim
      );
      toast.error(`Failed to update claim status: ${err.message}`);
    },

    // Always refetch after error or success
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({
        queryKey: getQueryKey(apiClient.raw.claim.getById, { id: variables.id })
      });
      queryClient.invalidateQueries({
        queryKey: getQueryKey(apiClient.raw.claim.list)
      });
      queryClient.invalidateQueries({
        queryKey: getQueryKey(apiClient.raw.claim.getCounts)
      });

      if (!error && data) {
        toast.success(`Claim status updated successfully`);
      }
    },
  });
}

// Legacy hook removed to avoid confusion - use useOptimisticUpdateClaimStatus instead

/**
 * Hook for deleting a claim with optimistic updates
 */
export function useOptimisticDeleteClaim() {
  const queryClient = useQueryClient();
  const mutation = apiClient.raw.claim.delete.useMutation();

  return useMutation({
    mutationFn: (variables: { id: string }) =>
      mutation.mutateAsync(variables),

    // Optimistic update
    onMutate: async (variables) => {
      // Get the query key for the active claims list
      const listQueryKey = getQueryKey(apiClient.raw.claim.list, { filter: 'active' });

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: listQueryKey });
      await queryClient.cancelQueries({
        queryKey: getQueryKey(apiClient.raw.claim.getById, { id: variables.id })
      });

      // Snapshot the previous list
      const previousList = queryClient.getQueryData(listQueryKey);

      // Optimistically update the list by removing the deleted claim
      queryClient.setQueryData(listQueryKey, (old: any) => {
        if (!old) return { items: [] };
        return {
          ...old,
          items: old.items.filter((claim: any) => claim.id !== variables.id)
        };
      });

      // Remove the claim from the cache
      queryClient.removeQueries({
        queryKey: getQueryKey(apiClient.raw.claim.getById, { id: variables.id })
      });

      // Return a context with the previous list
      return { previousList };
    },

    // If the mutation fails, use the context to roll back
    onError: (err, _variables, context) => {
      // Get the query key for the active claims list
      const listQueryKey = getQueryKey(apiClient.raw.claim.list, { filter: 'active' });

      // Restore the previous list
      queryClient.setQueryData(listQueryKey, context?.previousList);

      // Show error toast
      toast.error(`Failed to delete claim: ${err.message}`);
    },

    // Always refetch after error or success
    onSettled: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: getQueryKey(apiClient.raw.claim.list)
      });
      queryClient.invalidateQueries({
        queryKey: getQueryKey(apiClient.raw.claim.getCounts)
      });
    },

    // Show success message
    onSuccess: () => {
      toast.success('Claim deleted successfully');
    }
  });
}

// Legacy hook removed to avoid confusion - use useOptimisticDeleteClaim instead

/**
 * Hook for infinite claims list with pagination
 */
export function useInfiniteClaimsList(params: Omit<ClaimListParams, 'page'>) {
  return useInfiniteData<ClaimListResponse, number>(
    (pageParam) => apiClient.raw.claim.list.useQuery({ ...params, page: pageParam }),
    (lastPage) => lastPage.pagination.hasMore ? lastPage.pagination.current + 1 : undefined,
    {
      queryKey: ['claims', 'list', params],
      initialPageParam: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );
}

/**
 * Hook for fetching a claim with all related data
 * @param claimId The claim ID (can be undefined/null during initial render)
 * @deprecated Use useClaimSummary or useClaimFullDetails instead
 */
export function useClaimDetails(claimId: string | undefined | null) {
  try {
    // First query to get the claim
    const claimQuery = useClaim(claimId);

    // Check if the claim query is our fallback error object
    if (claimQuery.isError && typeof claimQuery.status === 'string') {
      // Return a compatible result object
      return {
        data: undefined,
        isLoading: false,
        isError: true,
        error: claimQuery.error,
        status: 'error' as any // Cast to any to avoid type issues
      };
    }

    // Use parallel queries for related data
    const queries = useParallelQueries({
      claim: claimQuery as any, // Cast to any to avoid type issues
      // These would be implemented in their respective domains
      // client: useClient(claimQuery.data?.client_id),
      // vehicle: useVehicle(claimQuery.data?.vehicle_id),
    });

    // Combine the data
    const data = claimQuery.data ? {
      ...claimQuery.data,
      // These would be populated with actual data when the domains are implemented
      client: null,
      vehicle: null
    } : undefined;

    return {
      data,
      isLoading: queries.isLoading,
      isError: queries.isError,
      error: claimQuery.error ? {
        ...claimQuery.error,
        name: claimQuery.error.name || 'Error' // Ensure name property exists
      } : undefined,
      status: claimQuery.isLoading ? 'loading' : claimQuery.isError ? 'error' : 'success'
    };
  } catch (error) {
    console.error('[useClaimDetails] Error:', error);

    // Return a fallback state object
    return {
      data: undefined,
      isLoading: false,
      isError: true,
      error: error instanceof Error ? error : new Error(String(error)),
      status: 'error' as any // Cast to any to avoid type issues
    };
  }
}

/**
 * Hook for fetching claim summary for expandable rows
 * @param claimId The claim ID
 */
export function useClaimSummary(
  claimId: string | undefined | null,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number; // Updated from cacheTime to gcTime
  }
): UseTRPCQueryResult<ClaimSummary | undefined, TRPCClientErrorLike<AppRouter>> {
  const queryClient = useQueryClient();

  // Ensure we have a valid UUID before making the query
  const isValid = !!claimId && isValidUUID(claimId);
  const actualEnabled = (options?.enabled !== undefined ? options.enabled : true) && isValid;

  // --- Start Cache Check & Initial Data Logic ---
  const queryKey = React.useMemo(() =>
    isValid ? ([['trpc', 'claim', 'getSummary'], { input: { id: claimId! }, type: 'query' }]) : undefined
  , [claimId, isValid]);

  // Attempt to get initialData directly from the cache if fresh
  const initialData = React.useMemo(() => {
    if (!queryKey) return undefined;
    const data = queryClient.getQueryData<ClaimSummary | undefined>(queryKey);
    if (data) {
      const queryState = queryClient.getQueryState(queryKey);
      const age = queryState?.dataUpdatedAt ? Date.now() - queryState.dataUpdatedAt : Infinity;
      const effectiveStaleTime = options?.staleTime ?? 5 * 60 * 1000;
      if (age < effectiveStaleTime) {
        console.log(`[useClaimSummary InitialData] ${claimId} - Using FRESH cached data (Age: ${age}ms) as initialData`);
        return data;
      }
      console.log(`[useClaimSummary InitialData] ${claimId} - Cached data found but STALE (Age: ${age}ms)`);
    }
    return undefined;
  }, [queryKey, queryClient, options?.staleTime]);
  // --- End Cache Check & Initial Data Logic ---

  // Log validity for debugging
  React.useEffect(() => {
    if (claimId && !isValid) {
      console.warn(`[Query] Invalid UUID format for claim ID: ${claimId}`);
    }
  }, [claimId, isValid]);

  // Define query options, including initialData
  const queryOpts = {
    enabled: actualEnabled,
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes
    gcTime: options?.gcTime ?? 10 * 60 * 1000, // 10 minutes
    initialData: initialData, // Provide cached data if fresh
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  };

  // Use the tRPC hook directly
  const result = apiClient.raw.claim.getSummary.useQuery(
    { id: claimId || '' },
    // Need to cast here because TS struggles with the conditional initialData type
    queryOpts as any
  );

  // Handle Success/Error logging
  React.useEffect(() => {
    if (result.isSuccess) {
      console.log(`[Query Success - Summary] ${claimId} - Data available (isLoading: ${result.isLoading}, fetchStatus: ${result.fetchStatus})`);
    } else if (result.isError) {
      console.error(`[Query Error - Summary] ${claimId}:`, result.error);
    }
  }, [result.isSuccess, result.isError, result.error, result.isLoading, result.fetchStatus, claimId]);

  // Log loading status changes
  React.useEffect(() => {
    const queryState = queryKey ? queryClient.getQueryState(queryKey) : undefined;
    console.log(
      `[useClaimSummary Status] ${claimId} - ` +
      `isLoading: ${result.isLoading}, ` +
      `fetchStatus: ${result.fetchStatus}, ` +
      `cacheStatus: ${queryState?.status || 'unknown'}, ` +
      `dataUpdatedAt: ${queryState?.dataUpdatedAt || 0}, ` +
      `hookHasData: ${!!result.data}, ` +
      `usedInitialData: ${!!initialData}` // Log if initialData was provided
    );
  }, [result.isLoading, result.fetchStatus, claimId, isValid, queryClient, queryKey, initialData, result.data]);

  // Return the state directly from the hook result
  // The hook should ideally start with data if initialData was provided
  return result;
}

/**
 * No-op implementation of the old prefetching hook
 * @deprecated Client-side prefetching has been replaced with server-side prefetching
 */
export function useClaimPrefetching() {
  console.warn("[DEPRECATED] useClaimPrefetching is deprecated. Server-side prefetching is now used instead.");
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    prefetchSummary: (_claimId: string, _priority?: boolean) => Promise.resolve(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    prefetchDetails: (_claimId: string, _priority?: boolean) => Promise.resolve(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    prefetchMultipleSummaries: (_claimIds: string[], _priorityCount?: number) => Promise.resolve()
  };
}

/**
 * Hook for recording an inspection for a claim
 * @deprecated Use useRecordInspection from the inspections domain instead
 */
export function useRecordInspection() {
  console.warn("[DEPRECATED] useRecordInspection from claims domain is deprecated. Use useRecordInspection from inspections domain instead.");

  const queryClient = useQueryClient();

  return claimMutations.recordInspection({
    onSuccess: (updatedClaim) => {
      // Update the cache for the specific claim
      queryClient.setQueryData(
        getQueryKey(apiClient.raw.claim.getById, { id: updatedClaim.id }),
        updatedClaim
      );

      // Also update the details and summary caches
      queryClient.setQueryData(
        getQueryKey(apiClient.raw.claim.getDetails, { id: updatedClaim.id }),
        (oldData: any) => {
          if (!oldData) return undefined;

          // Create a safe update that handles potential type mismatches
          const safeUpdate = {
            ...oldData,
            status: ClaimStatus.IN_PROGRESS
          };

          // Only add inspection_datetime if it exists in updatedClaim
          if ('inspection_datetime' in updatedClaim) {
            (safeUpdate as any).inspection_datetime = updatedClaim.inspection_datetime;
          }

          return safeUpdate;
        }
      );

      queryClient.setQueryData(
        getQueryKey(apiClient.raw.claim.getSummary, { id: updatedClaim.id }),
        (oldData: any) => oldData ? { ...oldData, status: ClaimStatus.IN_PROGRESS } : undefined
      );

      // Invalidate lists that might contain this claim
      queryClient.invalidateQueries({ queryKey: getQueryKey(apiClient.raw.claim.list) });
      queryClient.invalidateQueries({ queryKey: getQueryKey(apiClient.raw.claim.getCounts) });
    }
  });
}

/**
 * Hook for fetching full claim details including all related data
 * @param claimId The claim ID
 */
export function useClaimFullDetails(
  claimId: string | undefined | null,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number; // Updated from cacheTime to gcTime
  }
): UseTRPCQueryResult<ClaimDetails | undefined, TRPCClientErrorLike<AppRouter>> {
  const queryClient = useQueryClient();

  // Ensure we have a valid UUID before making the query
  const isValid = !!claimId && isValidUUID(claimId);
  const enabled = (options?.enabled !== undefined ? options.enabled : true) && isValid;

  // --- Start Cache Check & Initial Data Logic ---
  const queryKey = React.useMemo(() =>
    isValid ? ([['trpc', 'claim', 'getDetails'], { input: { id: claimId! }, type: 'query' }]) : undefined
  , [claimId, isValid]);

  const initialData = React.useMemo(() => {
    if (!queryKey) return undefined;
    const data = queryClient.getQueryData<ClaimDetails | undefined>(queryKey);
    if (data) {
        const queryState = queryClient.getQueryState(queryKey);
        const age = queryState?.dataUpdatedAt ? Date.now() - queryState.dataUpdatedAt : Infinity;
        const effectiveStaleTime = options?.staleTime ?? 5 * 60 * 1000;
        if (age < effectiveStaleTime) {
            console.log(`[useClaimDetails InitialData] ${claimId} - Using FRESH cached data (Age: ${age}ms) as initialData`);
            return data;
        }
        console.log(`[useClaimDetails InitialData] ${claimId} - Cached data found but STALE (Age: ${age}ms)`);
    }
    return undefined;
  }, [queryKey, queryClient, options?.staleTime]);
  // --- End Cache Check & Initial Data Logic ---

  // Log for debugging
  React.useEffect(() => {
    if (claimId && !isValid) {
      console.warn(`[Query] Invalid UUID format for claim ID: ${claimId}`);
    }
  }, [claimId, isValid]);

  // Define query options separately
  const queryOpts = {
      enabled,
      staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes
      gcTime: options?.gcTime ?? 10 * 60 * 1000, // 10 minutes
      initialData: initialData,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
  };

  // Use the tRPC hook directly
  const result = apiClient.raw.claim.getDetails.useQuery(
    { id: claimId || '' },
    queryOpts as any // Cast options slightly if needed
  );

  // Handle Success/Error logging outside the main hook call if needed
  React.useEffect(() => {
    if (result.isSuccess) {
      console.log(`[Query Success - Details] ${claimId} - Data available (isLoading: ${result.isLoading}, fetchStatus: ${result.fetchStatus})`);
    } else if (result.isError) {
      console.error(`[Query Error - Details] ${claimId}:`, result.error);
    }
  }, [result.isSuccess, result.isError, result.error, result.isLoading, result.fetchStatus, claimId]);

  // Log loading status changes
  React.useEffect(() => {
    const queryState = queryKey ? queryClient.getQueryState(queryKey) : undefined;
    console.log(
      `[useClaimDetails Status] ${claimId} - ` +
      `isLoading: ${result.isLoading}, ` +
      `fetchStatus: ${result.fetchStatus}, ` +
      `cacheStatus: ${queryState?.status || 'unknown'}, ` +
      `dataUpdatedAt: ${queryState?.dataUpdatedAt || 0}, ` +
      `hookHasData: ${!!result.data}, ` +
      `usedInitialData: ${!!initialData}`
    );
  }, [result.isLoading, result.fetchStatus, claimId, isValid, queryClient, queryKey, initialData, result.data]);

  // Return the state directly from the hook result
  return result;
}
