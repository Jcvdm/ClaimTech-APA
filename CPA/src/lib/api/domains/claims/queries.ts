// src/lib/api/domains/claims/queries.ts
import { apiClient } from "../../client";
import { type QueryOptions } from "../../client";
import {
  type ClaimWithRelations,
  type ClaimListParams,
  type ClaimCountsResponse,
  type ClaimListResponse,
  type ClaimSummary,
  type ClaimDetails
} from "./types";

export const claimQueries = {
  /**
   * Get all claims (basic query)
   */
  getAll: (options?: QueryOptions<ClaimWithRelations[]>) =>
    apiClient.query<ClaimWithRelations[]>(
      () => apiClient.raw.claim.getAll.useQuery(),
      options
    ),

  /**
   * Get claims with filtering, pagination, and sorting
   */
  list: (params: ClaimListParams, options?: QueryOptions<ClaimListResponse>) =>
    apiClient.query<ClaimListResponse>(
      () => apiClient.raw.claim.list.useQuery(params),
      options
    ),

  /**
   * Get counts for sidebar badges
   */
  getCounts: (options?: QueryOptions<ClaimCountsResponse>) =>
    apiClient.query<ClaimCountsResponse>(
      () => apiClient.raw.claim.getCounts.useQuery(),
      {
        refetchInterval: 60000, // Refresh counts every minute
        ...options
      }
    ),

  /**
   * Get a single claim by ID
   * @param id The claim ID (can be undefined/null during initial render)
   * @param options Additional query options
   */
  getById: (id: string | undefined | null, options?: QueryOptions<ClaimWithRelations>) => {
    // Function to validate UUID format
    const isValidUUID = (id: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(id);
    };

    return apiClient.query<ClaimWithRelations>(
      // Use non-null assertion (!) since this function body only executes when enabled=true
      () => apiClient.raw.claim.getById.useQuery({ id: id! }),
      {
        // Only enable the query if id exists, is not empty, is not "new", and is a valid UUID
        enabled: !!id && isValidUUID(id),
        ...options
      }
    );
  },

  /**
   * Get claim summary for expandable row
   * @param id The claim ID
   * @param options Additional query options
   */
  getClaimSummary: (id: string, options?: QueryOptions<ClaimSummary>) => {
    // Function to validate UUID format
    const isValidUUID = (id: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(id);
    };

    return apiClient.query<ClaimSummary>(
      () => apiClient.raw.claim.getSummary.useQuery({ id }),
      {
        enabled: !!id && isValidUUID(id),
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime)
        ...options
      }
    );
  },

  /**
   * Get claim summary directly without using hooks (safe for components)
   * @param id The claim ID
   * @returns Promise that resolves to the claim summary
   */
  fetchClaimSummary: async (id: string): Promise<ClaimSummary | null> => {
    if (!id) return null;

    // Function to validate UUID format
    const isValidUUID = (id: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(id);
    };

    if (!isValidUUID(id)) {
      console.warn(`[fetchClaimSummary] Invalid UUID format for claim ID: ${id}`);
      return null;
    }

    try {
      console.log(`[fetchClaimSummary] Fetching summary for claim ${id}`);
      const data = await apiClient.raw.claim.getSummary.query({ id });
      console.log(`[fetchClaimSummary] Successfully fetched summary for claim ${id}`);
      return data;
    } catch (error) {
      console.error(`[fetchClaimSummary] Error fetching summary for claim ${id}:`, error);
      return null;
    }
  },

  /**
   * Get claim details for detail view
   * @param id The claim ID
   * @param options Additional query options
   */
  getClaimDetails: (id: string, options?: QueryOptions<ClaimDetails>) => {
    // Function to validate UUID format
    const isValidUUID = (id: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(id);
    };

    return apiClient.query<ClaimDetails>(
      () => apiClient.raw.claim.getDetails.useQuery({ id }),
      {
        enabled: !!id && isValidUUID(id),
        staleTime: 30 * 1000, // 30 seconds
        cacheTime: 5 * 60 * 1000, // 5 minutes
        ...options
      }
    );
  }
};
