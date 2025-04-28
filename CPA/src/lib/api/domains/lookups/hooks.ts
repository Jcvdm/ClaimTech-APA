import { lookupQueries } from "./queries";
// import { useQueryState } from "@/lib/api/hooks"; // Remove unused import
import { toast } from "sonner";

/**
 * Hook for fetching all provinces
 */
export function useProvinces() {
  // Directly return the result of the query function
  // It already contains { data, status, isLoading, isError, error }
  return lookupQueries.listProvinces(); 
}

/**
 * Hook for fetching all active loss adjusters
 */
export function useLossAdjusters() {
  // Apply the same pattern here
  return lookupQueries.listLossAdjusters();
}

/**
 * Hook for fetching clients
 */
export function useClients() {
  // Apply the same pattern here
  return lookupQueries.listClients();
}