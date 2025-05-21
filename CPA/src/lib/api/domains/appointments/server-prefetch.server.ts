import "server-only";
import { cache } from "react";
import { createServerCaller } from "@/lib/api/utils/createServerCaller";
import { getQueryClient } from "@/lib/api/query-client.server";
import { type Appointment } from "./index";

/**
 * Server-side prefetch for appointments related to a claim
 * This function is cached using React's cache() to deduplicate requests
 */
export const prefetchAppointmentsServer = cache(async (claimId: string) => {
  try {
    if (!claimId) {
      console.error('[Server Prefetch] Invalid claim ID provided to prefetchAppointmentsServer');
      return [];
    }

    console.log(`[Server Prefetch] Prefetching appointments for claim ${claimId}`);

    // Create a tRPC caller for server-side
    const caller = await createServerCaller();

    // Use the correct parameter name (claim_id) as expected by the appointment router
    const appointments = await caller.appointment.getByClaim({ claim_id: claimId })
      .catch((error: Error) => {
        console.error(`[Server Prefetch] Error fetching appointments for claim ${claimId}:`, error);
        return null;
      });

    if (appointments) {
      console.log(`[Server Prefetch] Successfully prefetched ${appointments.length} appointments for claim ${claimId}`);

      // Set the data in the query client cache with the correct query key
      const queryClient = getQueryClient();

      // Cache with the client-side query key
      queryClient.setQueryData(
        ['appointment', 'getByClaim', { claim_id: claimId }],
        appointments
      );

      // Also cache with the tRPC query key for compatibility
      queryClient.setQueryData(
        ['appointment.getByClaim', { input: { claim_id: claimId }, type: 'query' }],
        appointments
      );

      return appointments;
    } else {
      console.warn(`[Server Prefetch] No appointments found for claim ${claimId}`);
      return [];
    }
  } catch (error) {
    console.error(`[Server Prefetch] Error prefetching appointments for claim ${claimId}:`, error);

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
