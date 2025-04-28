// src/lib/api/domains/vehicles/index.ts
// Re-export everything for convenient imports
export * from './types';
export * from './hooks';

// Export raw queries and mutations for advanced use cases
import { vehicleQueries } from './queries';
import { vehicleMutations } from './mutations';

export const vehiclesApi = {
  queries: vehicleQueries,
  mutations: vehicleMutations
};
