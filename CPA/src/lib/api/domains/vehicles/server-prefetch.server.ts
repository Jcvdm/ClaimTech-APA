import "server-only";
import { createTRPCContext } from "@/server/api/trpc";
import { appRouter } from "@/server/api/root";
import { cache } from "react";
import { type Vehicle } from "./types";

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
 * Server-side prefetch for a vehicle by ID
 * This function is cached using React's cache() to deduplicate requests
 */
export const prefetchVehicleServer = cache(async (vehicleId: string) => {
  try {
    console.log(`[Server Prefetch] Prefetching vehicle ${vehicleId}`);

    // Create a tRPC caller for server-side
    const caller = await createCaller();

    const vehicle = await caller.vehicle.getById({ id: vehicleId })
      .catch((error: Error) => {
        console.error(`[Server Prefetch] Error fetching vehicle ${vehicleId}:`, error);
        return null;
      });

    if (vehicle) {
      console.log(`[Server Prefetch] Successfully prefetched vehicle ${vehicleId}`);
      return vehicle;
    } else {
      console.warn(`[Server Prefetch] No vehicle found with ID ${vehicleId}`);
      return null;
    }
  } catch (error) {
    console.error(`[Server Prefetch] Error prefetching vehicle ${vehicleId}:`, error);
    // Return null instead of throwing to prevent the page from failing to render
    return null;
  }
});
