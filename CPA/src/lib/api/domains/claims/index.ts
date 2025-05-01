// src/lib/api/domains/claims/index.ts
// Re-export everything for convenient imports
export * from './types';
export * from './constants';

// Import hooks and claimCache with renamed exports to avoid conflicts
import * as hooksExports from './hooks';
import * as cacheExports from './claimCache';

// Re-export everything except the conflicting useClaimPrefetching
export const {
  useClaimsList,
  useClaimCounts,
  useClaim,
  useCreateClaim,
  useUpdateClaim,
  useOptimisticUpdateClaimStatus,
  useOptimisticDeleteClaim,
  useInfiniteClaimsList,
  useClaimDetails,
  useClaimSummary,
  useClaimFullDetails,
  useRecordInspection
} = hooksExports;

// Re-export everything from claimCache except useClaimPrefetching
export const {
  useIsCachedAndFresh,
  useDebounce,
  usePrefetchOnHover,
  useManualCacheControl,
  useHybridClaimData
} = cacheExports;

// Export the useClaimPrefetching from claimCache as the canonical version
export const { useClaimPrefetching } = cacheExports;

// Export server-prefetch utilities
// export * from './server-prefetch.server'; // moved to server components only

// Export raw queries and mutations for advanced use cases
import { claimQueries } from './queries';
import { claimMutations } from './mutations';

export const claimsApi = {
  queries: claimQueries,
  mutations: claimMutations
};
