// src/lib/api/hooks.ts
import { useEffect, useState } from "react";
import { useInfiniteQuery, type UseInfiniteQueryOptions } from "@tanstack/react-query";
import { ApiStatus, type QueryResult } from "./types";
import { type QueryOptions } from "./client";
import { apiClient } from "./client";

// Base hook for handling query state
export function useQueryState<T>(
  queryFn: () => {
    data: T | undefined;
    isLoading: boolean;
    isError: boolean;
    error: any; // Changed from Error | null to any to support tRPC error types
    refetch?: () => Promise<any>; // Add refetch function
  }
): QueryResult<T> {
  const { data, isLoading, isError, error, refetch } = queryFn();

  let status = ApiStatus.IDLE;
  if (isLoading) status = ApiStatus.LOADING;
  else if (isError) status = ApiStatus.ERROR;
  else if (data !== undefined) status = ApiStatus.SUCCESS;

  // Ensure error has a name property to satisfy Error type requirements
  const processedError = error ? {
    ...error,
    name: error.name || 'Error'
  } : undefined;

  return {
    data,
    status,
    isLoading,
    isError,
    error: processedError,
    refetch // Pass through the refetch function
  };
}

// Hook for managing loading state across multiple queries
export function useCombinedLoadingState(
  ...loadingStates: boolean[]
): boolean {
  return loadingStates.some(state => state);
}

/**
 * Hook for dependent queries - executes a query only when its dependency is available
 */
export function useDependentQuery<TDep, TResult>(
  dependentData: TDep | undefined,
  queryFn: (data: TDep) => ReturnType<typeof apiClient.query<TResult>>,
  options?: Omit<QueryOptions<TResult>, "enabled">
) {
  const query = queryFn(dependentData as TDep, {
    ...options,
    enabled: !!dependentData
  });

  return useQueryState(() => query);
}

/**
 * Hook for parallel queries with combined loading state
 */
export function useParallelQueries<T extends Record<string, ReturnType<typeof useQueryState>>>(
  queries: T
): T & { isLoading: boolean; isError: boolean } {
  const isLoading = Object.values(queries).some(query => query.isLoading);
  const isError = Object.values(queries).some(query => query.isError);

  return {
    ...queries,
    isLoading,
    isError
  };
}

/**
 * Hook for infinite queries using TanStack Query's useInfiniteQuery
 */
export function useInfiniteData<TData, TPageParam = number>(
  queryFn: (pageParam: TPageParam) => ReturnType<typeof apiClient.raw.any.any.useQuery>,
  getNextPageParam: (lastPage: TData, allPages: TData[]) => TPageParam | undefined,
  options?: Omit<UseInfiniteQueryOptions<TData, Error, TData, TData, unknown[], TPageParam>,
    'queryFn' | 'getNextPageParam'>
) {
  return useInfiniteQuery<TData, Error, TData, unknown[], TPageParam>({
    queryFn: ({ pageParam }) => queryFn(pageParam as TPageParam),
    getNextPageParam,
    ...options
  });
}
