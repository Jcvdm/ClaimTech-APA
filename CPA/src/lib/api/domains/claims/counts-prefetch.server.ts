import "server-only";
import { createTRPCContext } from "@/server/api/trpc";
import { appRouter } from "@/server/api/root";
import { cache } from "react";
import { type ClaimCountsResponse } from "./types";

/**
 * Create a server-side tRPC caller
 * This is different from the RSC api import from @/trpc/server.server
 */
const createCaller = async () => {
  // Create headers for the server request
  const heads = new Headers();
  heads.set("x-trpc-source", "server");
  
  const ctx = await createTRPCContext({
    headers: heads,
  });
  
  return appRouter.createCaller(ctx);
};

/**
 * Server-side prefetch for claim counts
 * This function is cached using React's cache() to deduplicate requests
 */
export const prefetchClaimCountsServer = cache(async () => {
  try {
    console.log(`[Server Prefetch] Prefetching claim counts`);
    
    // Create a tRPC caller for server-side
    const caller = await createCaller();
    
    const counts = await caller.claim.getCounts()
      .catch((error: Error) => {
        console.error(`[Server Prefetch] Error fetching claim counts:`, error);
        return null;
      });
    
    if (counts) {
      console.log(`[Server Prefetch] Successfully prefetched claim counts`);
      return counts;
    } else {
      console.warn(`[Server Prefetch] No claim counts found`);
      return {
        active: 0,
        additionals: 0,
        frc: 0,
        finalized: 0,
        history: 0
      };
    }
  } catch (error) {
    console.error(`[Server Prefetch] Error prefetching claim counts:`, error);
    // Return default counts instead of throwing to prevent the page from failing to render
    return {
      active: 0,
      additionals: 0,
      frc: 0,
      finalized: 0,
      history: 0
    };
  }
});
