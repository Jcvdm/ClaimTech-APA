'use client'

import { useHybridClaimData } from '@/lib/api/domains/claims/claimCache';
import type { ClaimWithRelations } from '@/lib/api/domains/claims/types';

interface UseClaimDetailsDataOptions {
  initialData?: any;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Hook for accessing claim data with the hybrid caching strategy
 * This is a thin wrapper around useHybridClaimData from the DAL
 *
 * @param id The claim ID
 * @param options Options for the hook (initialData, enabled, staleTime, gcTime)
 * @returns The claim data, loading state, and error
 */
export function useClaimDetailsData(id: string, options?: UseClaimDetailsDataOptions) {
  return useHybridClaimData(id, options);
}
