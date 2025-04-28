// src/lib/api/constants.ts
/**
 * Centralized query keys for consistent cache management
 * between server and client components
 */
export const QUERY_KEYS = {
  CLAIMS: {
    ALL: ['claims', 'getAll'],
    SUMMARY: (id: string) => ['claims', 'getSummary', { id }],
    DETAILS: (id: string) => ['claims', 'getDetails', { id }],
    LIST: (params: Record<string, any>) => ['claims', 'list', params],
    COUNTS: ['claims', 'getCounts'],
  },
  CLIENTS: {
    ALL: ['clients', 'getAll'],
    DETAILS: (id: string) => ['clients', 'getDetails', { id }],
  },
  VEHICLES: {
    ALL: ['vehicles', 'getAll'],
    DETAILS: (id: string) => ['vehicles', 'getDetails', { id }],
  },
  LOOKUPS: {
    PROVINCES: ['lookups', 'provinces'],
    LOSS_ADJUSTERS: ['lookups', 'lossAdjusters'],
  },
};

/**
 * Cache time settings for consistent stale times
 * between server and client components
 */
export const CACHE_TIMES = {
  SHORT: 1000 * 60, // 1 minute
  MEDIUM: 1000 * 60 * 5, // 5 minutes
  LONG: 1000 * 60 * 30, // 30 minutes
  INFINITE: Infinity,
};
