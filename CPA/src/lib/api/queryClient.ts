'use client';

import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { CACHE_TIMES } from './domains/claims/constants';

/**
 * Creates a persisted query client that saves cache to localStorage
 * This allows the cache to survive page refreshes and browser restarts
 */
export function createPersistedQueryClient() {
  // Create a new query client with default options
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        retryDelay: 1000,
      },
    },
  });
  
  // Only run in browser environment
  if (typeof window !== 'undefined') {
    try {
      // Create a storage persister using localStorage
      const persister = createSyncStoragePersister({
        storage: window.localStorage,
        key: 'cpa-query-cache',
        // Optional serialization/deserialization functions if needed
        // serialize: (data) => JSON.stringify(data),
        // deserialize: (data) => JSON.parse(data),
      });
      
      // Configure persistence
      persistQueryClient({
        queryClient,
        persister,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        // Only persist successful queries
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            return query.state.status === 'success';
          },
        },
        // Optionally add callbacks for persistence events
        callbacks: {
          onSuccess: () => {
            console.log('[Cache] Successfully persisted query cache');
          },
          onError: (error) => {
            console.error('[Cache] Error persisting query cache:', error);
          },
        },
      });
      
      console.log('[Cache] Initialized persisted query client');
    } catch (error) {
      console.error('[Cache] Error setting up persisted query client:', error);
      // Continue with non-persisted client if persistence setup fails
    }
  }
  
  return queryClient;
}

/**
 * Singleton instance of the persisted query client
 * Use this when you need to access the query client outside of React components
 */
let globalQueryClient: QueryClient | null = null;

export function getGlobalQueryClient(): QueryClient {
  if (!globalQueryClient && typeof window !== 'undefined') {
    globalQueryClient = createPersistedQueryClient();
  }
  
  if (!globalQueryClient) {
    // Fallback for server-side or initialization failure
    globalQueryClient = new QueryClient();
  }
  
  return globalQueryClient;
}
