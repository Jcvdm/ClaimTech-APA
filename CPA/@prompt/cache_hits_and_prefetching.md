# Cache Hits and Prefetching in TanStack Query

This document provides a comprehensive guide to understanding and optimizing cache hits when using TanStack Query with tRPC in a Next.js application.

## Understanding Cache Hits

A cache hit occurs when a query attempts to fetch data, but finds that the data already exists in the cache and is still considered "fresh" (not stale). This prevents an unnecessary network request, improving performance and user experience.

### Cache Key Structure

The most critical aspect of achieving cache hits is using the exact same query key structure consistently throughout your application:

```typescript
// For tRPC v10, the correct query key structure is:
[['trpc', router, procedure], { input: { ...input }, type: 'query' }]

// Example:
[['trpc', 'claim', 'getSummary'], { input: { id: claimId }, type: 'query' }]
```

Using any other query key structure will result in cache misses, even if the data has been prefetched.

### Cache State Properties

Each cache entry has several important properties that determine whether a cache hit will occur:

- **data**: The actual data returned by the query
- **dataUpdatedAt**: Timestamp when the data was last updated
- **status**: Current status of the query ('success', 'error', 'loading', 'idle')
- **fetchStatus**: Current fetch status ('fetching', 'paused', 'idle')
- **isInvalidated**: Whether the query has been invalidated

### staleTime vs. cacheTime (gcTime)

Two key configuration options control cache behavior:

- **staleTime**: How long data remains "fresh" before it's considered stale
  - Default: 0 (data is immediately stale)
  - Recommended: 5 minutes for most data

- **cacheTime (gcTime in v5+)**: How long inactive data remains in the cache
  - Default: 5 minutes
  - Recommended: 10 minutes for most data

```typescript
const { data } = useQuery({
  queryKey,
  queryFn,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

## Checking for Cache Hits

### Programmatically Checking Cache State

To check if data is already in the cache and fresh:

```typescript
const cachedData = queryClient.getQueryData(queryKey);
const queryState = queryClient.getQueryState(queryKey);

if (cachedData && 
    queryState?.status === 'success' && 
    !queryState.isInvalidated && 
    queryState.dataUpdatedAt && 
    (Date.now() - queryState.dataUpdatedAt) < staleTime) {
  console.log('Cache hit! Using cached data');
  // Use cached data
} else {
  console.log('Cache miss! Fetching fresh data');
  // Fetch fresh data
}
```

### Debugging Cache Hits

Add detailed logging to debug cache hits and misses:

```typescript
console.log(
  `Cache Check - ` +
  `Has Data: ${!!cachedData}, ` +
  `Status: ${queryState?.status || 'unknown'}, ` +
  `FetchStatus: ${queryState?.fetchStatus || 'unknown'}, ` +
  `DataUpdatedAt: ${queryState?.dataUpdatedAt ? new Date(queryState.dataUpdatedAt).toISOString() : 'never'}, ` +
  `Age: ${queryState?.dataUpdatedAt ? Date.now() - queryState.dataUpdatedAt : 'N/A'}ms, ` +
  `Stale: ${queryState?.dataUpdatedAt ? (Date.now() - queryState.dataUpdatedAt) > staleTime : 'N/A'}`
);
```

## Optimizing for Cache Hits

### 1. Consistent Query Keys

Always use the same query key structure throughout your application:

```typescript
// Define a central function for generating query keys
function getQueryKeys(claimId: string) {
  return {
    summary: [['trpc', 'claim', 'getSummary'], { input: { id: claimId }, type: 'query' }],
    details: [['trpc', 'claim', 'getDetails'], { input: { id: claimId }, type: 'query' }]
  };
}
```

### 2. Consistent staleTime and cacheTime

Use the same staleTime and cacheTime values for both prefetching and querying:

```typescript
// In prefetching
queryClient.prefetchQuery({
  queryKey,
  queryFn,
  staleTime: 5 * 60 * 1000,
  cacheTime: 10 * 60 * 1000,
});

// In component
const { data } = useQuery({
  queryKey,
  queryFn,
  staleTime: 5 * 60 * 1000,
  cacheTime: 10 * 60 * 1000,
});
```

### 3. Direct Cache Manipulation

For maximum control, directly manipulate the cache:

```typescript
// Directly fetch the data
const data = await apiClient.raw.claim.getSummary.query({ id: claimId });

// Manually set the data in the cache
queryClient.setQueryData(queryKey, data);

// Set the query defaults
queryClient.setQueryDefaults(queryKey, {
  staleTime: 5 * 60 * 1000,
  cacheTime: 10 * 60 * 1000,
});
```

### 4. Verify Cache Success

Always verify that data was actually cached:

```typescript
const cachedData = queryClient.getQueryData(queryKey);
if (cachedData) {
  console.log('Data cached successfully');
} else {
  console.warn('Data not found in cache!');
}
```

## Prefetching Strategies for Maximum Cache Hits

### 1. On Page Load

Prefetch data as soon as the page loads:

```typescript
useEffect(() => {
  if (!data?.items || data.items.length === 0) return;

  // Get all claim IDs
  const claimIds = data.items.map(claim => claim.id);

  // Prefetch summaries for all claims
  void prefetchMultipleSummaries(claimIds, 3);
}, [data?.items, prefetchMultipleSummaries]);
```

### 2. On User Interaction

Prefetch data when users hover over elements:

```typescript
const handleRowHover = useCallback(() => {
  // Only prefetch if not already expanded
  if (!isExpanded) {
    void prefetchSummary(claim.id, false);
  }
}, [claim.id, isExpanded, prefetchSummary]);

return (
  <TableRow onMouseEnter={handleRowHover}>
    {/* Row content */}
  </TableRow>
);
```

### 3. Prioritized Prefetching

Prioritize important data:

```typescript
// Prefetch the first few items with high priority
const priorityIds = claimIds.slice(0, 3);
for (const id of priorityIds) {
  await prefetchSummary(id, true); // true = high priority
}

// Queue the rest for background prefetching
const remainingIds = claimIds.slice(3);
for (const id of remainingIds) {
  prefetchSummary(id, false); // false = low priority
}
```

### 4. Deduplication

Avoid redundant prefetching requests:

```typescript
// Check if a fetch is already in progress
if (queryState?.fetchStatus === 'fetching') {
  console.log(`Fetch already in progress for ${claimId}`);
  return Promise.resolve();
}

// Check if we already have fresh data
if (cachedData && 
    queryState?.status === 'success' && 
    !queryState.isInvalidated && 
    queryState.dataUpdatedAt && 
    (Date.now() - queryState.dataUpdatedAt) < staleTime) {
  console.log(`Already have fresh data for ${claimId}`);
  return Promise.resolve();
}
```

## Debugging Cache Hits with React Query DevTools

Add React Query DevTools to your application:

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

The DevTools provide a visual representation of:
- All queries in the cache
- Their current status (fresh, stale, fetching)
- When they were last updated
- How many observers they have

## Common Cache Hit Issues

1. **Inconsistent Query Keys**: Using different query key structures in different parts of the application.
   - Solution: Use a centralized function to generate query keys.

2. **Incorrect staleTime/cacheTime**: Using different values in different parts of the application.
   - Solution: Define constants for these values and use them consistently.

3. **Race Conditions**: Prefetched data being overwritten by subsequent requests.
   - Solution: Use cancelQueries before setting data and implement proper deduplication.

4. **Cache Invalidation**: Invalidating queries too frequently.
   - Solution: Be selective about when to invalidate queries.

5. **Missing Error Handling**: Not handling errors in prefetching operations.
   - Solution: Implement comprehensive error handling with fallbacks.

## Best Practices Summary

1. **Use Consistent Query Keys**: Always use the exact same query key structure.
2. **Set Appropriate staleTime**: Balance freshness with performance.
3. **Verify Cache Success**: Always check that data was actually cached.
4. **Implement Deduplication**: Avoid redundant requests.
5. **Add Detailed Logging**: Log cache state for debugging.
6. **Use React Query DevTools**: Visually inspect the cache.
7. **Prioritize Prefetching**: Focus on data the user is likely to need soon.
8. **Handle Errors Gracefully**: Implement comprehensive error handling.
