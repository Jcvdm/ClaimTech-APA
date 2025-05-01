import "server-only";
import { cache } from "react";
import { createServerCaller } from "@/lib/api/utils/createServerCaller";
import { getQueryClient } from "@/trpc/query-client";
import { QUERY_KEYS, CACHE_TIMES } from "./constants";

/**
 * Server-side prefetch for a single claim with all related data
 * This function is cached using React's cache() to deduplicate requests
 * It also hydrates the query client with the prefetched data for client-side use
 *
 * Enhanced with cache checking to avoid unnecessary fetches when data is already available
 */
export const prefetchClaimServer = cache(async (id: string) => {
  try {
    console.log(`[Server Prefetch] Starting prefetch for claim ${id}`);

    // Get the query client for hydration
    const queryClient = getQueryClient();

    // Check if we already have fresh data in the cache
    const summaryKey = QUERY_KEYS.TRPC.SUMMARY(id);
    const detailsKey = QUERY_KEYS.TRPC.DETAILS(id);

    const cachedSummary = queryClient.getQueryData(summaryKey);
    const summaryState = queryClient.getQueryState(summaryKey);
    const summaryUpdatedAt = summaryState?.dataUpdatedAt;

    const cachedDetails = queryClient.getQueryData(detailsKey);
    const detailsState = queryClient.getQueryState(detailsKey);
    const detailsUpdatedAt = detailsState?.dataUpdatedAt;

    // Log cache status for debugging
    console.log(`[Server Prefetch] Cache check for claim ${id}:`, {
      hasSummaryData: !!cachedSummary,
      summaryUpdatedAt: summaryUpdatedAt ? new Date(summaryUpdatedAt).toISOString() : null,
      hasDetailsData: !!cachedDetails,
      detailsUpdatedAt: detailsUpdatedAt ? new Date(detailsUpdatedAt).toISOString() : null
    });

    // Check if data is fresh
    const isSummaryFresh = cachedSummary &&
      summaryUpdatedAt &&
      (Date.now() - summaryUpdatedAt < CACHE_TIMES.STALE_TIME.SUMMARY);

    const isDetailsFresh = cachedDetails &&
      detailsUpdatedAt &&
      (Date.now() - detailsUpdatedAt < CACHE_TIMES.STALE_TIME.DETAILS);

    // Create a tRPC caller for server-side
    const caller = await createServerCaller();

    // Fetch or use cached data
    let summary, details;

    if (isSummaryFresh) {
      console.log(`[Server Prefetch] Using cached summary for claim ${id}`);
      summary = cachedSummary;
    } else {
      console.log(`[Server Prefetch] Fetching fresh summary for claim ${id}`);
      summary = await caller.claim.getSummary({ id })
        .catch((error: Error) => {
          console.error(`[Server Prefetch] Error fetching claim summary for ${id}:`, error);
          return null;
        });

      // Hydrate the query client with the fetched data
      if (summary) {
        queryClient.setQueryData(
          QUERY_KEYS.TRPC.SUMMARY(id),
          summary
        );

        // Also set the data in the client-side query key format
        queryClient.setQueryData(
          QUERY_KEYS.getSummaryKey(id),
          summary
        );
      }
    }

    if (isDetailsFresh) {
      console.log(`[Server Prefetch] Using cached details for claim ${id}`);
      details = cachedDetails;
    } else {
      console.log(`[Server Prefetch] Fetching fresh details for claim ${id}`);
      details = await caller.claim.getDetails({ id })
        .catch((error: Error) => {
          console.error(`[Server Prefetch] Error fetching claim details for ${id}:`, error);
          return null;
        });

      // Hydrate the query client with the fetched data
      if (details) {
        queryClient.setQueryData(
          QUERY_KEYS.TRPC.DETAILS(id),
          details
        );

        // Also set the data in the client-side query key format
        queryClient.setQueryData(
          QUERY_KEYS.getDetailsKey(id),
          details
        );
      }
    }

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

    // Check if we have related data in the cache
    const appointmentsKey = QUERY_KEYS.TRPC.APPOINTMENTS(id);
    const attachmentsKey = QUERY_KEYS.TRPC.ATTACHMENTS(id);

    const cachedAppointments = queryClient.getQueryData(appointmentsKey);
    const appointmentsState = queryClient.getQueryState(appointmentsKey);
    const appointmentsUpdatedAt = appointmentsState?.dataUpdatedAt;

    const cachedAttachments = queryClient.getQueryData(attachmentsKey);
    const attachmentsState = queryClient.getQueryState(attachmentsKey);
    const attachmentsUpdatedAt = attachmentsState?.dataUpdatedAt;

    // Check if vehicle and client data are in cache
    let cachedVehicle = null, cachedClient = null;
    let vehicleUpdatedAt = null, clientUpdatedAt = null;

    if (vehicleId) {
      const vehicleKey = QUERY_KEYS.TRPC.VEHICLE(vehicleId);
      cachedVehicle = queryClient.getQueryData(vehicleKey);
      const vehicleState = queryClient.getQueryState(vehicleKey);
      vehicleUpdatedAt = vehicleState?.dataUpdatedAt;
    }

    if (clientId) {
      const clientKey = QUERY_KEYS.TRPC.CLIENT(clientId);
      cachedClient = queryClient.getQueryData(clientKey);
      const clientState = queryClient.getQueryState(clientKey);
      clientUpdatedAt = clientState?.dataUpdatedAt;
    }

    // Check if data is fresh
    const areAppointmentsFresh = cachedAppointments &&
      appointmentsUpdatedAt &&
      (Date.now() - appointmentsUpdatedAt < CACHE_TIMES.STALE_TIME.DETAILS);

    const areAttachmentsFresh = cachedAttachments &&
      attachmentsUpdatedAt &&
      (Date.now() - attachmentsUpdatedAt < CACHE_TIMES.STALE_TIME.DETAILS);

    const isVehicleFresh = cachedVehicle &&
      vehicleUpdatedAt &&
      (Date.now() - vehicleUpdatedAt < CACHE_TIMES.STALE_TIME.DETAILS);

    const isClientFresh = cachedClient &&
      clientUpdatedAt &&
      (Date.now() - clientUpdatedAt < CACHE_TIMES.STALE_TIME.DETAILS);

    // Prefetch all related data in parallel, only if not fresh in cache
    const [
      appointmentsData,
      attachmentsData,
      vehicleData,
      clientData,
      provincesData,
      lossAdjustersData
    ] = await Promise.all([
      // Appointments for this claim
      areAppointmentsFresh
        ? Promise.resolve(cachedAppointments)
        : caller.appointment.getByClaim({ claim_id: id })
            .catch((error: Error) => {
              console.error(`[Server Prefetch] Error fetching appointments for claim ${id}:`, error);
              return [];
            }),

      // Attachments for this claim
      areAttachmentsFresh
        ? Promise.resolve(cachedAttachments)
        : caller.attachment.getByClaim({ claim_id: id })
            .catch((error: Error) => {
              console.error(`[Server Prefetch] Error fetching attachments for claim ${id}:`, error);
              return [];
            }),

      // Vehicle data if available
      isVehicleFresh
        ? Promise.resolve(cachedVehicle)
        : vehicleId
            ? caller.vehicle.getById({ id: vehicleId })
                .catch((error: Error) => {
                  console.error(`[Server Prefetch] Error fetching vehicle ${vehicleId}:`, error);
                  return null;
                })
            : Promise.resolve(null),

      // Client data if available
      isClientFresh
        ? Promise.resolve(cachedClient)
        : clientId
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

    // Hydrate the query client with the related data
    if (appointmentsData.length > 0 && !areAppointmentsFresh) {
      queryClient.setQueryData(
        QUERY_KEYS.TRPC.APPOINTMENTS(id),
        appointmentsData
      );
    }

    if (attachmentsData.length > 0 && !areAttachmentsFresh) {
      queryClient.setQueryData(
        QUERY_KEYS.TRPC.ATTACHMENTS(id),
        attachmentsData
      );
    }

    if (vehicleId && vehicleData && !isVehicleFresh) {
      queryClient.setQueryData(
        QUERY_KEYS.TRPC.VEHICLE(vehicleId),
        vehicleData
      );
    }

    if (clientId && clientData && !isClientFresh) {
      queryClient.setQueryData(
        QUERY_KEYS.TRPC.CLIENT(clientId),
        clientData
      );
    }

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
 * It also hydrates the query client with the prefetched data for client-side use
 */
export const prefetchClaimsServer = cache(async (ids: string[]) => {
  const BATCH_SIZE = 5;
  const all: any[] = [];

  try {
    console.log(`[Server Prefetch] Prefetching ${ids.length} claims in batches of ${BATCH_SIZE}`);

    // Get the query client for hydration
    const queryClient = getQueryClient();

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

      // Hydrate the query client with each successful result
      successfulResults.forEach(claim => {
        if (claim && claim.id) {
          // Set the data in both tRPC and client-side query key formats
          queryClient.setQueryData(
            QUERY_KEYS.TRPC.SUMMARY(claim.id),
            claim
          );

          queryClient.setQueryData(
            QUERY_KEYS.getSummaryKey(claim.id),
            claim
          );
        }
      });

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
 * It also hydrates the query client with the prefetched data for client-side use
 */
export const fetchClaimIdsServer = cache(async (limit: number = 20) => {
  try {
    // Get the query client for hydration
    const queryClient = getQueryClient();

    // Create a tRPC caller for server-side
    const caller = await createServerCaller();

    const claims = await caller.claim.getAll(); // Use direct caller syntax

    // Hydrate the query client with the list data
    queryClient.setQueryData(
      QUERY_KEYS.TRPC.LIST(undefined),
      claims
    );

    // Also set the data in the client-side query key format
    queryClient.setQueryData(
      QUERY_KEYS.LIST,
      claims
    );

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

/**
 * Prefetch the claims list with all data needed for the expandable rows
 * This function fetches the claims list and prefetches the summary data for each claim
 * It also hydrates the query client with all the data for client-side use
 *
 * Enhanced with cache checking to avoid unnecessary fetches when data is already available
 */
export const prefetchClaimsListServer = cache(async (params: any = { filter: 'active', page: 1, limit: 10, sortBy: "created_at", sortOrder: "desc" }) => {
  try {
    console.log(`[Server Prefetch] Prefetching claims list with params:`, params);

    // Get the query client for hydration
    const queryClient = getQueryClient();

    // Check if we already have fresh data in the cache
    const listQueryKey = QUERY_KEYS.TRPC.LIST(params);
    const cachedData = queryClient.getQueryData(listQueryKey);
    const queryState = queryClient.getQueryState(listQueryKey);
    const dataUpdatedAt = queryState?.dataUpdatedAt;

    // Log cache status for debugging
    console.log('[Server Prefetch] Cache check for claims list:', {
      hasCachedData: !!cachedData,
      dataUpdatedAt: dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null,
      fetchStatus: queryState?.fetchStatus,
      status: queryState?.status
    });

    // If we have cached data and it's less than the stale time, use it
    const isCachedDataFresh = cachedData &&
      dataUpdatedAt &&
      (Date.now() - dataUpdatedAt < CACHE_TIMES.STALE_TIME.LIST);

    let claimsList;

    if (isCachedDataFresh) {
      console.log('[Server Prefetch] Using cached claims list data');
      claimsList = cachedData;
    } else {
      console.log('[Server Prefetch] Fetching fresh claims list data');

      // Create a tRPC caller for server-side
      const caller = await createServerCaller();

      // Fetch the claims list
      claimsList = await caller.claim.list(params);

      // Hydrate the query client with the list data
      queryClient.setQueryData(listQueryKey, claimsList);

      // Also set the data in the client-side query key format
      queryClient.setQueryData(['claims', 'list', params], claimsList);

      console.log(`[Server Prefetch] Successfully fetched claims list with ${claimsList.items.length} claims`);
    }

    // Extract claim IDs from the list
    const claimIds = claimsList.items.map((claim: any) => claim.id);

    // Check if we need to prefetch additional data for each claim
    if (claimIds.length > 0) {
      console.log(`[Server Prefetch] Checking cache for ${claimIds.length} claims' summary data`);

      // Filter out claims that already have fresh data in the cache
      const claimsToFetch = claimIds.filter(id => {
        const summaryKey = QUERY_KEYS.TRPC.SUMMARY(id);
        const detailsKey = QUERY_KEYS.TRPC.DETAILS(id);

        const hasSummaryData = !!queryClient.getQueryData(summaryKey);
        const summaryState = queryClient.getQueryState(summaryKey);
        const summaryUpdatedAt = summaryState?.dataUpdatedAt;

        const hasDetailsData = !!queryClient.getQueryData(detailsKey);
        const detailsState = queryClient.getQueryState(detailsKey);
        const detailsUpdatedAt = detailsState?.dataUpdatedAt;

        const isSummaryFresh = hasSummaryData &&
          summaryUpdatedAt &&
          (Date.now() - summaryUpdatedAt < CACHE_TIMES.STALE_TIME.SUMMARY);

        const isDetailsFresh = hasDetailsData &&
          detailsUpdatedAt &&
          (Date.now() - detailsUpdatedAt < CACHE_TIMES.STALE_TIME.DETAILS);

        // Only fetch if either summary or details are missing or stale
        return !isSummaryFresh || !isDetailsFresh;
      });

      if (claimsToFetch.length > 0) {
        console.log(`[Server Prefetch] Prefetching summary data for ${claimsToFetch.length} claims that need updates`);

        // Use the existing prefetchClaimsServer function to prefetch summaries
        await prefetchClaimsServer(claimsToFetch);

        // Prefetch additional data for expandable rows
        const BATCH_SIZE = 5;

        for (let i = 0; i < claimsToFetch.length; i += BATCH_SIZE) {
          const batch = claimsToFetch.slice(i, i + BATCH_SIZE);
          console.log(`[Server Prefetch] Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(claimsToFetch.length/BATCH_SIZE)} for additional data`);

          // Create a tRPC caller for server-side if we haven't already
          const batchCaller = await createServerCaller();

          // Use Promise.allSettled to handle individual failures without failing the entire batch
          await Promise.allSettled(batch.map(async (id) => {
            try {
              // Check if we already have fresh details data
              const detailsKey = QUERY_KEYS.TRPC.DETAILS(id);
              const hasDetailsData = !!queryClient.getQueryData(detailsKey);
              const detailsState = queryClient.getQueryState(detailsKey);
              const detailsUpdatedAt = detailsState?.dataUpdatedAt;

              const isDetailsFresh = hasDetailsData &&
                detailsUpdatedAt &&
                (Date.now() - detailsUpdatedAt < CACHE_TIMES.STALE_TIME.DETAILS);

              let details;

              if (isDetailsFresh) {
                console.log(`[Server Prefetch] Using cached details for claim ${id}`);
                details = queryClient.getQueryData(detailsKey);
              } else {
                // For each claim, prefetch the data needed for expandable rows
                // This includes vehicle and client data
                details = await batchCaller.claim.getDetails({ id });

                if (details) {
                  // Hydrate the query client with the details data
                  queryClient.setQueryData(
                    QUERY_KEYS.TRPC.DETAILS(id),
                    details
                  );

                  // Also set the data in the client-side query key format
                  queryClient.setQueryData(
                    QUERY_KEYS.getDetailsKey(id),
                    details
                  );
                }
              }

              if (details) {
                // Check if we need to fetch vehicle data
                if (details.vehicle_id) {
                  const vehicleKey = QUERY_KEYS.TRPC.VEHICLE(details.vehicle_id);
                  const hasVehicleData = !!queryClient.getQueryData(vehicleKey);

                  if (!hasVehicleData) {
                    const vehicle = await batchCaller.vehicle.getById({ id: details.vehicle_id });
                    if (vehicle) {
                      queryClient.setQueryData(vehicleKey, vehicle);
                    }
                  }
                }

                // Check if we need to fetch client data
                if (details.client_id) {
                  const clientKey = QUERY_KEYS.TRPC.CLIENT(details.client_id);
                  const hasClientData = !!queryClient.getQueryData(clientKey);

                  if (!hasClientData) {
                    const client = await batchCaller.client.getById({ id: details.client_id });
                    if (client) {
                      queryClient.setQueryData(clientKey, client);
                    }
                  }
                }
              }
            } catch (error) {
              console.error(`[Server Prefetch] Error prefetching additional data for claim ${id}:`, error);
            }
          }));
        }
      } else {
        console.log(`[Server Prefetch] All ${claimIds.length} claims already have fresh data in cache`);
      }
    }

    console.log(`[Server Prefetch] Successfully prefetched all data for claims list`);
    return claimsList;
  } catch (error) {
    console.error(`[Server Prefetch] Error prefetching claims list:`, error);

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
      items: [],
      pagination: {
        total: 0,
        pages: 0,
        current: params.page || 1,
        hasMore: false
      }
    };
  }
});
