import "server-only";
import { cache } from "react";
import { createServerCaller } from "@/lib/api/utils/createServerCaller";
import { getQueryClient } from "@/trpc/query-client";
import { type ClaimLog } from "./types";
import { QUERY_KEYS } from "./constants";

/**
 * Server-side prefetch for logs related to a claim
 * This function is cached using React's cache() to deduplicate requests
 */
export const prefetchClaimLogsServer = cache(async (claimId: string, limit: number = 10) => {
  try {
    if (!claimId) {
      console.error('[Server Prefetch] Invalid claim ID provided to prefetchClaimLogsServer');
      return [];
    }

    console.log(`[Server Prefetch] Prefetching logs for claim ${claimId}`);

    // Get the query client for hydration
    const queryClient = getQueryClient();

    // Create a tRPC caller for server-side
    const caller = await createServerCaller();

    // Fetch logs for the claim
    const logs = await caller.log.getByClaim({
      claim_id: claimId,
      limit
    }).catch((error: Error) => {
      console.error(`[Server Prefetch] Error fetching logs for claim ${claimId}:`, error);
      return null;
    });

    if (logs) {
      console.log(`[Server Prefetch] Successfully prefetched ${logs.length} logs for claim ${claimId}`);

      // Hydrate the query client with the logs data using the correct query key format
      const queryKey = QUERY_KEYS.byClaim(claimId, limit);
      queryClient.setQueryData(queryKey, logs);

      // Also set the data in the tRPC query key format
      const trpcQueryKey = QUERY_KEYS.TRPC.GET_BY_CLAIM({ claim_id: claimId, limit });
      queryClient.setQueryData(trpcQueryKey, logs);

      return logs;
    } else {
      console.warn(`[Server Prefetch] No logs found for claim ${claimId}`);
      return [];
    }
  } catch (error) {
    console.error(`[Server Prefetch] Error prefetching logs for claim ${claimId}:`, error);

    // Log more detailed error information
    if (error instanceof Error) {
      console.error(`[Server Prefetch] Error message: ${error.message}`);
      console.error(`[Server Prefetch] Error stack: ${error.stack}`);
    }

    return [];
  }
});
