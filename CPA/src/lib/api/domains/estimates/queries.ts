// src/lib/api/domains/estimates/queries.ts
import { apiClient } from "@/lib/api/client";
import { type QueryOptions } from "@/lib/api/client";
import { type Estimate, type EstimateLine } from "./types";
import { CACHE_TIMES, QUERY_KEYS } from "./constants";

export const estimateQueries = {
  /**
   * Get estimate by claim ID
   * @param claimId The claim ID
   * @param options Additional query options
   */
  getByClaimId: (claimId: string, options?: QueryOptions<Estimate | null>) =>
    apiClient.query<Estimate | null>(
      () => apiClient.raw.estimate.getByClaimId.useQuery({ claim_id: claimId }),
      {
        enabled: !!claimId,
        staleTime: CACHE_TIMES.STALE_TIME.DETAILS,
        gcTime: CACHE_TIMES.GC_TIME.DETAILS,
        ...options
      }
    ),

  /**
   * Get estimate by ID
   * @param id The estimate ID
   * @param options Additional query options
   */
  getById: (id: string, options?: QueryOptions<Estimate>) =>
    apiClient.query<Estimate>(
      () => apiClient.raw.estimate.getById.useQuery({ id }),
      {
        enabled: !!id,
        staleTime: CACHE_TIMES.STALE_TIME.DETAILS,
        gcTime: CACHE_TIMES.GC_TIME.DETAILS,
        ...options
      }
    ),

  /**
   * Get estimate lines by estimate ID
   * @param estimateId The estimate ID
   * @param options Additional query options
   */
  getLinesByEstimateId: (estimateId: string, options?: QueryOptions<EstimateLine[]>) =>
    apiClient.query<EstimateLine[]>(
      () => apiClient.raw.estimate.getLinesByEstimateId.useQuery({ estimate_id: estimateId }),
      {
        enabled: !!estimateId,
        staleTime: CACHE_TIMES.STALE_TIME.LINES,
        gcTime: CACHE_TIMES.GC_TIME.LINES,
        ...options
      }
    ),
};
