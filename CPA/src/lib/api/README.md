# Data Access Layer (DAL) Pattern

This document explains the consistent pattern used for the Data Access Layer (DAL) in this application.

## Overview

The DAL provides a clean separation between UI components and data fetching/mutation logic. It's built on top of tRPC and TanStack Query, providing a consistent way to interact with the backend.

## Directory Structure

Each domain (e.g., claims, clients, vehicles) follows this structure:

```
src/lib/api/domains/[domain]/
├── index.ts      # Re-exports everything + exports API object
├── types.ts      # Domain-specific types
├── queries.ts    # Functions for reading data
├── mutations.ts  # Functions for writing data
└── hooks.ts      # React hooks for components to use
```

## File Responsibilities

### `types.ts`

- Defines domain-specific types and schemas
- Typically imports from `RouterInputs` and `RouterOutputs` from tRPC

```typescript
import { type RouterOutputs, type RouterInputs } from "@/lib/api/types";

export type Entity = RouterOutputs["domain"]["procedure"];
export type EntityCreateInput = RouterInputs["domain"]["create"];
```

### `queries.ts`

- Defines functions for reading data
- Wraps tRPC query procedures with `apiClient.query`

```typescript
import { apiClient } from "@/lib/api/client";
import { type QueryOptions } from "@/lib/api/client";
import { type Entity } from "./types";

export const domainQueries = {
  getAll: (options?: QueryOptions<Entity[]>) => 
    apiClient.query<Entity[]>(
      () => apiClient.raw.domain.getAll.useQuery(), 
      options
    ),
  
  getById: (id: string, options?: QueryOptions<Entity>) => 
    apiClient.query<Entity>(
      () => apiClient.raw.domain.getById.useQuery({ id }), 
      {
        enabled: !!id,
        ...options
      }
    ),
};
```

### `mutations.ts`

- Defines functions for writing data
- Wraps tRPC mutation procedures with `apiClient.mutation`

```typescript
import { apiClient } from "@/lib/api/client";
import { type MutationOptions } from "@/lib/api/client";
import { type Entity, type EntityCreateInput } from "./types";

export const domainMutations = {
  create: (options?: MutationOptions<Entity, EntityCreateInput>) => 
    apiClient.mutation<Entity, EntityCreateInput>(
      () => apiClient.raw.domain.create.useMutation(),
      {
        onSuccess: (data, variables) => {
          toast.success("Entity created successfully");
          options?.onSuccess?.(data, variables);
        },
        ...options
      }
    ),
};
```

### `hooks.ts`

- Exports React hooks for components to use
- Uses `useQueryState` to standardize return values

```typescript
import { domainQueries } from "./queries";
import { domainMutations } from "./mutations";
import { useQueryState } from "@/lib/api/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@/lib/api/utils";
import { apiClient } from "@/lib/api/client";

export function useEntities() {
  const query = domainQueries.getAll();
  return useQueryState(() => query);
}

export function useEntity(id: string) {
  const query = domainQueries.getById(id);
  return useQueryState(() => query);
}

export function useCreateEntity() {
  const queryClient = useQueryClient();

  return domainMutations.create({
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: getQueryKey(apiClient.raw.domain.getAll) 
      });
    }
  });
}
```

### `index.ts`

- Re-exports everything for convenient imports
- Exports an API object for advanced use cases

```typescript
// Re-export everything for convenient imports
export * from './types';
export * from './hooks';

// Export raw queries and mutations for advanced use cases
import { domainQueries } from './queries';
import { domainMutations } from './mutations';

export const domainApi = {
  queries: domainQueries,
  mutations: domainMutations
};
```

## Usage in Components

Components should import and use the hooks from the domain:

```tsx
import { useEntities, useCreateEntity } from "@/lib/api/domains/domain";

function EntityList() {
  const { data: entities, isLoading, error } = useEntities();
  const createEntity = useCreateEntity();

  // Use the data and mutations in your component
}
```

## Benefits of This Pattern

1. **Consistency**: All domains follow the same pattern
2. **Separation of Concerns**: UI components don't need to know about tRPC details
3. **Reusability**: The same query can be used by multiple hooks
4. **Centralized Cache Management**: Easier to handle cache invalidation
5. **Consistent Error Handling**: Implement error handling once, use everywhere
6. **Testability**: Easier to mock data access for testing components
