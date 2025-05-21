// src/lib/api/domains/inspections/index.ts
// Re-export everything for convenient imports
export * from './types';
export * from './constants';
export * from './hooks';

// Export raw mutations for advanced use cases
import { inspectionMutations } from './mutations';

// Note: server-prefetch.server.ts is not re-exported here because it's server-only
// and should be imported directly where needed with a server component

export const inspectionApi = {
  mutations: inspectionMutations
};
