// src/lib/api/domains/lookups/queries.ts
import { apiClient, type QueryOptions } from "@/lib/api/client";
import type { Client, LossAdjuster, Province } from "./types";
import { toast } from "sonner";

/**
 * Query functions for lookup data (clients, provinces, loss adjusters, etc.)
 * Using direct tRPC hook calls to avoid wrapper complexity
 */
export const lookupQueries = {
  /**
   * Get all clients - direct tRPC call
   */
  listClients: () => 
    apiClient.raw.client.getAll.useQuery(undefined, {
      initialData: [],
      staleTime: Infinity,
      retry: 2,
    }),

  /**
   * Get all loss adjusters - direct tRPC call
   */
  listLossAdjusters: () => 
    apiClient.raw.lookup.getLossAdjusters.useQuery(undefined, {
      initialData: [],
      staleTime: 1000 * 60 * 5, // 5 min
      retry: 2,
    }),

  /**
   * Get all provinces - direct tRPC call
   */
  listProvinces: () => 
    apiClient.raw.lookup.getProvinces.useQuery(undefined, {
      initialData: [],
      staleTime: Infinity,
      retry: 2,
    }),
};