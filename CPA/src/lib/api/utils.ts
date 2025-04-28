// src/lib/api/utils.ts
import { type FilterParams } from "./types";

// Format error messages
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// Create pagination parameters for API calls
export function createPaginationParams(
  filterParams: FilterParams
): { skip: number; take: number } {
  const page = filterParams.page || 1;
  const limit = filterParams.limit || 10;

  return {
    skip: (page - 1) * limit,
    take: limit
  };
}

// Create sort parameters for API calls
export function createSortParams(
  filterParams: FilterParams
): { orderBy?: { [key: string]: 'asc' | 'desc' } } {
  if (!filterParams.sortBy) return {};

  return {
    orderBy: {
      [filterParams.sortBy]: filterParams.sortOrder || 'asc'
    }
  };
}

// Helper to get query key for cache management
export function getQueryKey(
  procedure: any,
  input?: any
): unknown[] {
  if (!procedure) {
    throw new Error('Procedure is required to generate query key');
  }

  // Extract the path from the procedure
  const path = procedure.path || [];

  // Return the query key array
  return input ? [...path, input] : path;
}

/**
 * Creates a simple query key for use with TanStack Query
 * @param entity The entity type (e.g., 'claim', 'client', etc.)
 * @param action The action (e.g., 'list', 'detail', 'summary', etc.)
 * @param params Optional parameters to include in the query key
 * @returns A query key array
 */
export function createQueryKey(entity: string, action: string, params?: Record<string, any>): unknown[] {
  if (params) {
    return [entity, action, params];
  }
  return [entity, action];
}

/**
 * Creates a query key for a specific entity by ID
 * @param entity The entity type (e.g., 'claim', 'client', etc.)
 * @param action The action (e.g., 'detail', 'summary', etc.)
 * @param id The entity ID
 * @returns A query key array
 */
export function createEntityQueryKey(entity: string, action: string, id: string): unknown[] {
  return [entity, action, { id }];
}

/**
 * Utility to combine data from multiple queries
 */
export function combineQueryData<T extends Record<string, any>>(
  sources: { [K in keyof T]?: T[K] | undefined }
): T | undefined {
  // Check if any source is undefined
  const hasUndefined = Object.values(sources).some(value => value === undefined);
  if (hasUndefined) {
    return undefined;
  }

  // Combine all sources
  return Object.entries(sources).reduce(
    (result, [key, value]) => ({
      ...result,
      [key]: value
    }),
    {} as T
  );
}
