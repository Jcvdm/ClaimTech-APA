// src/lib/api/domains/claims/index.ts
// Re-export everything for convenient imports
export * from './types';
export * from './hooks';
export * from './constants';
export * from './claimCache';

// Export server-prefetch utilities
// export * from './server-prefetch.server'; // moved to server components only

// Export raw queries and mutations for advanced use cases
import { claimQueries } from './queries';
import { claimMutations } from './mutations';

export const claimsApi = {
  queries: claimQueries,
  mutations: claimMutations
};
