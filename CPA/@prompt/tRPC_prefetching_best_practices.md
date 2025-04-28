# tRPC Prefetching Best Practices

This document outlines the best practices for implementing prefetching with tRPC and TanStack Query in Next.js applications.

## Key Concepts

### Query Key Structure

The most critical aspect of prefetching is using the exact same query key structure that tRPC uses internally. For tRPC v10, the query key structure is:

```typescript
[['trpc', router, procedure], { input: { ...input }, type: 'query' }]
```

For example:
```typescript
[['trpc', 'claim', 'getSummary'], { input: { id: claimId }, type: 'query' }]
```

Using any other query key structure will result in cache misses, even if the data is prefetched.

### Direct Cache Manipulation

When prefetching data, the most reliable approach is to:

1. Directly fetch the data using the tRPC client
2. Manually set the data in the cache with the exact query key
3. Set the query defaults to control staleTime and cacheTime

```typescript
// Directly fetch the data using the tRPC client
const fetchPromise = apiClient.raw.claim.getSummary.query({ id: claimId });

// Manually set the data in the cache
fetchPromise.then((data) => {
  // Set the data in the cache with the exact query key
  queryClient.setQueryData(queryKey, data);
  
  // Set the query defaults to control staleTime and cacheTime
  queryClient.setQueryDefaults(queryKey, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000 // 10 minutes
  });
});
```

### Cache Verification

Always verify that the data was actually cached after prefetching:

```typescript
// Verify the data was actually cached
const cachedData = queryClient.getQueryData(queryKey);
const queryState = queryClient.getQueryState(queryKey);

if (cachedData) {
  console.log(
    `Prefetch completed successfully, data cached. ` +
    `Status: ${queryState?.status}, ` +
    `FetchStatus: ${queryState?.fetchStatus}, ` +
    `DataUpdatedAt: ${queryState?.dataUpdatedAt ? new Date(queryState.dataUpdatedAt).toISOString() : 'never'}`
  );
} else {
  console.warn(`Prefetch completed but data not found in cache!`);
}
```

### Deduplication

Implement deduplication to avoid redundant prefetching requests:

```typescript
// Check if we already have fresh data in the cache
const cachedData = queryClient.getQueryData(queryKey);
const queryState = queryClient.getQueryState(queryKey);

// If we have fresh data, skip prefetching
if (cachedData && 
    queryState?.status === 'success' && 
    !queryState.isInvalidated && 
    queryState.dataUpdatedAt && 
    (Date.now() - queryState.dataUpdatedAt) < staleTime) {
  console.log(`Using cached data`);
  return Promise.resolve();
}

// If a fetch is already in progress, don't start another one
if (queryState?.fetchStatus === 'fetching') {
  console.log(`Fetch already in progress`);
  return Promise.resolve();
}
```

## Implementation Pattern

### ClaimPrefetchManager

The `ClaimPrefetchManager` class centralizes prefetching logic with:

1. Consistent query key generation
2. Cache checking
3. Deduplication
4. Queue management for background prefetching

```typescript
class ClaimPrefetchManager {
  private queryClient: QueryClient;
  private prefetchQueue: Set<string> = new Set();
  private isProcessingQueue = false;
  private staleTime = 5 * 60 * 1000; // 5 minutes
  private cacheTime = 10 * 60 * 1000; // 10 minutes

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  // Get consistent query keys for both prefetching and querying
  private getQueryKeys(claimId: string) {
    return {
      summary: [['trpc', 'claim', 'getSummary'], { input: { id: claimId }, type: 'query' }],
      details: [['trpc', 'claim', 'getDetails'], { input: { id: claimId }, type: 'query' }]
    };
  }

  // Public methods for prefetching
  prefetchSummary(claimId: string, priority = false): Promise<void> {
    // Implementation
  }

  prefetchDetails(claimId: string, priority = false): Promise<void> {
    // Implementation
  }

  prefetchMultipleSummaries(claimIds: string[], priorityCount = 3): Promise<void> {
    // Implementation
  }

  // Private methods for execution and queue management
  private executePrefetch(claimId: string, type: 'summary' | 'details', requestId: string): Promise<void> {
    // Implementation
  }

  private queuePrefetch(claimId: string, type: 'summary' | 'details'): void {
    // Implementation
  }

  private async processQueue(): Promise<void> {
    // Implementation
  }
}
```

### useClaimPrefetching Hook

The `useClaimPrefetching` hook provides a consistent instance of the `ClaimPrefetchManager` throughout the component tree:

```typescript
export function useClaimPrefetching() {
  const queryClient = useQueryClient();

  // Create a memoized instance of the ClaimPrefetchManager
  const prefetchManager = useMemo(() => {
    return new ClaimPrefetchManager(queryClient);
  }, [queryClient]);

  // Return the methods directly to maintain the same API as before
  return {
    prefetchSummary: (claimId: string, priority?: boolean) => 
      prefetchManager.prefetchSummary(claimId, priority),
    prefetchDetails: (claimId: string, priority?: boolean) => 
      prefetchManager.prefetchDetails(claimId, priority),
    prefetchMultipleSummaries: (claimIds: string[], priorityCount?: number) => 
      prefetchManager.prefetchMultipleSummaries(claimIds, priorityCount)
  };
}
```

### Component Integration

Components should use the `useClaimPrefetching` hook to prefetch data:

```typescript
// In ClaimList component
const { prefetchSummary, prefetchDetails, prefetchMultipleSummaries } = useClaimPrefetching();

// Prefetch all necessary data as soon as claims data is loaded
useEffect(() => {
  if (!data?.items || data.items.length === 0) return;

  // Get all claim IDs
  const claimIds = data.items.map(claim => claim.id);

  // Use the prefetch manager to handle all prefetching
  void prefetchMultipleSummaries(claimIds, 3);

  // Prefetch details for the first few claims with a delay
  if (claimIds.length > 0) {
    const topClaimIds = claimIds.slice(0, 2);
    const timer = setTimeout(() => {
      topClaimIds.forEach(id => {
        void prefetchDetails(id, true); // true = high priority
      });
    }, 1000);
    return () => clearTimeout(timer);
  }
}, [data?.items, prefetchMultipleSummaries, prefetchDetails]);
```

## Common Pitfalls

1. **Incorrect Query Key Structure**: Using a different query key structure than what tRPC uses internally.
2. **Using prefetchQuery Incorrectly**: Not setting the correct query function or options.
3. **Not Checking Cache State**: Not checking if data is already in the cache before prefetching.
4. **Not Handling In-Progress Fetches**: Not checking if a fetch is already in progress before starting a new one.
5. **Inconsistent staleTime/cacheTime**: Using different staleTime/cacheTime values in hooks and prefetching.
6. **Not Verifying Cache Success**: Not verifying that data was actually cached after prefetching.
7. **Overwhelming the Server**: Prefetching too many items at once without prioritization or queueing.

## Debugging Tips

1. **Add Detailed Logging**: Log cache state before and after prefetching operations.
2. **Use React Query DevTools**: Add React Query DevTools to visually inspect the cache.
3. **Check Query Keys**: Verify that the query keys used for prefetching match exactly what tRPC uses.
4. **Monitor Network Requests**: Use browser developer tools to monitor network requests and ensure prefetching is working.
5. **Test with Slow Network**: Test with throttled network to ensure prefetching provides a good user experience.

## References

- [TanStack Query Documentation](https://tanstack.com/query/latest/docs/react/guides/prefetching)
- [tRPC Documentation](https://trpc.io/docs/client/react/useQuery)
