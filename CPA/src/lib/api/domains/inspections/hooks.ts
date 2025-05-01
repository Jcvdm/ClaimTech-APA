// src/lib/api/domains/inspections/hooks.ts
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useQueryState } from "@/lib/api/hooks";
import { inspectionMutations } from "./mutations";
import { QUERY_KEYS, INSPECTION_CACHE_TIMES } from "./constants";
import { type Inspection } from "./types";
import { QUERY_KEYS as CLAIM_QUERY_KEYS } from "@/lib/api/domains/claims/constants";

/**
 * Hook for getting inspections by claim ID
 * @param claimId The claim ID
 * @param options Query options
 * @returns Query result with inspections
 */
export function useInspectionsByClaim(
  claimId: string | null | undefined,
  options?: {
    initialData?: Inspection[];
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
  }
) {
  // Only fetch if we have a claim ID
  const shouldFetch = options?.enabled !== undefined ? options.enabled && !!claimId : !!claimId;

  return useQueryState(() =>
    apiClient.query<Inspection[]>(
      () => apiClient.raw.inspection.getByClaim.useQuery({ claim_id: claimId || '' }),
      {
        enabled: shouldFetch,
        staleTime: options?.staleTime ?? INSPECTION_CACHE_TIMES.STALE_TIME,
        gcTime: options?.gcTime ?? INSPECTION_CACHE_TIMES.GC_TIME,
        initialData: options?.initialData,
        refetchOnWindowFocus: false,
        refetchInterval: undefined,
      }
    )
  );
}

/**
 * Hook for creating an inspection
 * @returns Mutation object for creating an inspection
 */
export function useCreateInspection() {
  const queryClient = useQueryClient();

  return inspectionMutations.createInspection({
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.byClaim(data.claim_id),
      });

      // Invalidate claim queries to reflect updated status
      queryClient.invalidateQueries({
        queryKey: CLAIM_QUERY_KEYS.detail(data.claim_id),
      });

      queryClient.invalidateQueries({
        queryKey: CLAIM_QUERY_KEYS.summary(data.claim_id),
      });

      // Invalidate claim lists that might contain this claim
      queryClient.invalidateQueries({
        queryKey: CLAIM_QUERY_KEYS.lists(),
      });
    },
  });
}

/**
 * Hook for recording an inspection (simplified version that just updates the claim)
 * This replaces the useRecordInspection hook from the claims domain
 * @returns Mutation object for recording an inspection
 */
export function useRecordInspection() {
  const queryClient = useQueryClient();

  return inspectionMutations.recordInspection({
    onSuccess: (updatedClaim) => {
      // Update the cache for the specific claim
      queryClient.invalidateQueries({
        queryKey: CLAIM_QUERY_KEYS.detail(updatedClaim.id),
      });

      queryClient.invalidateQueries({
        queryKey: CLAIM_QUERY_KEYS.summary(updatedClaim.id),
      });

      // Invalidate lists that might contain this claim
      queryClient.invalidateQueries({
        queryKey: CLAIM_QUERY_KEYS.lists(),
      });

      queryClient.invalidateQueries({
        queryKey: CLAIM_QUERY_KEYS.counts(),
      });
    },
  });
}
