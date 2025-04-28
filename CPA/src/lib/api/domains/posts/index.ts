// src/lib/api/domains/posts/index.ts
// Re-export everything for convenient imports
export * from './types';
export * from './hooks';

// Export raw queries and mutations for advanced use cases
import { postQueries } from './queries';
import { postMutations } from './mutations';

export const postsApi = {
  queries: postQueries,
  mutations: postMutations
};
