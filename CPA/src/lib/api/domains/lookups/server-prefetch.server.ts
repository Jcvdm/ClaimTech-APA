import "server-only";
import { createTRPCContext } from "@/server/api/trpc";
import { appRouter } from "@/server/api/root";
import { cache } from "react";
import { type Province, type LossAdjuster } from "./types";

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
 * Server-side prefetch for provinces
 * This function is cached using React's cache() to deduplicate requests
 */
export const prefetchProvincesServer = cache(async () => {
  try {
    console.log(`[Server Prefetch] Prefetching provinces`);

    // Create a tRPC caller for server-side
    const caller = await createCaller();

    const provinces = await caller.lookup.getProvinces()
      .catch((error: Error) => {
        console.error(`[Server Prefetch] Error fetching provinces:`, error);
        return null;
      });

    if (provinces) {
      console.log(`[Server Prefetch] Successfully prefetched ${provinces.length} provinces`);
      return provinces;
    } else {
      console.warn(`[Server Prefetch] No provinces found`);
      return [];
    }
  } catch (error) {
    console.error(`[Server Prefetch] Error prefetching provinces:`, error);
    // Return empty array instead of throwing to prevent the page from failing to render
    return [];
  }
});

/**
 * Server-side prefetch for loss adjusters
 * This function is cached using React's cache() to deduplicate requests
 */
export const prefetchLossAdjustersServer = cache(async () => {
  try {
    console.log(`[Server Prefetch] Prefetching loss adjusters`);

    // Create a tRPC caller for server-side
    const caller = await createCaller();

    const lossAdjusters = await caller.lookup.getLossAdjusters()
      .catch((error: Error) => {
        console.error(`[Server Prefetch] Error fetching loss adjusters:`, error);
        return null;
      });

    if (lossAdjusters) {
      console.log(`[Server Prefetch] Successfully prefetched ${lossAdjusters.length} loss adjusters`);
      return lossAdjusters;
    } else {
      console.warn(`[Server Prefetch] No loss adjusters found`);
      return [];
    }
  } catch (error) {
    console.error(`[Server Prefetch] Error prefetching loss adjusters:`, error);
    // Return empty array instead of throwing to prevent the page from failing to render
    return [];
  }
});
