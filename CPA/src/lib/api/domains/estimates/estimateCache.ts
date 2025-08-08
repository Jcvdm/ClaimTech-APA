'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { api } from '@/trpc/react';
import { CACHE_TIMES, QUERY_KEYS } from './constants';
import { getQueryKey, createEntityQueryKey } from '@/lib/api/utils';
import { apiClient } from '@/lib/api/client';
import { type Estimate, type EstimateLine } from './types';

// Extended cache configuration for estimates - more aggressive caching for editing sessions
const ESTIMATE_CACHE_CONFIG = {
  // Enhanced stale times for editing sessions
  STALE_TIME: {
    ESTIMATE: 30 * 60 * 1000,      // 30 minutes - estimates change less frequently
    LINES: 5 * 60 * 1000,          // 5 minutes - lines change frequently during editing
    ACTIVE_SESSION: 60 * 60 * 1000, // 1 hour - active editing sessions need longer cache
  },
  
  // Extended garbage collection times
  GC_TIME: {
    ESTIMATE: 120 * 60 * 1000,     // 2 hours - keep estimates in memory longer
    LINES: 60 * 60 * 1000,         // 1 hour - keep line data for session continuity
    ACTIVE_SESSION: 240 * 60 * 1000, // 4 hours - very long retention for active sessions
  },

  // Prefetch configuration
  PREFETCH_COOLDOWN: 30 * 1000,    // 30 seconds - more aggressive prefetching
  MAX_BATCH_SIZE: 3,               // Smaller batches for faster initial loading
  BACKGROUND_SYNC_DELAY: 2500,     // 2.5 seconds - align with user activity patterns
};

/**
 * UUID validation helper
 */
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

/**
 * Utility to check if estimate data is already in the cache and fresh
 */
export function useIsCachedAndFresh() {
  const queryClient = useQueryClient();

  return useCallback((queryKey: readonly unknown[], staleTime: number = ESTIMATE_CACHE_CONFIG.STALE_TIME.ESTIMATE) => {
    const state = queryClient.getQueryState(queryKey);
    if (!state || !state.data) return false;

    const dataAge = state.dataUpdatedAt ? Date.now() - state.dataUpdatedAt : Infinity;
    return dataAge < staleTime;
  }, [queryClient]);
}

/**
 * Hook for prefetching estimate data with intelligent caching strategy
 * Implements cache-first approach with background prefetching
 */
export function useEstimatePrefetching() {
  const queryClient = useQueryClient();
  const utils = api.useUtils(); // Get tRPC utils for imperative operations
  const isCachedAndFresh = useIsCachedAndFresh();

  // Track last prefetch time to implement cooldown
  const lastPrefetchTime = useRef<Record<string, number>>({});
  
  // Track abort controllers for cleanup
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Abort all ongoing requests
      abortControllers.current.forEach((controller, key) => {
        controller.abort();
        console.log(`[EstimatePrefetch] Aborted prefetch operation: ${key}`);
      });
      abortControllers.current.clear();
    };
  }, []);
  
  // Track active estimate sessions for enhanced caching
  const activeEstimateSessions = useRef<Set<string>>(new Set());

  /**
   * Mark an estimate as having an active editing session
   */
  const markSessionActive = useCallback((estimateId: string) => {
    console.log(`[EstimatePrefetch] Marking estimate ${estimateId} as having active session`);
    activeEstimateSessions.current.add(estimateId);
  }, []);

  /**
   * Mark an estimate session as inactive
   */
  const markSessionInactive = useCallback((estimateId: string) => {
    console.log(`[EstimatePrefetch] Marking estimate ${estimateId} session as inactive`);
    activeEstimateSessions.current.delete(estimateId);
  }, []);

  /**
   * Check if an estimate has an active editing session
   */
  const isSessionActive = useCallback((estimateId: string) => {
    return activeEstimateSessions.current.has(estimateId);
  }, []);

  /**
   * Prefetch estimate data by claim ID
   */
  const prefetchEstimate = useCallback(async (
    claimId: string,
    options?: { priority?: boolean; force?: boolean }
  ) => {
    // Validate UUID to prevent unnecessary fetch attempts
    if (!claimId || !isValidUUID(claimId)) {
      console.log(`[EstimatePrefetch] Skipping prefetch - invalid claim ID: ${claimId}`);
      return;
    }

    const operationKey = `estimate-${claimId}`;
    
    try {
      // Check if component is still mounted
      if (!isMountedRef.current) {
        console.log(`[EstimatePrefetch] Skipping prefetch for claim ${claimId} - component unmounted`);
        return;
      }

      // Skip if on cooldown (unless forced)
      const now = Date.now();
      const lastTime = lastPrefetchTime.current[operationKey] || 0;
      if (!options?.force && now - lastTime < ESTIMATE_CACHE_CONFIG.PREFETCH_COOLDOWN) {
        console.log(`[EstimatePrefetch] Estimate for claim ${claimId} skipped (on cooldown)`);
        return;
      }

      // Skip if already cached and fresh (unless forced)
      const queryKey = QUERY_KEYS.TRPC.GET_BY_CLAIM_ID(claimId) as unknown as readonly unknown[];
      if (!options?.force && isCachedAndFresh(queryKey, ESTIMATE_CACHE_CONFIG.STALE_TIME.ESTIMATE)) {
        console.log(`[EstimatePrefetch] Estimate for claim ${claimId} skipped (fresh in cache)`);
        return;
      }

      // Create abort controller for this operation
      const abortController = new AbortController();
      abortControllers.current.set(operationKey, abortController);

      // Update last prefetch time
      lastPrefetchTime.current[operationKey] = now;

      console.log(`[EstimatePrefetch] Prefetching estimate for claim ${claimId}`);

      try {
        // Use tRPC utils for proper imperative fetching
        const data = await utils.estimate.getByClaimId.fetch({ claim_id: claimId });

        // Check if still mounted and not aborted
        if (!isMountedRef.current || abortController.signal.aborted) {
          console.log(`[EstimatePrefetch] Prefetch aborted for claim ${claimId}`);
          return;
        }

        // Utils automatically updates the cache, no need for manual setQueryData
        console.log(`[EstimatePrefetch] Estimate for claim ${claimId} prefetched successfully`);
        
        // If we have estimate data, automatically prefetch its lines
        if (data && !options?.force && isMountedRef.current) {
          // Use setTimeout to avoid blocking the main prefetch operation
          setTimeout(() => {
            if (isMountedRef.current) {
              prefetchEstimateLines(data.id, { priority: options?.priority });
            }
          }, 100);
        }
      } catch (innerError) {
        if (innerError.name === 'AbortError') {
          console.log(`[EstimatePrefetch] Prefetch for claim ${claimId} was aborted`);
        } else {
          console.error(`[EstimatePrefetch] Error in direct query for claim ${claimId}:`, innerError);
        }
        // Don't rethrow - prefetching should fail silently
      }
    } catch (error) {
      console.error(`[EstimatePrefetch] Error in prefetchEstimate for claim ${claimId}:`, error);
      // Don't rethrow - prefetching should fail silently
    } finally {
      // Clean up abort controller
      abortControllers.current.delete(operationKey);
    }
  }, [queryClient, isCachedAndFresh]);

  /**
   * Prefetch estimate lines data
   */
  const prefetchEstimateLines = useCallback(async (
    estimateId: string,
    options?: { priority?: boolean; force?: boolean }
  ) => {
    // Validate UUID to prevent unnecessary fetch attempts
    if (!estimateId || !isValidUUID(estimateId)) {
      console.log(`[EstimatePrefetch] Skipping lines prefetch - invalid estimate ID: ${estimateId}`);
      return;
    }

    const operationKey = `lines-${estimateId}`;
    
    try {
      // Check if component is still mounted
      if (!isMountedRef.current) {
        console.log(`[EstimatePrefetch] Skipping lines prefetch for estimate ${estimateId} - component unmounted`);
        return;
      }

      // Skip if on cooldown (unless forced)
      const now = Date.now();
      const lastTime = lastPrefetchTime.current[operationKey] || 0;
      if (!options?.force && now - lastTime < ESTIMATE_CACHE_CONFIG.PREFETCH_COOLDOWN) {
        console.log(`[EstimatePrefetch] Lines for estimate ${estimateId} skipped (on cooldown)`);
        return;
      }

      // Choose appropriate stale time based on session activity
      const staleTime = isSessionActive(estimateId) 
        ? ESTIMATE_CACHE_CONFIG.STALE_TIME.ACTIVE_SESSION 
        : ESTIMATE_CACHE_CONFIG.STALE_TIME.LINES;

      // Skip if already cached and fresh (unless forced)
      const queryKey = QUERY_KEYS.TRPC.GET_LINES_BY_ESTIMATE_ID(estimateId) as unknown as readonly unknown[];
      if (!options?.force && isCachedAndFresh(queryKey, staleTime)) {
        console.log(`[EstimatePrefetch] Lines for estimate ${estimateId} skipped (fresh in cache)`);
        return;
      }

      // Create abort controller for this operation
      const abortController = new AbortController();
      abortControllers.current.set(operationKey, abortController);

      // Update last prefetch time
      lastPrefetchTime.current[operationKey] = now;

      console.log(`[EstimatePrefetch] Prefetching lines for estimate ${estimateId}`);

      try {
        // Use tRPC utils for proper imperative fetching
        const data = await utils.estimate.getLinesByEstimateId.fetch({ estimate_id: estimateId });

        // Check if still mounted and not aborted
        if (!isMountedRef.current || abortController.signal.aborted) {
          console.log(`[EstimatePrefetch] Lines prefetch aborted for estimate ${estimateId}`);
          return;
        }

        // Utils automatically updates the cache, no need for manual setQueryData
        console.log(`[EstimatePrefetch] Lines for estimate ${estimateId} prefetched successfully (${data?.length || 0} lines)`);
      } catch (innerError) {
        if (innerError.name === 'AbortError') {
          console.log(`[EstimatePrefetch] Lines prefetch for estimate ${estimateId} was aborted`);
        } else {
          console.error(`[EstimatePrefetch] Error in direct query for estimate ${estimateId}:`, innerError);
        }
        // Don't rethrow - prefetching should fail silently
      }
    } catch (error) {
      console.error(`[EstimatePrefetch] Error in prefetchEstimateLines for estimate ${estimateId}:`, error);
      // Don't rethrow - prefetching should fail silently
    } finally {
      // Clean up abort controller
      abortControllers.current.delete(operationKey);
    }
  }, [queryClient, isCachedAndFresh, isSessionActive]);

  /**
   * Smart prefetch for estimate tab opening
   * Anticipates user needs when they navigate to the estimate tab
   */
  const prefetchForEstimateTab = useCallback(async (
    claimId: string,
    options?: { priority?: boolean }
  ) => {
    try {
      console.log(`[EstimatePrefetch] Smart prefetch for estimate tab - claim ${claimId}`);

      // First, prefetch the estimate itself
      await prefetchEstimate(claimId, { priority: true, ...options });

      // Give it a moment to complete, then check if we got data
      setTimeout(async () => {
        try {
          const estimateQueryKey = QUERY_KEYS.TRPC.GET_BY_CLAIM_ID(claimId) as unknown as readonly unknown[];
          const estimate = queryClient.getQueryData<Estimate>(estimateQueryKey);
          
          if (estimate) {
            // Mark this session as active for enhanced caching
            markSessionActive(estimate.id);
            
            // Prefetch lines with higher priority
            await prefetchEstimateLines(estimate.id, { priority: true });
          }
        } catch (error) {
          console.error(`[EstimatePrefetch] Error in delayed prefetch for claim ${claimId}:`, error);
        }
      }, 200);
    } catch (error) {
      console.error(`[EstimatePrefetch] Error in prefetchForEstimateTab for claim ${claimId}:`, error);
    }
  }, [prefetchEstimate, prefetchEstimateLines, queryClient, markSessionActive]);

  /**
   * Batch prefetch multiple estimates
   */
  const prefetchMultipleEstimates = useCallback(async (
    claimIds: string[],
    options?: { priorityCount?: number; force?: boolean }
  ) => {
    if (!claimIds.length) return;

    const priorityCount = options?.priorityCount || 0;

    try {
      // Process in batches to avoid overwhelming the network
      for (let i = 0; i < claimIds.length; i += ESTIMATE_CACHE_CONFIG.MAX_BATCH_SIZE) {
        const batch = claimIds.slice(i, i + ESTIMATE_CACHE_CONFIG.MAX_BATCH_SIZE);

        // Process batch in parallel, but handle errors individually
        await Promise.allSettled(batch.map((claimId, index) => {
          const isPriority = index < priorityCount;
          try {
            return prefetchEstimate(claimId, {
              priority: isPriority,
              force: options?.force
            });
          } catch (error) {
            console.error(`[EstimatePrefetch] Error prefetching estimate for claim ${claimId} in batch:`, error);
            return Promise.resolve(); // Continue with other prefetches even if one fails
          }
        }));
      }
    } catch (error) {
      console.error(`[EstimatePrefetch] Error in prefetchMultipleEstimates:`, error);
      // Don't rethrow - we want to fail silently for prefetching
    }
  }, [prefetchEstimate]);

  /**
   * Warm the cache on initial load
   */
  useEffect(() => {
    try {
      console.log('[EstimatePrefetch] Initializing estimate cache warming');
      
      // Note: We don't pre-warm estimate caches like we do for claims
      // since estimates are more context-specific and tied to claim navigation
      // Instead, we rely on smart prefetching when users navigate to estimate tabs
      
    } catch (error) {
      console.error(`[EstimatePrefetch] Error in cache warming:`, error);
      // Don't rethrow - prefetching should fail silently
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    prefetchEstimate,
    prefetchEstimateLines,
    prefetchForEstimateTab,
    prefetchMultipleEstimates,
    markSessionActive,
    markSessionInactive,
    isSessionActive,
    isCachedAndFresh,
  };
}

/**
 * Hook for manual cache control specific to estimates
 */
export function useEstimateCacheControl() {
  const queryClient = useQueryClient();

  /**
   * Invalidate estimate data with enhanced claim isolation
   */
  const invalidateEstimateData = useCallback((claimId: string, estimateId?: string) => {
    console.log(`[EstimateCache] Manually invalidating cache for claim ${claimId}${estimateId ? `, estimate ${estimateId}` : ''}`);

    try {
      // Invalidate estimate by claim ID (legacy query key)
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.BY_CLAIM_ID(claimId),
      });

      // Invalidate tRPC query keys for estimate by claim
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TRPC.GET_BY_CLAIM_ID(claimId),
      });

      // If we have estimate ID, invalidate lines with both legacy and claim-namespaced keys
      if (estimateId) {
        // Legacy query key
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.LINES_BY_ESTIMATE_ID(estimateId),
        });

        // Claim-namespaced query key
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.LINES_BY_ESTIMATE_ID(estimateId, claimId),
        });

        // tRPC query key for lines
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.TRPC.GET_LINES_BY_ESTIMATE_ID(estimateId, claimId),
        });
      } else {
        // If no specific estimate ID, invalidate all lines for this claim
        // This uses a broader pattern to catch any lines associated with this claim
        queryClient.invalidateQueries({
          predicate: (query) => {
            const queryKey = query.queryKey;
            // Check if this is a lines query that contains our claim namespace
            return Array.isArray(queryKey) && 
                   queryKey.includes('lines') && 
                   queryKey.some(key => typeof key === 'string' && key.includes(`claim:${claimId}`));
          }
        });
      }

      console.log(`[EstimateCache] Successfully invalidated cache for claim ${claimId}`);
      return true;
    } catch (error) {
      console.error(`[EstimateCache] Error invalidating estimate data:`, error);
      return false;
    }
  }, [queryClient]);

  /**
   * Refresh estimate data
   */
  const refreshEstimateData = useCallback(async (claimId: string, estimateId?: string) => {
    console.log(`[EstimateCache] Manually refreshing cache for claim ${claimId}${estimateId ? `, estimate ${estimateId}` : ''}`);

    try {
      // Refetch estimate by claim
      await queryClient.refetchQueries({
        queryKey: QUERY_KEYS.BY_CLAIM_ID(claimId),
        exact: true,
      });

      // If we have estimate ID, also refetch lines
      if (estimateId) {
        await queryClient.refetchQueries({
          queryKey: QUERY_KEYS.LINES_BY_ESTIMATE_ID(estimateId),
          exact: true,
        });
      }

      return true;
    } catch (error) {
      console.error(`[EstimateCache] Error refreshing estimate data:`, error);
      return false;
    }
  }, [queryClient]);

  /**
   * Check if estimate data is stale
   */
  const isEstimateDataStale = useCallback((
    claimId: string,
    estimateId?: string,
    threshold: number = 30 * 60 * 1000 // 30 minutes
  ) => {
    try {
      // Check estimate by claim
      const estimateQueryKey = QUERY_KEYS.TRPC.GET_BY_CLAIM_ID(claimId) as unknown as readonly unknown[];
      const estimateState = queryClient.getQueryState(estimateQueryKey);

      if (estimateState?.dataUpdatedAt) {
        const dataAge = Date.now() - estimateState.dataUpdatedAt;
        if (dataAge > threshold) return true;
      }

      // Check lines if we have estimate ID
      if (estimateId) {
        const linesQueryKey = QUERY_KEYS.TRPC.GET_LINES_BY_ESTIMATE_ID(estimateId) as unknown as readonly unknown[];
        const linesState = queryClient.getQueryState(linesQueryKey);

        if (linesState?.dataUpdatedAt) {
          const dataAge = Date.now() - linesState.dataUpdatedAt;
          return dataAge > threshold;
        }
      }

      // If no data exists, consider it stale
      return !estimateState?.dataUpdatedAt;
    } catch (error) {
      console.error(`[EstimateCache] Error checking if estimate data is stale:`, error);
      return true; // Assume stale on error
    }
  }, [queryClient]);

  return {
    invalidateEstimateData,
    refreshEstimateData,
    isEstimateDataStale,
  };
}

/**
 * Hook for accessing estimate data with hybrid caching strategy
 * Combines cache-first approach with intelligent fallbacks and prefetching
 */
export function useHybridEstimateData(
  claimId: string | undefined | null,
  options?: {
    initialData?: any;
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
    prefetchLines?: boolean;
  }
) {
  const queryClient = useQueryClient();
  const { prefetchEstimateLines, markSessionActive } = useEstimatePrefetching();

  // Log for debugging
  useEffect(() => {
    if (options?.initialData) {
      console.log(`[useHybridEstimateData] Using initialData for claim ${claimId}, skipping fetch`);
    }
  }, [claimId, options?.initialData]);

  // Main estimate query
  const estimateQuery = api.estimate.getByClaimId.useQuery(
    { claim_id: claimId || '' },
    {
      enabled: options?.enabled !== false && !!claimId,
      retry: 2,
      retryDelay: 1000,
      staleTime: options?.staleTime ?? ESTIMATE_CACHE_CONFIG.STALE_TIME.ESTIMATE,
      gcTime: options?.gcTime ?? ESTIMATE_CACHE_CONFIG.GC_TIME.ESTIMATE,
      refetchOnWindowFocus: false,
      initialData: options?.initialData,
    }
  );

  // Auto-prefetch lines when estimate data becomes available
  useEffect(() => {
    if (estimateQuery.data && options?.prefetchLines !== false) {
      // Mark session as active for enhanced caching
      markSessionActive(estimateQuery.data.id);
      
      // Prefetch lines data in the background
      setTimeout(() => {
        prefetchEstimateLines(estimateQuery.data.id, { priority: true });
      }, 100);
    }
  }, [estimateQuery.data, options?.prefetchLines, markSessionActive, prefetchEstimateLines]);

  // Return consolidated data
  return {
    data: estimateQuery.data,
    isLoading: estimateQuery.isLoading,
    error: estimateQuery.error,
    refetch: estimateQuery.refetch,
    isFetching: estimateQuery.isFetching,
  };
}

/**
 * Enhanced hook for estimate lines with session-aware caching
 */
export function useHybridEstimateLines(
  estimateId: string | undefined | null,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
  }
) {
  const { isSessionActive } = useEstimatePrefetching();

  // Determine cache times based on session activity
  const isActive = estimateId ? isSessionActive(estimateId) : false;
  const staleTime = isActive 
    ? ESTIMATE_CACHE_CONFIG.STALE_TIME.ACTIVE_SESSION
    : (options?.staleTime ?? ESTIMATE_CACHE_CONFIG.STALE_TIME.LINES);
  const gcTime = isActive
    ? ESTIMATE_CACHE_CONFIG.GC_TIME.ACTIVE_SESSION
    : (options?.gcTime ?? ESTIMATE_CACHE_CONFIG.GC_TIME.LINES);

  // Lines query with session-aware caching
  const linesQuery = api.estimate.getLinesByEstimateId.useQuery(
    { estimate_id: estimateId || '' },
    {
      enabled: options?.enabled !== false && !!estimateId,
      retry: 2,
      retryDelay: 1000,
      staleTime,
      gcTime,
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Rely on cache-first approach
    }
  );

  return {
    data: linesQuery.data || [],
    isLoading: linesQuery.isLoading,
    error: linesQuery.error,
    refetch: linesQuery.refetch,
    isFetching: linesQuery.isFetching,
  };
}

/**
 * Convenience hook that exports just the invalidateEstimateData function
 * Used when components only need cache invalidation functionality
 */
export function useInvalidateEstimateData() {
  const { invalidateEstimateData } = useEstimateCacheControl();
  return invalidateEstimateData;
}