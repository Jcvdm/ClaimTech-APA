// src/lib/api/domains/clients/hooks.ts
import { clientQueries } from "./queries";
import { type ClientListParams } from "./types";
import { useQueryState } from "@/lib/api/hooks";

/**
 * Hook for fetching all clients
 */
export function useClients() {
  const query = clientQueries.getAll();
  return useQueryState(() => query);
}

/**
 * Hook for fetching clients with filtering
 */
export function useClientsList(params: ClientListParams) {
  const query = clientQueries.list(params);
  return useQueryState(() => query);
}

/**
 * Hook for fetching a single client by ID
 */
export function useClient(id: string) {
  const query = clientQueries.getById(id);
  return useQueryState(() => query);
}
