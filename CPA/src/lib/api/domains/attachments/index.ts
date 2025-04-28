// src/lib/api/domains/attachments/index.ts
// Re-export everything for convenient imports
export * from './types';
export * from './hooks';

// Export raw queries and mutations for advanced use cases
import { attachmentQueries } from './queries';
import { attachmentMutations } from './mutations';

export const attachmentsApi = {
  queries: attachmentQueries,
  mutations: attachmentMutations
};
