'use client'

import { useHybridClaimData } from '@/lib/api/domains/claims/claimCache';
import type { ClaimWithRelations } from '@/lib/api/domains/claims/types';

/**
 * Hook for accessing claim data with the hybrid caching strategy
 * This is a thin wrapper around useHybridClaimData from the DAL
 */
export function useClaimDetailsData(id: string) {
  return useHybridClaimData(id);
}
