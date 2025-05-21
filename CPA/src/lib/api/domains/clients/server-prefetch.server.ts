import "server-only";
import { cache } from "react";
import { createServerCaller } from "@/lib/api/utils/createServerCaller";
import { type Client } from "./types";

/**
 * Server-side prefetch for all clients
 * This function is cached using React's cache() to deduplicate requests
 */
export const prefetchClientsServer = cache(async () => {
  try {
    console.log(`[Server Prefetch] Prefetching all clients`);

    // Create a tRPC caller for server-side
    const caller = await createServerCaller();

    try {
      // First try to use getAll which doesn't require input parameters
      const allClients = await caller.client.getAll();
      console.log(`[Server Prefetch] Successfully prefetched ${allClients.length} clients using getAll`);
      return allClients;
    } catch (getAllError) {
      console.error(`[Server Prefetch] Error fetching clients with getAll:`, getAllError);

      // Fallback to list with default parameters
      try {
        const clientsResponse = await caller.client.list({
          page: 1,
          limit: 100 // Fetch more clients to ensure we get all
        });

        if (clientsResponse && clientsResponse.items) {
          console.log(`[Server Prefetch] Successfully prefetched ${clientsResponse.items.length} clients using list`);
          return clientsResponse.items;
        } else {
          console.warn(`[Server Prefetch] No clients found using list`);
          return [];
        }
      } catch (listError) {
        console.error(`[Server Prefetch] Error fetching clients with list:`, listError);
        return [];
      }
    }
  } catch (error) {
    console.error(`[Server Prefetch] Error prefetching clients:`, error);
    // Return empty array instead of throwing to prevent the page from failing to render
    return [];
  }
});

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
