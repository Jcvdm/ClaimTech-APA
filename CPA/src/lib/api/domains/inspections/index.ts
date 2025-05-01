// src/lib/api/domains/inspections/index.ts
// Re-export everything for convenient imports
export * from './types';
export * from './constants';
export * from './hooks';

// Export raw mutations for advanced use cases
import { inspectionMutations } from './mutations';

export const inspectionApi = {
  mutations: inspectionMutations
};
