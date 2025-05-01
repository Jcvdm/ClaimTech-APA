// src/lib/api/domains/inspections/server-prefetch.server.ts
import "server-only";
import { cache } from "react";
import { getQueryClient } from "@/trpc/query-client";
import { createServerCaller } from "@/lib/api/utils/createServerCaller";
import { QUERY_KEYS } from "./constants";

/**
 * Server-side prefetch for inspections by claim ID
 * This function is cached using React's cache() to deduplicate requests
 * It also hydrates the query client with the prefetched data for client-side use
 */
export const prefetchInspectionsByClaimServer = cache(async (claimId: string) => {
  try {
    console.log(`[Server Prefetch] Prefetching inspections for claim ${claimId}`);

    // Get the query client for hydration
    const queryClient = getQueryClient();

    // Check if we already have fresh data in the cache
    const queryKey = QUERY_KEYS.TRPC.GET_BY_CLAIM(claimId);
    const cachedData = queryClient.getQueryData(queryKey);
    const isCachedDataFresh = queryClient.getQueryState(queryKey)?.dataUpdatedAt > Date.now() - 5 * 60 * 1000; // 5 minutes

    if (cachedData && isCachedDataFresh) {
      console.log(`[Server Prefetch] Using cached inspections data for claim ${claimId}`);
      return cachedData;
    }

    // Create a tRPC caller for server-side
    const caller = await createServerCaller();

    // Fetch inspections
    const inspections = await caller.inspection.getByClaim({ claim_id: claimId })
      .catch((error: Error) => {
        console.error(`[Server Prefetch] Error fetching inspections for claim ${claimId}:`, error);
        return [];
      });

    // Hydrate the query client with the inspections data
    queryClient.setQueryData(
      queryKey,
      inspections
    );

    // Also set the data in the client-side query key format
    queryClient.setQueryData(
      QUERY_KEYS.byClaim(claimId),
      inspections
    );

    console.log(`[Server Prefetch] Successfully prefetched ${inspections.length} inspections for claim ${claimId}`);
    return inspections;
  } catch (error) {
    console.error(`[Server Prefetch] Error prefetching inspections for claim ${claimId}:`, error);
    return [];
  }
});
