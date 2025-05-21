'use client';

import { useState, useEffect } from 'react';
import { useServerCounts } from '@/components/layout/useServerCounts';
import { useClaimCounts } from './hooks';
import { type ClaimCountsResponse } from './types';

/**
 * Hook that combines server-rendered counts with client-side query cache
 * - Uses server-rendered counts for initial render to avoid flash of empty content
 * - Switches to client-side query cache when it's updated
 * - This provides the best of both worlds: fast initial loads and real-time updates
 */
export function useHybridClaimCounts(): ClaimCountsResponse {
  // Get the server-rendered counts
  const serverCounts = useServerCounts();
  
  // Get the client-side query cache
  const { 
    data: clientCounts, 
    isLoading,
    isError 
  } = useClaimCounts();
  
  // Track whether we've received client-side data
  const [hasClientData, setHasClientData] = useState(false);
  
  // When client-side data is loaded, switch to using it
  useEffect(() => {
    if (clientCounts && !isLoading && !isError) {
      setHasClientData(true);
    }
  }, [clientCounts, isLoading, isError]);
  
  // Use client-side data if available, otherwise use server-rendered data
  return hasClientData && clientCounts ? clientCounts : serverCounts;
}
