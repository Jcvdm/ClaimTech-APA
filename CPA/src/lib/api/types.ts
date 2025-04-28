// src/lib/api/types.ts
import { type RouterOutputs, type RouterInputs } from "@/trpc/shared";

// Re-export types from tRPC for convenience
export type { RouterOutputs, RouterInputs };

// Generic pagination response type
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    pages: number;
    current: number;
    hasMore: boolean;
  };
}

// Generic filter parameters
export interface FilterParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// API response status
export enum ApiStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error'
}

// Query result with status
export interface QueryResult<T> {
  data: T | undefined;
  status: ApiStatus;
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined; // Ensure it's compatible with Error type
  refetch?: () => Promise<any>; // Add refetch function
}
