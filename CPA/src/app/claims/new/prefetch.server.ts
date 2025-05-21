'use server';

import { cache } from 'react';
import { prefetchClientsServer } from '@/lib/api/domains/clients/server-prefetch.server';
import { prefetchProvincesServer, prefetchLossAdjustersServer } from '@/lib/api/domains/lookups/server-prefetch.server';
import { createServerCaller } from '@/lib/api/utils/createServerCaller';

/**
 * Prefetches all data needed for the claim creation form
 * This is a server-side function that will be called during server rendering
 */
export const prefetchClaimFormData = cache(async () => {
  console.log('[Server Prefetch] Prefetching claim form data');

  try {
    console.log('[Server Prefetch] Starting prefetch for claim form data');

    // Create a server-side tRPC caller
    const caller = await createServerCaller();

    // Prefetch clients
    let clients = [];
    try {
      // Try to use the server-side prefetch function first
      clients = await prefetchClientsServer();
      console.log('[Server Prefetch] Successfully prefetched clients:', clients.length);
    } catch (err) {
      console.error('[Server Prefetch] Error fetching clients with prefetchClientsServer:', err);

      // Fallback to direct caller
      try {
        clients = await caller.client.getAll();
        console.log('[Server Prefetch] Successfully prefetched clients with direct caller:', clients.length);
      } catch (directErr) {
        console.error('[Server Prefetch] Error fetching clients with direct caller:', directErr);
      }
    }

    // Prefetch provinces
    let provinces = [];
    try {
      // Try to use the server-side prefetch function first
      provinces = await prefetchProvincesServer();
      console.log('[Server Prefetch] Successfully prefetched provinces:', provinces.length);
    } catch (err) {
      console.error('[Server Prefetch] Error fetching provinces with prefetchProvincesServer:', err);

      // Fallback to direct caller
      try {
        provinces = await caller.lookup.getProvinces();
        console.log('[Server Prefetch] Successfully prefetched provinces with direct caller:', provinces.length);
      } catch (directErr) {
        console.error('[Server Prefetch] Error fetching provinces with direct caller:', directErr);
      }
    }

    // Prefetch loss adjusters
    let lossAdjusters = [];
    try {
      // Try to use the server-side prefetch function first
      lossAdjusters = await prefetchLossAdjustersServer();
      console.log('[Server Prefetch] Successfully prefetched loss adjusters:', lossAdjusters.length);
    } catch (err) {
      console.error('[Server Prefetch] Error fetching loss adjusters with prefetchLossAdjustersServer:', err);

      // Fallback to direct caller
      try {
        lossAdjusters = await caller.lookup.getLossAdjusters();
        console.log('[Server Prefetch] Successfully prefetched loss adjusters with direct caller:', lossAdjusters.length);
      } catch (directErr) {
        console.error('[Server Prefetch] Error fetching loss adjusters with direct caller:', directErr);
      }
    }

    console.log('[Server Prefetch] Successfully prefetched all claim form data');

    return {
      clients: Array.isArray(clients) ? clients : [],
      provinces: Array.isArray(provinces) ? provinces : [],
      lossAdjusters: Array.isArray(lossAdjusters) ? lossAdjusters : [],
    };
  } catch (error) {
    console.error('[Server Prefetch] Error prefetching claim form data:', error);
    return {
      clients: [],
      provinces: [],
      lossAdjusters: [],
    };
  }
});
