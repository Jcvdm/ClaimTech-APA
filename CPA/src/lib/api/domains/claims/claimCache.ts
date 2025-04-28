'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { api } from '@/trpc/react';
import { CACHE_TIMES, PREFETCH_SETTINGS, QUERY_KEYS } from './constants';
import { getQueryKey, createEntityQueryKey } from '@/lib/api/utils';
import { apiClient } from '@/lib/api/client';
import { type ClaimListParams } from './types';

/**
 * Utility to check if a claim is already in the cache and fresh
 */
export function useIsCachedAndFresh() {
  const queryClient = useQueryClient();

  return useCallback((queryKey: unknown[], staleTime: number = CACHE_TIMES.STALE_TIME.SUMMARY) => {
    const state = queryClient.getQueryState(queryKey);
    if (!state || !state.data) return false;

    const dataAge = state.dataUpdatedAt ? Date.now() - state.dataUpdatedAt : Infinity;
    return dataAge < staleTime;
  }, [queryClient]);
}

/**
 * Hook for prefetching claim data
 * Implements the hybrid caching strategy with intelligent prefetching
 */
export function useClaimPrefetching() {
  const queryClient = useQueryClient();
  const isCachedAndFresh = useIsCachedAndFresh();

  // Track last prefetch time to implement cooldown
  const lastPrefetchTime = useRef<Record<string, number>>({});

  /**
   * Prefetch claim summary data
   */
  const prefetchSummary = useCallback(async (
    id: string,
    options?: { priority?: boolean; force?: boolean }
  ) => {
    try {
      // Skip if on cooldown (unless forced)
      const now = Date.now();
      const lastTime = lastPrefetchTime.current[`summary-${id}`] || 0;
      if (!options?.force && now - lastTime < CACHE_TIMES.PREFETCH_COOLDOWN) {
        console.log(`[Prefetch] Summary for ${id} skipped (on cooldown)`);
        return;
      }

      // Skip if already cached and fresh (unless forced)
      const queryKey = createEntityQueryKey('claim', 'getSummary', id);
      if (!options?.force && isCachedAndFresh(queryKey, CACHE_TIMES.STALE_TIME.SUMMARY)) {
        console.log(`[Prefetch] Summary for ${id} skipped (fresh in cache)`);
        return;
      }

      // Update last prefetch time
      lastPrefetchTime.current[`summary-${id}`] = now;

      console.log(`[Prefetch] Prefetching summary for ${id}`);

      // Use a simpler approach that's less likely to cause issues with tRPC proxy
      try {
        // First try to get the data directly without using fetchQuery
        const data = await apiClient.raw.claim.getSummary.query({ id });

        // If successful, manually update the cache
        queryClient.setQueryData(queryKey, data);
        console.log(`[Prefetch] Summary for ${id} prefetched successfully`);
      } catch (innerError) {
        console.error(`[Prefetch] Error in direct query for ${id}:`, innerError);
        // Don't rethrow - prefetching should fail silently
      }
    } catch (error) {
      console.error(`[Prefetch] Error in prefetchSummary for ${id}:`, error);
      // Don't rethrow - prefetching should fail silently
    }
  }, [queryClient, isCachedAndFresh]);

  /**
   * Prefetch claim details data
   */
  const prefetchDetails = useCallback(async (
    id: string,
    options?: { priority?: boolean; force?: boolean }
  ) => {
    try {
      // Skip if on cooldown (unless forced)
      const now = Date.now();
      const lastTime = lastPrefetchTime.current[`details-${id}`] || 0;
      if (!options?.force && now - lastTime < CACHE_TIMES.PREFETCH_COOLDOWN) {
        console.log(`[Prefetch] Details for ${id} skipped (on cooldown)`);
        return;
      }

      // Skip if already cached and fresh (unless forced)
      const queryKey = createEntityQueryKey('claim', 'getDetails', id);
      if (!options?.force && isCachedAndFresh(queryKey, CACHE_TIMES.STALE_TIME.DETAILS)) {
        console.log(`[Prefetch] Details for ${id} skipped (fresh in cache)`);
        return;
      }

      // Update last prefetch time
      lastPrefetchTime.current[`details-${id}`] = now;

      console.log(`[Prefetch] Prefetching details for ${id}`);

      // Use a simpler approach that's less likely to cause issues with tRPC proxy
      try {
        // First try to get the data directly without using fetchQuery
        const data = await apiClient.raw.claim.getDetails.query({ id });

        // If successful, manually update the cache
        queryClient.setQueryData(queryKey, data);
        console.log(`[Prefetch] Details for ${id} prefetched successfully`);
      } catch (innerError) {
        console.error(`[Prefetch] Error in direct query for ${id}:`, innerError);
        // Don't rethrow - prefetching should fail silently
      }
    } catch (error) {
      console.error(`[Prefetch] Error in prefetchDetails for ${id}:`, error);
      // Don't rethrow - prefetching should fail silently
    }
  }, [queryClient, isCachedAndFresh]);

  /**
   * Prefetch multiple claim summaries
   * Prioritizes the first N claims if priorityCount is specified
   */
  const prefetchMultipleSummaries = useCallback(async (
    ids: string[],
    options?: { priorityCount?: number; force?: boolean }
  ) => {
    if (!ids.length) return;

    const priorityCount = options?.priorityCount || 0;

    try {
      // Process in batches to avoid overwhelming the network
      for (let i = 0; i < ids.length; i += PREFETCH_SETTINGS.MAX_BATCH_SIZE) {
        const batch = ids.slice(i, i + PREFETCH_SETTINGS.MAX_BATCH_SIZE);

        // Process batch in parallel, but handle errors individually
        await Promise.allSettled(batch.map((id, index) => {
          const isPriority = index < priorityCount;
          try {
            return prefetchSummary(id, {
              priority: isPriority,
              force: options?.force
            });
          } catch (error) {
            console.error(`[Prefetch] Error prefetching summary for ${id} in batch:`, error);
            return Promise.resolve(); // Continue with other prefetches even if one fails
          }
        }));
      }
    } catch (error) {
      // Catch any errors that might occur during batch processing
      console.error(`[Prefetch] Error in prefetchMultipleSummaries:`, error);
      // Don't rethrow - we want to fail silently for prefetching
    }
  }, [prefetchSummary]);

  /**
   * Prefetch claims list data
   */
  const prefetchList = useCallback(async (
    params: ClaimListParams,
    options?: { priority?: boolean; force?: boolean }
  ) => {
    try {
      // Skip if on cooldown (unless forced)
      const now = Date.now();
      const cacheKey = JSON.stringify(params);
      const lastTime = lastPrefetchTime.current[`list-${cacheKey}`] || 0;
      if (!options?.force && now - lastTime < CACHE_TIMES.PREFETCH_COOLDOWN) {
        console.log(`[Prefetch] List with params ${cacheKey} skipped (on cooldown)`);
        return;
      }

      // Skip if already cached and fresh (unless forced)
      // For list queries, we need to use a different approach since they don't have a simple ID
      // We'll create a query key using the entity and action, with params as the third argument
      const queryKey = ['claim', 'list', params];
      if (!options?.force && isCachedAndFresh(queryKey, CACHE_TIMES.STALE_TIME.LIST)) {
        console.log(`[Prefetch] List with params ${cacheKey} skipped (fresh in cache)`);
        return;
      }

      // Update last prefetch time
      lastPrefetchTime.current[`list-${cacheKey}`] = now;

      console.log(`[Prefetch] Prefetching list with params ${cacheKey}`);

      // Use a simpler approach that's less likely to cause issues with tRPC proxy
      try {
        // First try to get the data directly without using fetchQuery
        const data = await apiClient.raw.claim.list.query(params);

        // If successful, manually update the cache
        queryClient.setQueryData(queryKey, data);
        console.log(`[Prefetch] List with params ${cacheKey} prefetched successfully`);
      } catch (innerError) {
        console.error(`[Prefetch] Error in direct query for list with params ${cacheKey}:`, innerError);
        // Don't rethrow - prefetching should fail silently
      }
    } catch (error) {
      console.error(`[Prefetch] Error in prefetchList with params ${JSON.stringify(params)}:`, error);
      // Don't rethrow - prefetching should fail silently
    }
  }, [queryClient, isCachedAndFresh]);

  /**
   * Warm the cache on initial load
   * This prefetches high-priority data when the hook is first mounted
   */
  useEffect(() => {
    try {
      // Prefetch active claims list
      prefetchList({ filter: 'active', page: 1, limit: 10 }, { priority: true });

      // Prefetch counts - use direct query approach instead of fetchQuery
      try {
        // Use setTimeout to slightly delay this non-critical fetch
        // This helps avoid overwhelming the client with too many simultaneous requests
        setTimeout(async () => {
          try {
            const countsQueryKey = ['claim', 'getCounts'];
            const countsData = await apiClient.raw.claim.getCounts.query();
            queryClient.setQueryData(countsQueryKey, countsData);
            console.log(`[Prefetch] Counts prefetched successfully`);
          } catch (error) {
            console.error(`[Prefetch] Error prefetching counts:`, error);
            // Don't rethrow - prefetching should fail silently
          }
        }, 500);
      } catch (error) {
        console.error(`[Prefetch] Error setting up counts prefetch:`, error);
        // Don't rethrow - prefetching should fail silently
      }
    } catch (error) {
      console.error(`[Prefetch] Error in cache warming:`, error);
      // Don't rethrow - prefetching should fail silently
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    prefetchSummary,
    prefetchDetails,
    prefetchMultipleSummaries,
    prefetchList,
    isCachedAndFresh,
  };
}

/**
 * Hook for creating a debounced function that only executes after a delay
 */
export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      fn(...args);
      timeoutRef.current = null;
    }, delay);
  }, [fn, delay]);
}

/**
 * Hook for prefetching claim data on hover
 * @deprecated This hook is deprecated and now returns no-op functions
 */
export function usePrefetchOnHover() {
  console.warn("[DEPRECATED] usePrefetchOnHover is deprecated. Server-side prefetching is now used instead.");

  // Return no-op functions
  return {
    handleRowHover: useCallback((id: string) => {
      // No-op function
      console.log(`[Prefetch] Row hover prefetching disabled for ${id}`);
    }, []),

    handleDetailsHover: useCallback((id: string) => {
      // No-op function
      console.log(`[Prefetch] Details hover prefetching disabled for ${id}`);
    }, []),
  };
}

/**
 * Hook for manually controlling claim cache
 * Provides functions to invalidate and refresh claim data
 */
export function useManualCacheControl() {
  const queryClient = useQueryClient();

  /**
   * Manually invalidate claim data
   * This will force a refetch the next time the data is accessed
   */
  const invalidateClaimData = useCallback((claimId: string) => {
    console.log(`[Cache] Manually invalidating cache for claim ${claimId}`);

    try {
      // Invalidate details
      queryClient.invalidateQueries({
        queryKey: createEntityQueryKey('claim', 'getDetails', claimId),
      });

      // Invalidate summary
      queryClient.invalidateQueries({
        queryKey: createEntityQueryKey('claim', 'getSummary', claimId),
      });

      return true;
    } catch (error) {
      console.error(`[Cache] Error invalidating claim data:`, error);
      return false;
    }
  }, [queryClient]);

  /**
   * Manually refresh claim data
   * This will immediately refetch the data
   */
  const refreshClaimData = useCallback(async (claimId: string) => {
    console.log(`[Cache] Manually refreshing cache for claim ${claimId}`);

    try {
      // Refetch details
      await queryClient.refetchQueries({
        queryKey: createEntityQueryKey('claim', 'getDetails', claimId),
        exact: true,
      });

      // Refetch summary
      await queryClient.refetchQueries({
        queryKey: createEntityQueryKey('claim', 'getSummary', claimId),
        exact: true,
      });

      return true;
    } catch (error) {
      console.error(`[Cache] Error refreshing claim data:`, error);
      return false;
    }
  }, [queryClient]);

  /**
   * Check if claim data is stale
   * Returns true if the data is older than the threshold
   */
  const isClaimDataStale = useCallback((
    claimId: string,
    threshold: number = 30 * 60 * 1000 // 30 minutes
  ) => {
    try {
      // Check details
      const detailsQueryKey = createEntityQueryKey('claim', 'getDetails', claimId);
      const detailsState = queryClient.getQueryState(detailsQueryKey);

      if (detailsState?.dataUpdatedAt) {
        const dataAge = Date.now() - detailsState.dataUpdatedAt;
        return dataAge > threshold;
      }

      // If no details, check summary
      const summaryQueryKey = createEntityQueryKey('claim', 'getSummary', claimId);
      const summaryState = queryClient.getQueryState(summaryQueryKey);

      if (summaryState?.dataUpdatedAt) {
        const dataAge = Date.now() - summaryState.dataUpdatedAt;
        return dataAge > threshold;
      }

      // If neither exists, consider it stale
      return true;
    } catch (error) {
      console.error(`[Cache] Error checking if claim data is stale:`, error);
      return true; // Assume stale on error
    }
  }, [queryClient]);

  /**
   * Get the age of claim data in milliseconds
   * Returns -1 if the data doesn't exist
   */
  const getClaimDataAge = useCallback((claimId: string) => {
    try {
      // Check details
      const detailsQueryKey = createEntityQueryKey('claim', 'getDetails', claimId);
      const detailsState = queryClient.getQueryState(detailsQueryKey);

      if (detailsState?.dataUpdatedAt) {
        return Date.now() - detailsState.dataUpdatedAt;
      }

      // If no details, check summary
      const summaryQueryKey = createEntityQueryKey('claim', 'getSummary', claimId);
      const summaryState = queryClient.getQueryState(summaryQueryKey);

      if (summaryState?.dataUpdatedAt) {
        return Date.now() - summaryState.dataUpdatedAt;
      }

      // If neither exists, return -1
      return -1;
    } catch (error) {
      console.error(`[Cache] Error getting claim data age:`, error);
      return -1; // Return -1 on error
    }
  }, [queryClient]);

  return {
    invalidateClaimData,
    refreshClaimData,
    isClaimDataStale,
    getClaimDataAge,
  };
}

/**
 * Hook for accessing claim data with the hybrid caching strategy
 * This combines the fallback mechanism with proactive caching
 */
export function useHybridClaimData(id: string | undefined | null) {
  const queryClient = useQueryClient();

  // Try to get details first, fall back to getSummary if getDetails fails
  const detailsQuery = api.claim.getDetails.useQuery(
    { id: id || '' },
    {
      enabled: !!id,
      retry: 1,
      retryDelay: 1000,
      staleTime: CACHE_TIMES.STALE_TIME.DETAILS,
      gcTime: CACHE_TIMES.GC_TIME.DETAILS,
      refetchOnWindowFocus: false,
    }
  );

  // If details query fails, try to get summary as fallback
  const summaryQuery = api.claim.getSummary.useQuery(
    { id: id || '' },
    {
      enabled: !!id && detailsQuery.isError,
      retry: 1,
      retryDelay: 1000,
      staleTime: CACHE_TIMES.STALE_TIME.SUMMARY,
      gcTime: CACHE_TIMES.GC_TIME.SUMMARY,
      refetchOnWindowFocus: false,
    }
  );

  // If details query fails but we have a summary, try to fetch details again
  // This helps recover from temporary failures
  useEffect(() => {
    if (id && detailsQuery.isError && summaryQuery.data) {
      // Wait a bit before trying again
      const timer = setTimeout(() => {
        // Use direct query instead of prefetch
        console.log(`[Hybrid] Retrying details fetch for ${id} after failure`);
        try {
          // Invalidate the query to force a refetch
          queryClient.invalidateQueries({
            queryKey: [['trpc', 'claim', 'getDetails'], { input: { id }, type: 'query' }]
          });
        } catch (error) {
          console.error(`[Hybrid] Error retrying details fetch for ${id}:`, error);
        }
      }, 5000); // 5 seconds

      return () => clearTimeout(timer);
    }
  }, [id, detailsQuery.isError, summaryQuery.data, queryClient]);

  // Return details if available, otherwise return summary or error
  if (detailsQuery.data) {
    return {
      data: detailsQuery.data,
      isLoading: detailsQuery.isLoading,
      error: null,
    };
  }

  if (detailsQuery.isError && summaryQuery.data) {
    // If details failed but summary succeeded, return summary with a warning
    console.warn(`Could not load full claim details for ${id}, using summary data instead`);
    return {
      data: {
        ...summaryQuery.data,
        isPartialData: true, // Flag to indicate this is not complete data
      },
      isLoading: false,
      error: null,
    };
  }

  if (detailsQuery.isError && summaryQuery.isError) {
    // Both queries failed
    return {
      data: null,
      isLoading: false,
      error: detailsQuery.error || summaryQuery.error,
    };
  }

  // Still loading
  return {
    data: null,
    isLoading: detailsQuery.isLoading || (detailsQuery.isError && summaryQuery.isLoading),
    error: null,
  };
}
