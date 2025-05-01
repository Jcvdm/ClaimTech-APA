import "server-only";
import { cache } from "react";
import { createServerCaller } from "@/lib/api/utils/createServerCaller";
import { type Vehicle } from "./types";

/**
 * Server-side prefetch for a vehicle by ID
 * This function is cached using React's cache() to deduplicate requests
 */
export const prefetchVehicleServer = cache(async (vehicleId: string) => {
  try {
    console.log(`[Server Prefetch] Prefetching vehicle ${vehicleId}`);

    // Create a tRPC caller for server-side
    const caller = await createServerCaller();

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
