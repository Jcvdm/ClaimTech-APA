'use client';

import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/trpc/react';
import { getQueryKey } from '@trpc/react-query';
import { QUERY_KEYS, CACHE_TIMES } from './constants';

// Constants for prefetching behavior
const PREFETCH_DEBOUNCE_MS = 300; // Debounce hover events
const PREFETCH_COOLDOWN_MS = 10000; // Don't prefetch the same claim within 10 seconds

/**
 * Hook for prefetching claim data when hovering over a claim in the list
 * This is designed to work with server-side prefetching
 */
export function usePrefetchClaim() {
  const queryClient = useQueryClient();
  const lastPrefetchTime = useRef<Record<string, number>>({});
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  
  /**
   * Check if data is already cached and fresh
   */
  const isCachedAndFresh = useCallback((queryKey: unknown[], staleTime: number) => {
    const query = queryClient.getQueryCache().find(queryKey);
    if (!query) return false;
    
    const state = query.state;
    if (!state.data) return false;
    
    const dataUpdatedAt = state.dataUpdatedAt;
    return Date.now() - dataUpdatedAt < staleTime;
  }, [queryClient]);
  
  /**
   * Prefetch claim summary data
   */
  const prefetchSummary = useCallback(async (id: string) => {
    try {
      // Skip if on cooldown
      const now = Date.now();
      const lastTime = lastPrefetchTime.current[`summary-${id}`] || 0;
      if (now - lastTime < PREFETCH_COOLDOWN_MS) {
        console.log(`[Prefetch] Summary for ${id} skipped (on cooldown)`);
        return;
      }
      
      // Skip if already cached and fresh
      const queryKey = getQueryKey(api.claim.getSummary, { id });
      if (isCachedAndFresh(queryKey, CACHE_TIMES.STALE_TIME.SUMMARY)) {
        console.log(`[Prefetch] Summary for ${id} skipped (fresh in cache)`);
        return;
      }
      
      // Update last prefetch time
      lastPrefetchTime.current[`summary-${id}`] = now;
      
      console.log(`[Prefetch] Prefetching summary for ${id}`);
      
      // Use prefetchQuery for better integration with React Query
      await queryClient.prefetchQuery({
        queryKey,
        queryFn: () => api.claim.getSummary.query({ id }),
        staleTime: CACHE_TIMES.STALE_TIME.SUMMARY,
      });
      
      console.log(`[Prefetch] Summary for ${id} prefetched successfully`);
    } catch (error) {
      console.error(`[Prefetch] Error prefetching summary for ${id}:`, error);
      // Don't rethrow - prefetching should fail silently
    }
  }, [queryClient, isCachedAndFresh]);
  
  /**
   * Prefetch claim details data
   */
  const prefetchDetails = useCallback(async (id: string) => {
    try {
      // Skip if on cooldown
      const now = Date.now();
      const lastTime = lastPrefetchTime.current[`details-${id}`] || 0;
      if (now - lastTime < PREFETCH_COOLDOWN_MS) {
        console.log(`[Prefetch] Details for ${id} skipped (on cooldown)`);
        return;
      }
      
      // Skip if already cached and fresh
      const queryKey = getQueryKey(api.claim.getDetails, { id });
      if (isCachedAndFresh(queryKey, CACHE_TIMES.STALE_TIME.DETAILS)) {
        console.log(`[Prefetch] Details for ${id} skipped (fresh in cache)`);
        return;
      }
      
      // Update last prefetch time
      lastPrefetchTime.current[`details-${id}`] = now;
      
      console.log(`[Prefetch] Prefetching details for ${id}`);
      
      // Use prefetchQuery for better integration with React Query
      await queryClient.prefetchQuery({
        queryKey,
        queryFn: () => api.claim.getDetails.query({ id }),
        staleTime: CACHE_TIMES.STALE_TIME.DETAILS,
      });
      
      console.log(`[Prefetch] Details for ${id} prefetched successfully`);
    } catch (error) {
      console.error(`[Prefetch] Error prefetching details for ${id}:`, error);
      // Don't rethrow - prefetching should fail silently
    }
  }, [queryClient, isCachedAndFresh]);
  
  /**
   * Prefetch both summary and details data
   */
  const prefetchClaimData = useCallback(async (id: string) => {
    try {
      // Prefetch both in parallel
      await Promise.all([
        prefetchSummary(id),
        prefetchDetails(id)
      ]);
    } catch (error) {
      console.error(`[Prefetch] Error prefetching claim data for ${id}:`, error);
      // Don't rethrow - prefetching should fail silently
    }
  }, [prefetchSummary, prefetchDetails]);
  
  /**
   * Debounced prefetch function for row hover
   */
  const debouncedPrefetch = useCallback((id: string) => {
    // Clear any existing timer for this ID
    if (debounceTimers.current[id]) {
      clearTimeout(debounceTimers.current[id]);
    }
    
    // Set a new timer
    debounceTimers.current[id] = setTimeout(() => {
      prefetchClaimData(id);
      delete debounceTimers.current[id];
    }, PREFETCH_DEBOUNCE_MS);
  }, [prefetchClaimData]);
  
  /**
   * Handler for row hover
   */
  const handleRowHover = useCallback((id: string) => {
    debouncedPrefetch(id);
  }, [debouncedPrefetch]);
  
  /**
   * Handler for "Open Claim" button hover
   * This prefetches immediately without debounce
   */
  const handleOpenClaimHover = useCallback((id: string) => {
    prefetchClaimData(id);
  }, [prefetchClaimData]);
  
  // Clean up any timers on unmount
  useCallback(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(timer => {
        clearTimeout(timer);
      });
    };
  }, []);
  
  return {
    handleRowHover,
    handleOpenClaimHover,
    prefetchClaimData
  };
}
