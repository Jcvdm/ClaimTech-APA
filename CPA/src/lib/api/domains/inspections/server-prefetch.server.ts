// src/lib/api/domains/inspections/server-prefetch.server.ts
import "server-only";
import { cache } from "react";
import { QueryClient } from "@tanstack/react-query";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";
import superjson from "superjson";
import { createServerSideHelpers } from "@trpc/react-query/server";
import { QUERY_KEYS } from "./constants";
import { QUERY_KEYS as CLAIM_QUERY_KEYS } from "@/lib/api/domains/claims/constants";
import { QUERY_KEYS as VEHICLE_QUERY_KEYS } from "@/lib/api/domains/vehicles/constants";

// Create a new QueryClient instance for server-side rendering
const getQueryClient = cache(() => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
  },
}));

// Create a server-side TRPC helper
const createServerTrpc = async () => {
  return createServerSideHelpers({
    router: appRouter,
    ctx: await createTRPCContext({
      headers: new Headers(),
    }),
    transformer: superjson,
  });
};

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
    const queryKey = ["trpc", "inspection", "getByClaim", { input: { claim_id: claimId }, type: "query" }];
    const cachedData = queryClient.getQueryData(queryKey);
    const isCachedDataFresh = queryClient.getQueryState(queryKey)?.dataUpdatedAt > Date.now() - 5 * 60 * 1000; // 5 minutes

    if (cachedData && isCachedDataFresh) {
      console.log(`[Server Prefetch] Using cached inspections data for claim ${claimId}`);
      return cachedData;
    }

    // Create a server-side TRPC helper
    const serverTrpc = await createServerTrpc();

    // Fetch inspections
    const inspections = await serverTrpc.inspection.getByClaim.fetch({ claim_id: claimId })
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

/**
 * Server-side prefetch for all data needed for the inspection form
 * This function prefetches claim, vehicle, and inspection data
 */
export const prefetchInspectionFormDataServer = cache(async (claimId: string) => {
  try {
    console.log(`[Server Prefetch] Prefetching all data for inspection form for claim ${claimId}`);

    // Get the query client for hydration
    const queryClient = getQueryClient();

    // Create a server-side TRPC helper
    const serverTrpc = await createServerTrpc();

    // Prefetch claim data
    const claim = await serverTrpc.claim.getById.fetch({ id: claimId })
      .catch((error: Error) => {
        console.error(`[Server Prefetch] Error fetching claim ${claimId}:`, error);
        return null;
      });

    if (!claim) {
      throw new Error(`Claim ${claimId} not found`);
    }

    // Set claim data in the query client
    const claimQueryKey = ["trpc", "claim", "getById", { input: { id: claimId }, type: "query" }];
    queryClient.setQueryData(claimQueryKey, claim);

    // Also set the data in the client-side query key format
    if (CLAIM_QUERY_KEYS.detail) {
      queryClient.setQueryData(CLAIM_QUERY_KEYS.detail(claimId), claim);
    }

    // Prefetch vehicle data if available
    if (claim.vehicle_id) {
      const vehicle = await serverTrpc.vehicle.getById.fetch({ id: claim.vehicle_id })
        .catch((error: Error) => {
          console.error(`[Server Prefetch] Error fetching vehicle ${claim.vehicle_id}:`, error);
          return null;
        });

      if (vehicle) {
        // Set vehicle data in the query client
        const vehicleQueryKey = ["trpc", "vehicle", "getById", { input: { id: claim.vehicle_id }, type: "query" }];
        queryClient.setQueryData(vehicleQueryKey, vehicle);

        // Also set the data in the client-side query key format
        queryClient.setQueryData(VEHICLE_QUERY_KEYS.detail(claim.vehicle_id), vehicle);
      }
    }

    // Prefetch inspections
    await prefetchInspectionsByClaimServer(claimId);

    console.log(`[Server Prefetch] Successfully prefetched all data for inspection form for claim ${claimId}`);
    return true;
  } catch (error) {
    console.error(`[Server Prefetch] Error prefetching data for inspection form for claim ${claimId}:`, error);
    return false;
  }
});
