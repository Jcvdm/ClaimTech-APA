# TanStack Query Prefetching Best Practices

This document outlines best practices for implementing prefetching with TanStack Query (React Query) in Next.js applications with tRPC integration.

## Core Concepts

### Query Keys

- **Consistent Query Keys**: Always use the exact same query keys for prefetching and querying.
- **tRPC Integration**: The exact query key structure for tRPC is critical for cache hits.
- **Key Structure**: For tRPC, query keys follow the pattern `[['trpc', router, procedure], { input: { ...input }, type: 'query' }]`.

```typescript
// Get the exact query key that tRPC uses
const queryKey = [['trpc', 'claim', 'getSummary'], { input: { id: claimId }, type: 'query' }];
```

### Cache Management

- **Check Before Prefetching**: Always check if data is already in the cache before prefetching.
- **Cache Freshness**: Check both the existence of data and its freshness (using dataUpdatedAt).
- **In-Progress Checks**: Check if a fetch is already in progress before starting a new one.

```typescript
// Check if we already have fresh data in the cache
const cachedData = queryClient.getQueryData(queryKey);
const queryState = queryClient.getQueryState(queryKey);

// If we have fresh data, skip prefetching
if (cachedData && queryState?.status === 'success' &&
    !queryState.isInvalidated &&
    queryState.dataUpdatedAt &&
    (Date.now() - queryState.dataUpdatedAt) < staleTime) {
  return; // Skip prefetching
}

// If a fetch is already in progress, don't start another one
if (queryState?.fetchStatus === 'fetching') {
  return; // Skip prefetching
}
```

### Prefetching Implementation

- **Use QueryClient.prefetchQuery**: Use the queryClient's prefetchQuery method with the correct query key and query function.
- **Set staleTime and cacheTime**: Set appropriate staleTime and cacheTime values to control cache behavior.
- **Verify Cache Success**: Always verify that data was actually cached after prefetching.

```typescript
// Use the queryClient's prefetchQuery method directly
const prefetchPromise = queryClient.prefetchQuery({
  queryKey, // The exact tRPC query key structure
  queryFn: () => {
    // Use the raw tRPC client to make the query
    return apiClient.raw.claim.getSummary.query({ id: claimId });
  },
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});

// Verify the data was cached after prefetching
prefetchPromise.then(() => {
  // Verify the data was actually cached
  const cachedData = queryClient.getQueryData(queryKey);
  if (cachedData) {
    console.log('Data cached successfully');
  } else {
    console.warn('Data not found in cache after prefetching!');
  }
});
```

### Hooks Integration

- **Check Cache in Hooks**: Check if data is already in the cache before querying.
- **Disable Refetching**: Disable automatic refetching when cached data is available.
- **Consistent Options**: Use the same staleTime and cacheTime values in hooks and prefetching.

```typescript
// Get the exact query key that tRPC uses
const queryKey = [['trpc', 'claim', 'getDetails'], { input: { id: claimId }, type: 'query' }];

// Check if we already have the data in the cache
const cachedData = queryClient.getQueryData(queryKey);

// Use the hook with refetchOnMount disabled if we already have data
const { data, isLoading } = useClaimFullDetails(claimId, {
  refetchOnMount: cachedData ? false : 'always',
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  staleTime: 5 * 60 * 1000, // 5 minutes - match prefetching staleTime
  cacheTime: 10 * 60 * 1000, // 10 minutes - match prefetching cacheTime
});
```

## Prefetching Strategies

### Priority-Based Prefetching

- **Prioritize Visible Data**: Prioritize prefetching for data that is likely to be viewed soon.
- **Sequential Processing**: Process priority items sequentially to avoid overwhelming the server.
- **Background Queueing**: Queue less important items for background processing.

```typescript
// Prioritize the first few items
const priorityIds = ids.slice(0, priorityCount);
const remainingIds = ids.slice(priorityCount);

// Process priority items sequentially
for (const id of priorityIds) {
  await prefetchItem(id, true);
}

// Queue remaining items for background processing
remainingIds.forEach(id => queuePrefetch(id));
```

### Deduplication

- **Queue Management**: Implement a queue system with deduplication to avoid redundant requests.
- **Request Tracking**: Use unique request IDs for tracking and debugging.
- **Double Checking**: Always double-check cache state before executing prefetch operations.

```typescript
// Check if this item is already in the queue
if (prefetchQueue.has(queueItem)) {
  console.log(`Item ${queueItem} already in queue, skipping`);
  return;
}

prefetchQueue.add(queueItem);
processQueue();
```

## Next.js Integration

### Client Components

- **Use Client Directive**: Always use the 'use client' directive for components that use hooks.
- **Params Handling**: Access params directly in client components without awaiting.
- **Error Handling**: Implement proper error handling for invalid inputs.

```typescript
"use client";

export default function DetailsPage({ params }: { params: { id: string } }) {
  // In a client component, we can access params directly
  const id = params.id;

  // Handle invalid IDs
  if (!isValidUUID(id)) {
    return <NotFoundPage />;
  }

  return <Details id={id} />;
}
```

### Prefetching Manager

- **Centralized Management**: Implement a centralized prefetching manager class.
- **Consistent API**: Provide a consistent API for prefetching operations.
- **Error Handling**: Implement comprehensive error handling to prevent unhandled promise rejections.

```typescript
export class PrefetchManager {
  constructor(queryClient) {
    this.queryClient = queryClient;
    this.prefetchQueue = new Set();
    this.isProcessingQueue = false;
  }

  prefetchItem(id, priority = false) {
    // Implementation
  }

  prefetchMultipleItems(ids, priorityCount = 3) {
    // Implementation
  }

  // Private methods for queue management
}
```

## Debugging and Monitoring

### Logging

- **Detailed Logging**: Implement comprehensive logging for debugging.
- **Cache State Logging**: Log cache state before and after prefetching operations.
- **Request Tracking**: Use unique request IDs for tracking requests in logs.

```typescript
console.log(
  `[Cache Check] ${requestId} - ` +
  `Has Data: ${!!cachedData}, ` +
  `Status: ${queryState?.status || 'unknown'}, ` +
  `FetchStatus: ${queryState?.fetchStatus || 'unknown'}, ` +
  `Age: ${queryState?.dataUpdatedAt ? Date.now() - queryState.dataUpdatedAt : 'N/A'}ms`
);
```

### React Query DevTools

- **Install DevTools**: Install and use the React Query DevTools for visual inspection of the cache.
- **Client-Side Only**: Ensure DevTools are only rendered on the client side.
- **Configuration**: Configure DevTools with appropriate options.

```typescript
"use client";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, useEffect } from "react";

export function ReactQueryDevToolsWrapper() {
  // Only render DevTools on the client
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return (
    <ReactQueryDevtools
      initialIsOpen={false}
      position="bottom-right"
      buttonPosition="bottom-right"
    />
  );
}
```

## Common Pitfalls

1. **Incorrect Query Key Structure**: The tRPC query key structure is `[['trpc', router, procedure], { input: { ...input }, type: 'query' }]`, not `[router, procedure, input]`.
2. **Using queryOptions() Instead of Direct Keys**: The `queryOptions()` method doesn't exist in tRPC v10. Use the exact key structure instead.
3. **Using Incorrect tRPC Client Methods**: Using methods like `fetch()` or `prefetch()` that might not exist or work as expected. Use `queryClient.prefetchQuery()` with `apiClient.raw.[router].[procedure].query()` instead.
4. **Missing Cache Checks**: Not checking if data is already in the cache before prefetching.
5. **Redundant Requests**: Not checking if a fetch is already in progress before starting a new one.
6. **Unhandled Promises**: Not handling promise rejections in prefetching operations.
7. **Incorrect staleTime/cacheTime**: Using different staleTime/cacheTime values in hooks and prefetching.
8. **Server Component Hooks**: Trying to use hooks in server components.
9. **Overwhelming the Server**: Prefetching too many items at once.
10. **Missing Error Handling**: Not handling errors in prefetching operations.
11. **Ignoring Cache State**: Not checking cache state before querying.
12. **Redundant Refetching**: Not disabling automatic refetching when cached data is available.

## References

- [TanStack Query Documentation](https://tanstack.com/query/latest/docs/react/overview)
- [tRPC Documentation](https://trpc.io/docs)
- [Next.js App Router Documentation](https://nextjs.org/docs/app)
