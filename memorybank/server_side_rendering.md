# Server-Side Rendering Implementation

## Overview

This document outlines the implementation of server-side rendering (SSR) with proper caching in the CPA application. The implementation focuses on optimizing data fetching and caching to improve performance and user experience.

## Key Components

### 1. Standardized Server-Side tRPC Caller

We created a standardized utility for creating server-side tRPC callers that can be used across all domain-specific server-prefetch files. This utility ensures consistency and proper error handling.

**Location**: `src/lib/api/utils/createServerCaller.ts`

```typescript
import "server-only";
import { NextRequest } from "next/server";
import { cache } from "react";
import { createTRPCContext } from "@/server/api/trpc";
import { appRouter, createCaller } from "@/server/api/root";
import { type AppRouter } from "@/server/api/root";

/**
 * Creates a server-side tRPC caller with proper request context
 * This is cached using React's cache() to deduplicate requests
 */
export const createServerCaller = cache(async () => {
  try {
    // Create a mock request object with headers
    const mockRequest = new NextRequest('http://localhost:3000', {
      headers: {
        'x-trpc-source': 'server',
        'content-type': 'application/json',
      },
    });

    // Create a proper context with the mock request
    const ctx = await createTRPCContext({
      headers: mockRequest.headers,
      request: mockRequest,
    });

    // Use the createCaller from root.ts with our context
    return createCaller(ctx);
  } catch (error) {
    console.error('[Server Caller] Error creating server caller:', error);
    throw error;
  }
});

/**
 * Type-safe wrapper for specific procedures
 */
export const getTypedServerCaller = async () => {
  return await createServerCaller() as ReturnType<typeof appRouter.createCaller>;
};

/**
 * Creates a query key in the format expected by tRPC
 */
export function createTRPCQueryKey<
  TRouter extends keyof AppRouter,
  TProcedure extends keyof AppRouter[TRouter]
>(
  router: TRouter & string,
  procedure: TProcedure & string,
  input?: Record<string, any>
): unknown[] {
  return [['trpc', router, procedure], { input, type: 'query' }];
}
```

### 2. Centralized Query Keys and Cache Times

We enhanced the claims constants file to include tRPC-compatible query keys that match the internal structure used by tRPC. This ensures better cache hits between server and client.

**Location**: `src/lib/api/domains/claims/constants.ts`

```typescript
// Query keys for consistent cache access
export const QUERY_KEYS = {
  // Base keys
  ALL_CLAIMS: ['claims'] as const,
  SUMMARY: ['claims', 'summary'] as const,
  DETAILS: ['claims', 'details'] as const,
  LIST: ['claims', 'list'] as const,
  COUNTS: ['claims', 'counts'] as const,

  // Factory functions for specific items
  getSummaryKey: (id: string) => ['claims', 'summary', id] as const,
  getDetailsKey: (id: string) => ['claims', 'details', id] as const,
  getListKey: (params: any) => ['claims', 'list', params] as const,
  
  // tRPC-compatible query keys for server-side prefetching
  TRPC: {
    SUMMARY: (id: string) => [['trpc', 'claim', 'getSummary'], { input: { id }, type: 'query' }] as const,
    DETAILS: (id: string) => [['trpc', 'claim', 'getDetails'], { input: { id }, type: 'query' }] as const,
    LIST: (params: any) => [['trpc', 'claim', 'getAll'], { input: params, type: 'query' }] as const,
    COUNTS: () => [['trpc', 'claim', 'getCounts'], { input: undefined, type: 'query' }] as const,
    APPOINTMENTS: (claimId: string) => [['trpc', 'appointment', 'getByClaim'], { input: { claim_id: claimId }, type: 'query' }] as const,
    ATTACHMENTS: (claimId: string) => [['trpc', 'attachment', 'getByClaim'], { input: { claim_id: claimId }, type: 'query' }] as const,
    VEHICLE: (vehicleId: string) => [['trpc', 'vehicle', 'getById'], { input: { id: vehicleId }, type: 'query' }] as const,
    CLIENT: (clientId: string) => [['trpc', 'client', 'getById'], { input: { id: clientId }, type: 'query' }] as const,
  }
};
```

### 3. Server-Side Prefetching with Query Client Hydration

We updated the server-prefetch functions to hydrate the query client with prefetched data. This ensures that data prefetched on the server is properly recognized by the client, eliminating redundant fetches.

**Location**: `src/lib/api/domains/claims/server-prefetch.server.ts`

```typescript
export const prefetchClaimServer = cache(async (id: string) => {
  try {
    // Get the query client for hydration
    const queryClient = getQueryClient();
    
    // Create a tRPC caller for server-side
    const caller = await createServerCaller();

    // Fetch data and hydrate the query client
    const [summary, details] = await Promise.all([
      caller.claim.getSummary({ id })
        .catch((error: Error) => {
          console.error(`[Server Prefetch] Error fetching claim summary for ${id}:`, error);
          return null;
        }),
      caller.claim.getDetails({ id })
        .catch((error: Error) => {
          console.error(`[Server Prefetch] Error fetching claim details for ${id}:`, error);
          return null;
        })
    ]);

    // Hydrate the query client with the fetched data
    if (summary) {
      queryClient.setQueryData(
        QUERY_KEYS.TRPC.SUMMARY(id),
        summary
      );
      
      // Also set the data in the client-side query key format
      queryClient.setQueryData(
        QUERY_KEYS.getSummaryKey(id),
        summary
      );
    }
    
    // ... similar hydration for other data types
    
    return {
      summary,
      details,
      // ... other data
    };
  } catch (error) {
    // Error handling
  }
});
```

## Domain-Specific Server-Prefetch Files

We updated all domain-specific server-prefetch files to use the standardized createServerCaller utility:

1. **Claims**: `src/lib/api/domains/claims/server-prefetch.server.ts`
2. **Clients**: `src/lib/api/domains/clients/server-prefetch.server.ts`
3. **Lookups**: `src/lib/api/domains/lookups/server-prefetch.server.ts`
4. **Vehicles**: `src/lib/api/domains/vehicles/server-prefetch.server.ts`
5. **Attachments**: `src/lib/api/domains/attachments/server-prefetch.server.ts`
6. **Appointments**: `src/lib/api/domains/appointments/server-prefetch.server.ts`

## Benefits

1. **Consistent Server-Side Caller**: All domain-specific server-prefetch files now use the same standardized implementation, reducing code duplication and ensuring consistency.

2. **Proper Query Client Hydration**: Data prefetched on the server is now properly hydrated into the query client, eliminating redundant fetches when the client components mount.

3. **Dual Query Key Support**: By storing data with both tRPC-compatible query keys and client-side query keys, we ensure that both server and client components can access the same cached data.

4. **Improved Error Handling**: The standardized server-side caller includes proper error handling, making it easier to debug issues with server-side prefetching.

5. **Longer Cache Times**: We've increased cache times for claim data to improve the experience when attending to claims, reducing unnecessary refetches.

## Implementation Details

### Query Key Structure

The implementation uses two types of query keys:

1. **Client-Side Query Keys**: Simple arrays like `['claims', 'summary', id]` used by client components.
2. **tRPC-Compatible Query Keys**: Complex structures like `[['trpc', 'claim', 'getSummary'], { input: { id }, type: 'query' }]` used by tRPC internally.

By storing data with both types of keys, we ensure that both server and client components can access the same cached data.

### Hydration Process

1. Data is fetched on the server using the server-side tRPC caller.
2. The data is stored in the query client using both client-side and tRPC-compatible query keys.
3. The query client is hydrated and passed to client components.
4. Client components can access the prefetched data without making additional requests.

## Future Improvements

1. **Prefetch More Data**: Extend the prefetching to cover more data types and scenarios.
2. **Optimize Cache Times**: Fine-tune cache times based on usage patterns and data volatility.
3. **Add Cache Invalidation**: Implement more sophisticated cache invalidation strategies.
4. **Implement Stale-While-Revalidate**: Add support for stale-while-revalidate pattern to improve perceived performance.
