import { QueryClient } from "@tanstack/react-query";
import { cache } from "react";
import { CACHE_TIMES } from "@/lib/api/constants";
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { CACHE_TIMES as CLAIM_CACHE_TIMES } from "@/lib/api/domains/claims/constants";

/**
 * Creates a standard query client for server components
 */
export const createQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				// Set consistent staleTime and cacheTime for all queries
				staleTime: CACHE_TIMES.MEDIUM, // 5 minutes
				gcTime: CACHE_TIMES.MEDIUM * 2, // 10 minutes (renamed from cacheTime)
				refetchOnWindowFocus: false, // Don't refetch on window focus by default
				retry: 1, // Only retry once by default
				suspense: false, // Default to false, enable explicitly where needed
			},
		},
	});

/**
 * Creates a persisted query client that saves cache to localStorage
 * This allows the cache to survive page refreshes and browser restarts
 * Used for client components
 */
export const createPersistedQueryClient = () => {
	// Create a new query client with default options
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: CACHE_TIMES.MEDIUM, // 5 minutes
				gcTime: CACHE_TIMES.MEDIUM * 2, // 10 minutes
				refetchOnWindowFocus: false,
				retry: 1,
				suspense: false,
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
			});

			console.log('[Cache] Initialized persisted query client');
		} catch (error) {
			console.error('[Cache] Error setting up persisted query client:', error);
			// Continue with non-persisted client if persistence setup fails
		}
	}

	return queryClient;
};

// Create a singleton query client for server components
export const getQueryClient = cache(() => createQueryClient());

/**
 * Note: If you encounter edge cases with non-JSON-serializable data,
 * you can implement a custom dehydration helper using SuperJSON.
 * For most cases, TanStack Query's built-in dehydrate function is sufficient.
 */
