// src/lib/api/domains/estimates/server-prefetch.server.ts
import 'server-only';
import { cache } from "react";
import { getQueryClient } from "@/lib/api/query-client";
import { createServerCaller } from "@/lib/api/utils/createServerCaller";
import { QUERY_KEYS, CACHE_TIMES } from "./constants";

/**
 * Server-side prefetch for estimate data for a claim
 * This function is cached using React's cache() to deduplicate requests
 *
 * @param claimId The claim ID to prefetch estimate data for
 * @returns The prefetched estimate data
 */
export const prefetchEstimateByClaimServer = cache(async (claimId: string) => {
  console.log(`[Server Prefetch] Prefetching estimate data for claim ${claimId}`);

  try {
    // Create a tRPC caller for server-side
    const caller = await createServerCaller();
    const queryClient = getQueryClient();

    // Check if we already have fresh data in the cache
    const queryKey = QUERY_KEYS.TRPC.GET_BY_CLAIM_ID(claimId);
    const cachedData = queryClient.getQueryData(queryKey);
    const isCachedDataFresh = queryClient.getQueryState(queryKey)?.dataUpdatedAt > Date.now() - 5 * 60 * 1000; // 5 minutes

    if (cachedData && isCachedDataFresh) {
      console.log(`[Server Prefetch] Using cached estimate data for claim ${claimId}`);
      return cachedData;
    }

    // Prefetch the estimate data
    const estimate = await caller.estimate.getByClaimId({ claim_id: claimId });

    // Cache the estimate data with both client-side and tRPC query keys
    queryClient.setQueryData(
      QUERY_KEYS.BY_CLAIM_ID(claimId),
      estimate
    );

    queryClient.setQueryData(
      QUERY_KEYS.TRPC.GET_BY_CLAIM_ID(claimId),
      estimate
    );

    // If we have an estimate, prefetch the estimate lines
    if (estimate) {
      const estimateLines = await caller.estimate.getLinesByEstimateId({ estimate_id: estimate.id });

      // Cache the estimate lines data with both client-side and tRPC query keys
      queryClient.setQueryData(
        QUERY_KEYS.LINES_BY_ESTIMATE_ID(estimate.id),
        estimateLines
      );

      queryClient.setQueryData(
        QUERY_KEYS.TRPC.GET_LINES_BY_ESTIMATE_ID(estimate.id),
        estimateLines
      );

      console.log(`[Server Prefetch] Prefetched ${estimateLines.length} estimate lines for estimate ${estimate.id}`);
    }

    console.log(`[Server Prefetch] Successfully prefetched estimate data for claim ${claimId}`);

    return estimate;
  } catch (error) {
    console.error(`[Server Prefetch] Error prefetching estimate data for claim ${claimId}:`, error);
    return null;
  }
});
