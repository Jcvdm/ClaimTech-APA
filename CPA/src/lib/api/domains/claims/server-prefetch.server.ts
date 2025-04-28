import "server-only";
import { createTRPCContext } from "@/server/api/trpc";
import { createCaller } from "@/server/api/root";
import { cache } from "react";
import { NextRequest } from "next/server";

/**
 * Create a server-side tRPC caller
 * This is different from the RSC api import from @/trpc/server.server
 */
const createServerCaller = async () => {
  try {
    // Create a mock request object with headers
    const mockRequest = new NextRequest('http://localhost:3000', {
      headers: {
        'x-trpc-source': 'server',
        'content-type': 'application/json',
      },
    });

    // Create a proper context with the mock request
    const ctx = await createTRPCContext({
      headers: mockRequest.headers,
      request: mockRequest,
    });

    // Use the createCaller from root.ts with our context
    return createCaller(ctx);
  } catch (error) {
    console.error('[Server Caller] Error creating server caller:', error);
    throw error;
  }
};

/**
 * Server-side prefetch for a single claim with all related data
 * This function is cached using React's cache() to deduplicate requests
 */
export const prefetchClaimServer = cache(async (id: string) => {
  try {
    console.log(`[Server Prefetch] Starting prefetch for claim ${id}`);

    // Create a tRPC caller for server-side
    const caller = await createServerCaller();

    // First, fetch claim data to get related IDs
    const [summary, details] = await Promise.all([
      caller.claim.getSummary({ id })
        .catch((error: Error) => {
          console.error(`[Server Prefetch] Error fetching claim summary for ${id}:`, error);
          return null;
        }),
      caller.claim.getDetails({ id })
        .catch((error: Error) => {
          console.error(`[Server Prefetch] Error fetching claim details for ${id}:`, error);
          return null;
        })
    ]);

    if (!summary && !details) {
      console.warn(`[Server Prefetch] No data found for claim ${id}`);
      return {
        summary: null,
        details: null,
        appointments: [],
        attachments: [],
        vehicle: null,
        client: null,
        provinces: [],
        lossAdjusters: []
      };
    }

    // Extract IDs for related entities
    const clientId = details?.client_id;
    const vehicleId = details?.vehicle_id;

    // Prefetch all related data in parallel
    const [
      appointmentsData,
      attachmentsData,
      vehicleData,
      clientData,
      provincesData,
      lossAdjustersData
    ] = await Promise.all([
      // Appointments for this claim
      caller.appointment.getByClaim({ claim_id: id })
        .catch((error: Error) => {
          console.error(`[Server Prefetch] Error fetching appointments for claim ${id}:`, error);
          return [];
        }),

      // Attachments for this claim
      caller.attachment.getByClaim({ claim_id: id })
        .catch((error: Error) => {
          console.error(`[Server Prefetch] Error fetching attachments for claim ${id}:`, error);
          return [];
        }),

      // Vehicle data if available
      vehicleId
        ? caller.vehicle.getById({ id: vehicleId })
            .catch((error: Error) => {
              console.error(`[Server Prefetch] Error fetching vehicle ${vehicleId}:`, error);
              return null;
            })
        : Promise.resolve(null),

      // Client data if available
      clientId
        ? caller.client.getById({ id: clientId })
            .catch((error: Error) => {
              console.error(`[Server Prefetch] Error fetching client ${clientId}:`, error);
              return null;
            })
        : Promise.resolve(null),

      // Reference data - provinces
      caller.lookup.getProvinces()
        .catch((error: Error) => {
          console.error(`[Server Prefetch] Error fetching provinces:`, error);
          return [];
        }),

      // Reference data - loss adjusters
      caller.lookup.getLossAdjusters()
        .catch((error: Error) => {
          console.error(`[Server Prefetch] Error fetching loss adjusters:`, error);
          return [];
        })
    ]);

    console.log(`[Server Prefetch] Successfully prefetched all data for claim ${id}`);

    return {
      summary,
      details,
      appointments: appointmentsData,
      attachments: attachmentsData,
      vehicle: vehicleData,
      client: clientData,
      provinces: provincesData,
      lossAdjusters: lossAdjustersData
    };
  } catch (error) {
    console.error(`[Server Prefetch] Error prefetching claim ${id}:`, error);

    // Log more detailed error information
    if (error instanceof Error) {
      console.error(`[Server Prefetch] Error message: ${error.message}`);
      console.error(`[Server Prefetch] Error stack: ${error.stack}`);

      // Check for specific tRPC errors
      if (error.message.includes('No procedure found')) {
        console.error(`[Server Prefetch] tRPC procedure not found. This may indicate an issue with the server-side caller configuration.`);
      }
    }

    // Return empty data instead of throwing to prevent the page from failing to render
    return {
      summary: null,
      details: null,
      appointments: [],
      attachments: [],
      vehicle: null,
      client: null,
      provinces: [],
      lossAdjusters: []
    };
  }
});

/**
 * Server-side prefetch for multiple claim summaries
 * This function is cached using React's cache() to deduplicate requests
 */
export const prefetchClaimsServer = cache(async (ids: string[]) => {
  const BATCH_SIZE = 5;
  const all: any[] = [];

  try {
    console.log(`[Server Prefetch] Prefetching ${ids.length} claims in batches of ${BATCH_SIZE}`);

    // Create a tRPC caller for server-side
    const caller = await createServerCaller();

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      console.log(`[Server Prefetch] Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(ids.length/BATCH_SIZE)}`);

      // Use Promise.allSettled to handle individual failures without failing the entire batch
      const settledResults = await Promise.allSettled(batch.map((id) =>
        caller.claim.getSummary({ id }) // Use direct caller syntax
          .catch((error: Error) => {
            console.error(`[Server Prefetch] Error fetching claim summary for ${id}:`, error);
            return null;
          })
      ));

      // Filter out failed promises and add successful ones to the result array
      const successfulResults = settledResults
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value)
        .filter(Boolean); // Filter out null values

      all.push(...successfulResults);
    }

    console.log(`[Server Prefetch] Successfully prefetched ${all.length} claims`);
    return all;
  } catch (error) {
    console.error(`[Server Prefetch] Error prefetching multiple claims:`, error);

    // Log more detailed error information
    if (error instanceof Error) {
      console.error(`[Server Prefetch] Error message: ${error.message}`);
      console.error(`[Server Prefetch] Error stack: ${error.stack}`);

      // Check for specific tRPC errors
      if (error.message.includes('No procedure found')) {
        console.error(`[Server Prefetch] tRPC procedure not found. This may indicate an issue with the server-side caller configuration.`);
      }
    }

    // Return empty array instead of throwing to prevent the page from failing to render
    return [];
  }
});

/**
 * Helper function to fetch claim IDs for the claims list page
 * In a real implementation, this would likely use pagination parameters
 */
export const fetchClaimIdsServer = cache(async (limit: number = 20) => {
  try {
    // Create a tRPC caller for server-side
    const caller = await createServerCaller();

    const claims = await caller.claim.getAll(); // Use direct caller syntax
    console.log(`[Server Prefetch] Successfully fetched ${claims.length} claim IDs`);
    return claims.slice(0, limit).map((claim: { id: string }) => claim.id);
  } catch (error) {
    console.error(`[Server Prefetch] Error fetching claim IDs:`, error);

    // Log more detailed error information
    if (error instanceof Error) {
      console.error(`[Server Prefetch] Error message: ${error.message}`);
      console.error(`[Server Prefetch] Error stack: ${error.stack}`);

      // Check for specific tRPC errors
      if (error.message.includes('No procedure found')) {
        console.error(`[Server Prefetch] tRPC procedure not found. This may indicate an issue with the server-side caller configuration.`);
      }
    }

    return [];
  }
});
