# TanStack Query Cache Management

This document outlines best practices for managing the TanStack Query cache in a Next.js application with tRPC integration.

## Cache Structure

### Query Keys

The cache is organized by query keys, which serve as unique identifiers for each query. With tRPC, the query key structure is:

```typescript
[['trpc', router, procedure], { input: { ...input }, type: 'query' }]
```

For example:
```typescript
[['trpc', 'claim', 'getSummary'], { input: { id: claimId }, type: 'query' }]
```

### Cache Entry Lifecycle

Each cache entry has the following properties:

- **data**: The actual data returned by the query
- **dataUpdatedAt**: Timestamp when the data was last updated
- **status**: Current status of the query ('success', 'error', 'loading', 'idle')
- **fetchStatus**: Current fetch status ('fetching', 'paused', 'idle')
- **isInvalidated**: Whether the query has been invalidated

## Cache Configuration

### staleTime

The `staleTime` option controls how long data remains "fresh" before it's considered stale:

```typescript
const { data } = useQuery({
  queryKey,
  queryFn,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

- **Default**: 0 (data is immediately stale)
- **Recommended**: 5 minutes for most data, longer for static data

### cacheTime

The `cacheTime` option controls how long inactive data remains in the cache:

```typescript
const { data } = useQuery({
  queryKey,
  queryFn,
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

- **Default**: 5 minutes
- **Recommended**: 10 minutes for most data, longer for frequently accessed data

### Consistency

It's critical to use the same `staleTime` and `cacheTime` values for both prefetching and querying:

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

## Cache Operations

### Checking Cache State

Before fetching data, check if it's already in the cache:

```typescript
const cachedData = queryClient.getQueryData(queryKey);
const queryState = queryClient.getQueryState(queryKey);

if (cachedData && 
    queryState?.status === 'success' && 
    !queryState.isInvalidated && 
    queryState.dataUpdatedAt && 
    (Date.now() - queryState.dataUpdatedAt) < staleTime) {
  // Use cached data
}
```

### Setting Cache Data

Manually set data in the cache:

```typescript
queryClient.setQueryData(queryKey, data);
```

### Setting Default Options

Set default options for a query key:

```typescript
queryClient.setQueryDefaults(queryKey, {
  staleTime: 5 * 60 * 1000,
  cacheTime: 10 * 60 * 1000,
});
```

### Invalidating Cache

Invalidate a query to force a refetch:

```typescript
queryClient.invalidateQueries(queryKey);
```

### Removing Cache Entries

Remove a query from the cache:

```typescript
queryClient.removeQueries(queryKey);
```

## Optimistic Updates

Implement optimistic updates to provide immediate feedback:

```typescript
const mutation = useMutation({
  mutationFn: updateClaim,
  onMutate: async (newClaim) => {
    // Cancel any outgoing refetches
    await queryClient.cancelQueries(queryKey);

    // Snapshot the previous value
    const previousClaim = queryClient.getQueryData(queryKey);

    // Optimistically update to the new value
    queryClient.setQueryData(queryKey, newClaim);

    // Return a context object with the snapshot
    return { previousClaim };
  },
  onError: (err, newClaim, context) => {
    // If the mutation fails, use the context to roll back
    queryClient.setQueryData(queryKey, context.previousClaim);
  },
  onSettled: () => {
    // Always refetch after error or success
    queryClient.invalidateQueries(queryKey);
  },
});
```

## Cache Persistence

Persist the cache across page reloads:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

persistQueryClient({
  queryClient,
  persister,
});
```

## Debugging

### React Query DevTools

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

### Logging Cache State

Add logging to debug cache issues:

```typescript
const cachedData = queryClient.getQueryData(queryKey);
const queryState = queryClient.getQueryState(queryKey);

console.log(
  `Cache Check - ` +
  `Has Data: ${!!cachedData}, ` +
  `Status: ${queryState?.status || 'unknown'}, ` +
  `FetchStatus: ${queryState?.fetchStatus || 'unknown'}, ` +
  `DataUpdatedAt: ${queryState?.dataUpdatedAt ? new Date(queryState.dataUpdatedAt).toISOString() : 'never'}, ` +
  `Age: ${queryState?.dataUpdatedAt ? Date.now() - queryState.dataUpdatedAt : 'N/A'}ms`
);
```

## Common Pitfalls

1. **Inconsistent Query Keys**: Using different query keys for the same data.
2. **Inconsistent staleTime/cacheTime**: Using different values in different parts of the application.
3. **Not Checking Cache State**: Fetching data without checking if it's already in the cache.
4. **Premature Invalidation**: Invalidating queries too frequently, negating the benefits of caching.
5. **Missing Error Handling**: Not handling errors in mutations, leading to inconsistent cache state.
6. **Excessive Cache Size**: Not setting appropriate cacheTime, leading to memory issues.

## Best Practices

1. **Consistent Query Keys**: Use a centralized function to generate query keys.
2. **Appropriate staleTime**: Set staleTime based on how frequently data changes.
3. **Optimistic Updates**: Implement optimistic updates for a better user experience.
4. **Background Refetching**: Use background refetching to keep data fresh without blocking the UI.
5. **Selective Invalidation**: Invalidate only the affected queries after mutations.
6. **Cache Persistence**: Consider persisting the cache for a better offline experience.

## References

- [TanStack Query Documentation](https://tanstack.com/query/latest/docs/react/guides/caching)
- [tRPC Documentation](https://trpc.io/docs/client/react/useQuery)
