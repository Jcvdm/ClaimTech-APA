// src/lib/api/domains/lookups/index.ts
// Re-export everything for convenient imports
export * from './types';
export * from './hooks';

// Export raw queries for advanced use cases
import { lookupQueries } from './queries';

export const lookupsApi = {
  queries: lookupQueries
};
