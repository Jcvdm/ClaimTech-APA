/**
 * Constants for claims domain
 * Centralizes all cache-related constants for easier maintenance
 */

// Cache times
export const CACHE_TIMES = {
  // How long data stays fresh before refetching (when accessed)
  STALE_TIME: {
    SUMMARY: 15 * 60 * 1000, // 15 minutes (was 5)
    DETAILS: 20 * 60 * 1000, // 20 minutes (was 5)
    LIST: 5 * 60 * 1000,     // 5 minutes (was 2)
    COUNTS: 2 * 60 * 1000,   // 2 minutes (was 1)
  },

  // How long data stays in cache after becoming unused
  GC_TIME: {
    SUMMARY: 30 * 60 * 1000, // 30 minutes (was 10)
    DETAILS: 60 * 60 * 1000, // 60 minutes (was 15)
    LIST: 15 * 60 * 1000,    // 15 minutes (was 5)
    COUNTS: 5 * 60 * 1000,   // 5 minutes (was 3)
  },

  // Cooldown period between prefetch attempts for the same resource
  PREFETCH_COOLDOWN: 60 * 1000, // 60 seconds (was 30)

  // Extended times for active claim sessions
  ACTIVE_SESSION: {
    STALE_TIME: 60 * 60 * 1000,  // 60 minutes
    GC_TIME: 120 * 60 * 1000,    // 120 minutes (2 hours)
  },
};

// Query keys for consistent cache access
export const QUERY_KEYS = {
  // Base keys
  ALL_CLAIMS: ['claims'] as const,
  SUMMARY: ['claims', 'summary'] as const,
  DETAILS: ['claims', 'details'] as const,
  LIST: ['claims', 'list'] as const,
  COUNTS: ['claims', 'counts'] as const,

  // Factory functions for specific items
  getSummaryKey: (id: string) => ['claims', 'summary', id] as const,
  getDetailsKey: (id: string) => ['claims', 'details', id] as const,
  getListKey: (params: any) => ['claims', 'list', params] as const,

  // tRPC-compatible query keys for server-side prefetching
  // These match the internal structure used by tRPC for better cache hits
  TRPC: {
    SUMMARY: (id: string) => [['trpc', 'claim', 'getSummary'], { input: { id }, type: 'query' }] as const,
    DETAILS: (id: string) => [['trpc', 'claim', 'getDetails'], { input: { id }, type: 'query' }] as const,
    LIST: (params: any) => [['trpc', 'claim', 'getAll'], { input: params, type: 'query' }] as const,
    COUNTS: () => [['trpc', 'claim', 'getCounts'], { input: undefined, type: 'query' }] as const,
    APPOINTMENTS: (claimId: string) => [['trpc', 'appointment', 'getByClaim'], { input: { claim_id: claimId }, type: 'query' }] as const,
    ATTACHMENTS: (claimId: string) => [['trpc', 'attachment', 'getByClaim'], { input: { claim_id: claimId }, type: 'query' }] as const,
    VEHICLE: (vehicleId: string) => [['trpc', 'vehicle', 'getById'], { input: { id: vehicleId }, type: 'query' }] as const,
    CLIENT: (clientId: string) => [['trpc', 'client', 'getById'], { input: { id: clientId }, type: 'query' }] as const,
  }
};

// Prefetch settings
export const PREFETCH_SETTINGS = {
  // Maximum number of claims to prefetch at once
  MAX_BATCH_SIZE: 5,

  // Number of high-priority claims to prefetch on initial load
  INITIAL_PREFETCH_COUNT: 3,

  // Delay before prefetching on hover (to avoid unnecessary prefetches)
  HOVER_DELAY: 300, // ms
};
