import "server-only";
import { cache } from "react";
import { createServerCaller } from "@/lib/api/utils/createServerCaller";
import { type ClaimCountsResponse } from "./types";

// Default counts to use as fallback
const DEFAULT_COUNTS: ClaimCountsResponse = {
  active: 0,
  additionals: 0,
  frc: 0,
  finalized: 0,
  history: 0
};

/**
 * Server-side prefetch for claim counts
 * This function is cached using React's cache() to deduplicate requests
 */
export const prefetchClaimCountsServer = cache(async () => {
  try {
    console.log(`[Server Prefetch] Prefetching claim counts`);

    // Create a tRPC caller for server-side
    const caller = await createServerCaller();

    // Create a timeout promise to prevent hanging
    const timeoutPromise = new Promise<ClaimCountsResponse>((resolve) => {
      setTimeout(() => {
        console.log('[Server Prefetch] Timeout fetching claim counts, using default values');
        resolve(DEFAULT_COUNTS);
      }, 5000); // 5 second timeout
    });

    // Call the getCounts procedure with a timeout
    const countsPromise = caller.claim.getCounts()
      .catch((error: Error) => {
        console.error(`[Server Prefetch] Error fetching claim counts:`, error);
        return null;
      });

    // Race the fetch against the timeout
    const counts = await Promise.race([countsPromise, timeoutPromise]);

    if (counts) {
      console.log(`[Server Prefetch] Successfully prefetched claim counts`);

      // Validate the response
      if (typeof counts !== 'object') {
        console.warn('[Server Prefetch] Invalid response format, using default values');
        return DEFAULT_COUNTS;
      }

      // Ensure all required properties exist
      const safeData: ClaimCountsResponse = {
        active: typeof counts.active === 'number' ? counts.active : 0,
        additionals: typeof counts.additionals === 'number' ? counts.additionals : 0,
        frc: typeof counts.frc === 'number' ? counts.frc : 0,
        finalized: typeof counts.finalized === 'number' ? counts.finalized : 0,
        history: typeof counts.history === 'number' ? counts.history : 0
      };

      return safeData;
    } else {
      console.warn(`[Server Prefetch] No claim counts found`);
      return DEFAULT_COUNTS;
    }
  } catch (error) {
    console.error(`[Server Prefetch] Error prefetching claim counts:`, error);

    // Log more detailed error information
    if (error instanceof Error) {
      console.error(`[Server Prefetch] Error message: ${error.message}`);
      console.error(`[Server Prefetch] Error stack: ${error.stack}`);
    }

    // Return default counts instead of throwing to prevent the page from failing to render
    return DEFAULT_COUNTS;
  }
});
