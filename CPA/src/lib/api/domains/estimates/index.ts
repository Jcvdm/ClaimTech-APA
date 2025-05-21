// src/lib/api/domains/estimates/index.ts
// Re-export everything for convenient imports
export * from './types';
export * from './constants';
export * from './hooks';

// Export raw queries and mutations for advanced use cases
import { estimateQueries } from './queries';
import { estimateMutations } from './mutations';

export const estimateApi = {
  queries: estimateQueries,
  mutations: estimateMutations
};
