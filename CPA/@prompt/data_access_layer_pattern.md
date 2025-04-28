# Data Access Layer (DAL) Pattern

This document outlines the Data Access Layer (DAL) pattern implemented in our application, focusing on the integration with tRPC and TanStack Query.

## Overview

The Data Access Layer (DAL) pattern separates the business logic from the data access logic, providing a clean and consistent interface for interacting with data. In our application, the DAL is implemented using tRPC for the API layer and TanStack Query for client-side data management.

## Architecture

### Components

1. **tRPC Procedures**: Define the API endpoints and their input/output types.
2. **TanStack Query Hooks**: Provide a React-friendly interface for data fetching and caching.
3. **Prefetching Manager**: Optimizes the user experience by proactively loading data.
4. **Mutation Handlers**: Manage data updates with optimistic updates and error handling.

### Flow

```
Component -> TanStack Query Hook -> tRPC Client -> tRPC Server -> Database
                    ^
                    |
            Prefetching Manager
```

## Implementation

### tRPC Procedures

Define procedures in the tRPC router:

```typescript
export const claimRouter = router({
  getSummary: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const { id } = input;
      return await ctx.prisma.claim.findUnique({
        where: { id },
        include: {
          client: true,
          vehicle: true,
        },
      });
    }),
  
  getDetails: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const { id } = input;
      return await ctx.prisma.claim.findUnique({
        where: { id },
        include: {
          client: true,
          vehicle: true,
          appointments: true,
          damages: true,
          attachments: true,
          history: true,
        },
      });
    }),
  
  // Additional procedures...
});
```

### TanStack Query Hooks

Create custom hooks for data fetching:

```typescript
export function useClaimSummary(claimId: string, options?: UseQueryOptions) {
  const queryClient = useQueryClient();
  
  // Log cache state for debugging
  if (process.env.NODE_ENV === 'development') {
    const queryKey = [['trpc', 'claim', 'getSummary'], { input: { id: claimId }, type: 'query' }];
    const cachedData = queryClient.getQueryData(queryKey);
    const queryState = queryClient.getQueryState(queryKey);
    
    console.debug(
      `[useClaimSummary] ${claimId} - ` +
      `Cache hit: ${!!cachedData}, ` +
      `Status: ${queryState?.status || 'unknown'}, ` +
      `FetchStatus: ${queryState?.fetchStatus || 'unknown'}, ` +
      `DataUpdatedAt: ${queryState?.dataUpdatedAt ? 'recent' : 'never'}`
    );
  }
  
  // Use the tRPC hook with custom options
  return apiClient.claim.getSummary.useQuery(
    { id: claimId },
    {
      enabled: !!claimId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      ...options,
    }
  );
}
```

### Prefetching Manager

Implement a prefetching manager for proactive data loading:

```typescript
export class ClaimPrefetchManager {
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
    // Implementation with cache checking and deduplication
  }

  prefetchDetails(claimId: string, priority = false): Promise<void> {
    // Implementation with cache checking and deduplication
  }

  // Additional methods...
}
```

### Mutation Handlers

Implement mutation handlers with optimistic updates:

```typescript
export function useUpdateClaim() {
  const queryClient = useQueryClient();
  
  return apiClient.claim.update.useMutation({
    onMutate: async (newClaim) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries([['trpc', 'claim', 'getDetails'], { input: { id: newClaim.id }, type: 'query' }]);
      
      // Snapshot the previous value
      const previousClaim = queryClient.getQueryData([['trpc', 'claim', 'getDetails'], { input: { id: newClaim.id }, type: 'query' }]);
      
      // Optimistically update to the new value
      queryClient.setQueryData([['trpc', 'claim', 'getDetails'], { input: { id: newClaim.id }, type: 'query' }], {
        ...previousClaim,
        ...newClaim,
      });
      
      // Return a context object with the snapshot
      return { previousClaim };
    },
    onError: (err, newClaim, context) => {
      // If the mutation fails, use the context to roll back
      queryClient.setQueryData(
        [['trpc', 'claim', 'getDetails'], { input: { id: newClaim.id }, type: 'query' }],
        context.previousClaim
      );
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries([['trpc', 'claim', 'getDetails'], { input: { id: variables.id }, type: 'query' }]);
      queryClient.invalidateQueries([['trpc', 'claim', 'getSummary'], { input: { id: variables.id }, type: 'query' }]);
      queryClient.invalidateQueries([['trpc', 'claim', 'list'], { type: 'query' }]);
    },
  });
}
```

## Best Practices

### Query Key Consistency

Always use the same query key structure throughout the application:

```typescript
const queryKey = [['trpc', 'claim', 'getSummary'], { input: { id: claimId }, type: 'query' }];
```

### Cache Management

Set appropriate staleTime and cacheTime values:

```typescript
const { data } = useQuery({
  queryKey,
  queryFn,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

### Prefetching Strategy

Implement a smart prefetching strategy:

1. **On Page Load**: Prefetch visible items immediately.
2. **On Hover**: Prefetch data when users hover over elements.
3. **Prioritization**: Prioritize important data over less important data.
4. **Deduplication**: Avoid redundant prefetching requests.

### Error Handling

Implement comprehensive error handling:

```typescript
const { data, isLoading, isError, error } = useQuery({
  queryKey,
  queryFn,
  onError: (error) => {
    console.error('Query failed:', error);
    // Handle the error (e.g., show a toast notification)
  },
});
```

### Optimistic Updates

Implement optimistic updates for a better user experience:

```typescript
const mutation = useMutation({
  mutationFn,
  onMutate: async (newData) => {
    // Implementation
  },
  onError: (err, newData, context) => {
    // Implementation
  },
  onSettled: () => {
    // Implementation
  },
});
```

## Common Pitfalls

1. **Inconsistent Query Keys**: Using different query keys for the same data.
2. **Missing Cache Checks**: Not checking if data is already in the cache before fetching.
3. **Redundant Requests**: Not implementing deduplication for prefetching.
4. **Overwhelming the Server**: Prefetching too many items at once.
5. **Missing Error Handling**: Not handling errors in mutations.
6. **Inconsistent staleTime/cacheTime**: Using different values in different parts of the application.

## References

- [TanStack Query Documentation](https://tanstack.com/query/latest/docs/react/overview)
- [tRPC Documentation](https://trpc.io/docs/client/react/useQuery)
- [Data Access Layer Pattern](https://en.wikipedia.org/wiki/Data_access_layer)
