// src/lib/api/domains/logs/index.ts
// Re-export everything for convenient imports
export * from './types';
export * from './constants';
export * from './hooks';

// Export raw queries and mutations for advanced use cases
import { getClaimLogs } from './queries';
import * as logMutations from './mutations';

// Note: server-prefetch.server.ts is not re-exported here because it's server-only
// and should be imported directly where needed with a server component

export const logsApi = {
  queries: {
    getClaimLogs
  },
  mutations: logMutations
};
