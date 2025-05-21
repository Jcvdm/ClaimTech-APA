// src/lib/api/domains/estimates/constants.ts

/**
 * Constants for estimates domain
 * Centralizes all cache-related constants for easier maintenance
 */

// Cache times
export const CACHE_TIMES = {
  // How long data stays fresh before refetching (when accessed)
  STALE_TIME: {
    SUMMARY: 15 * 60 * 1000, // 15 minutes
    DETAILS: 20 * 60 * 1000, // 20 minutes
    LINES: 10 * 60 * 1000,   // 10 minutes
  },

  // How long data stays in cache after becoming unused
  GC_TIME: {
    SUMMARY: 30 * 60 * 1000, // 30 minutes
    DETAILS: 60 * 60 * 1000, // 60 minutes
    LINES: 30 * 60 * 1000,   // 30 minutes
  },
};

// Query keys for consistent cache management
export const QUERY_KEYS = {
  // Base key for all estimate queries
  BASE: 'estimates' as const,
  ALL: ['estimates'] as const,

  // Keys for estimate by ID
  BY_ID: (id: string) => ['estimates', 'byId', id] as const,

  // Keys for estimate by claim ID
  BY_CLAIM_ID: (claimId: string) => ['estimates', 'byClaimId', claimId] as const,

  // Keys for estimate lines by estimate ID
  LINES_BY_ESTIMATE_ID: (estimateId: string) => ['estimates', 'lines', estimateId] as const,

  // tRPC-compatible query keys
  TRPC: {
    GET_BY_CLAIM_ID: (claimId: string) => [
      ['trpc', 'estimate', 'getByClaimId'],
      { input: { claim_id: claimId }, type: 'query' }
    ] as const,

    GET_BY_ID: (id: string) => [
      ['trpc', 'estimate', 'getById'],
      { input: { id }, type: 'query' }
    ] as const,

    GET_LINES_BY_ESTIMATE_ID: (estimateId: string) => [
      ['trpc', 'estimate', 'getLinesByEstimateId'],
      { input: { estimate_id: estimateId }, type: 'query' }
    ] as const,

    // Additional tRPC-compatible query keys for direct use with TanStack Query
    CREATE: (input: any) => [
      ['trpc', 'estimate', 'create'],
      { input, type: 'mutation' }
    ] as const,

    CREATE_LINE: (input: any) => [
      ['trpc', 'estimate', 'createLine'],
      { input, type: 'mutation' }
    ] as const,

    UPDATE_LINE: (input: any) => [
      ['trpc', 'estimate', 'updateLine'],
      { input, type: 'mutation' }
    ] as const,

    DELETE_LINE: (input: any) => [
      ['trpc', 'estimate', 'deleteLine'],
      { input, type: 'mutation' }
    ] as const,
  }
};
