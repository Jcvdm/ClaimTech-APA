# ClaimPrefetchManager Documentation

The `ClaimPrefetchManager` is a central component in our data prefetching strategy, designed to optimize the user experience by proactively loading claim data before it's needed. This document outlines its architecture, implementation details, and best practices.

## Core Concepts

### Purpose

The `ClaimPrefetchManager` solves several key challenges:

1. **Reducing Perceived Latency**: By prefetching data before the user needs it, we eliminate waiting time when they interact with claims.
2. **Optimizing Network Usage**: Through deduplication, queue management, and cache checking, we avoid redundant requests.
3. **Prioritizing Critical Data**: The manager distinguishes between high-priority and background prefetching to ensure the most important data is loaded first.

### Architecture

The manager follows these design principles:

- **Singleton Pattern**: A single instance manages all prefetching to avoid conflicts.
- **Queue Management**: Background prefetching is organized in a queue to avoid overwhelming the server.
- **Cache Integration**: Tight integration with TanStack Query's cache to avoid redundant requests.
- **Consistent Query Keys**: Uses the exact same query key structure as tRPC to ensure cache hits.

## Implementation Details

### Query Key Structure

The most critical aspect is using the exact same query key structure that tRPC uses internally:

```typescript
private getQueryKeys(claimId: string) {
  return {
    summary: [['trpc', 'claim', 'getSummary'], { input: { id: claimId }, type: 'query' }],
    details: [['trpc', 'claim', 'getDetails'], { input: { id: claimId }, type: 'query' }]
  };
}
```

### Prefetching Methods

The manager exposes three main methods:

1. **prefetchSummary**: Prefetches basic claim summary data.
2. **prefetchDetails**: Prefetches detailed claim information.
3. **prefetchMultipleSummaries**: Prefetches summaries for multiple claims with prioritization.

### Cache Checking

Before prefetching, the manager checks if data is already in the cache or if a fetch is already in progress:

```typescript
// Check if we already have fresh data in the cache
const cachedData = this.queryClient.getQueryData(queryKey);
const queryState = this.queryClient.getQueryState(queryKey);

// If we have fresh data, skip prefetching
if (cachedData && 
    queryState?.status === 'success' && 
    !queryState.isInvalidated && 
    queryState.dataUpdatedAt && 
    (Date.now() - queryState.dataUpdatedAt) < this.staleTime) {
  console.log(`[Prefetch] ${requestId} - Using cached data`);
  return Promise.resolve();
}

// If a fetch is already in progress, don't start another one
if (queryState?.fetchStatus === 'fetching') {
  console.log(`[Prefetch] ${requestId} - Fetch already in progress`);
  return Promise.resolve();
}
```

### Direct Cache Manipulation

The manager directly manipulates the cache to ensure data is stored with the correct query key:

```typescript
// Directly fetch the data using the tRPC client
const fetchPromise = type === 'summary'
  ? apiClient.raw.claim.getSummary.query({ id: claimId })
  : apiClient.raw.claim.getDetails.query({ id: claimId });

// Manually set the data in the cache
fetchPromise.then((data) => {
  // Set the data in the cache with the exact query key
  this.queryClient.setQueryData(queryKey, data);
  
  // Set the query defaults to control staleTime and cacheTime
  this.queryClient.setQueryDefaults(queryKey, {
    staleTime: this.staleTime,
    cacheTime: this.cacheTime
  });
});
```

### Queue Management

Background prefetching is organized in a queue to avoid overwhelming the server:

```typescript
private queuePrefetch(claimId: string, type: 'summary' | 'details'): void {
  const queueItem = `${type}:${claimId}`;

  // Check if this item is already in the queue
  if (this.prefetchQueue.has(queueItem)) {
    console.log(`[Prefetch Queue] Item ${queueItem} already in queue, skipping`);
    return;
  }

  this.prefetchQueue.add(queueItem);
  this.processQueue();
}
```

## Usage Patterns

### Component Integration

Components should use the `useClaimPrefetching` hook to access the manager:

```typescript
const { prefetchSummary, prefetchDetails, prefetchMultipleSummaries } = useClaimPrefetching();
```

### Prefetching on Page Load

```typescript
// In ClaimList component
useEffect(() => {
  if (!data?.items || data.items.length === 0) return;

  // Get all claim IDs
  const claimIds = data.items.map(claim => claim.id);

  // Prefetch summaries for all claims
  void prefetchMultipleSummaries(claimIds, 3);
}, [data?.items, prefetchMultipleSummaries]);
```

### Prefetching on User Interaction

```typescript
// In ExpandableRow component
const handleRowHover = useCallback(() => {
  // Only prefetch if not already expanded
  if (!isExpanded) {
    // Prefetch summary with low priority (will be queued if busy)
    void prefetchSummary(claim.id, false);
  }
}, [claim.id, isExpanded, prefetchSummary]);

return (
  <TableRow onMouseEnter={handleRowHover}>
    {/* Row content */}
  </TableRow>
);
```

## Best Practices

1. **Always Use the Hook**: Access the manager through the `useClaimPrefetching` hook to ensure a consistent instance.
2. **Prioritize Wisely**: Use high priority (`true`) for immediate needs and low priority (`false`) for background prefetching.
3. **Implement Hover Prefetching**: Prefetch data when users hover over elements to anticipate their actions.
4. **Prefetch on Page Load**: Prefetch visible items immediately when a page loads.
5. **Limit Priority Prefetching**: Only prefetch a small number of items with high priority to avoid overwhelming the server.

## Debugging

The manager includes comprehensive logging to help debug prefetching issues:

- **Cache Checks**: Logs when checking if data is already in the cache.
- **Prefetch Execution**: Logs when starting and completing prefetch operations.
- **Queue Management**: Logs queue processing and batch execution.

Enable React Query DevTools to visually inspect the cache and verify that prefetched data is properly stored.

## Common Issues

1. **Cache Misses**: If prefetched data isn't being used, check that the query keys match exactly.
2. **Redundant Requests**: If the same data is being fetched multiple times, check that cache checking is working correctly.
3. **Overwhelming the Server**: If too many requests are being made at once, adjust the queue batch size and prioritization.

## Implementation Notes

- **staleTime**: Set to 5 minutes (300,000ms) to balance freshness and cache utilization.
- **cacheTime**: Set to 10 minutes (600,000ms) to keep data available for a reasonable period.
- **Queue Batch Size**: Set to 2 to avoid overwhelming the server with background prefetching.
- **Queue Processing Delay**: Set to 150ms between batches to spread out requests.
