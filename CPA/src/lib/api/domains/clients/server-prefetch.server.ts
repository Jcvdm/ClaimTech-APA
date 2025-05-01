import "server-only";
import { cache } from "react";
import { createServerCaller } from "@/lib/api/utils/createServerCaller";
import { type Client } from "./types";

/**
 * Server-side prefetch for a client by ID
 * This function is cached using React's cache() to deduplicate requests
 */
export const prefetchClientServer = cache(async (clientId: string) => {
  try {
    console.log(`[Server Prefetch] Prefetching client ${clientId}`);

    // Create a tRPC caller for server-side
    const caller = await createServerCaller();

    const client = await caller.client.getById({ id: clientId })
      .catch((error: Error) => {
        console.error(`[Server Prefetch] Error fetching client ${clientId}:`, error);
        return null;
      });

    if (client) {
      console.log(`[Server Prefetch] Successfully prefetched client ${clientId}`);
      return client;
    } else {
      console.warn(`[Server Prefetch] No client found with ID ${clientId}`);
      return null;
    }
  } catch (error) {
    console.error(`[Server Prefetch] Error prefetching client ${clientId}:`, error);
    // Return null instead of throwing to prevent the page from failing to render
    return null;
  }
});
