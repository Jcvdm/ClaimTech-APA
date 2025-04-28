// src/lib/api/domains/clients/index.ts
// Re-export everything for convenient imports
export * from './types';
export * from './hooks';

// Export raw queries for advanced use cases
import { clientQueries } from './queries';

export const clientsApi = {
  queries: clientQueries
};
