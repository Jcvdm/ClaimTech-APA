// src/lib/api/client.ts
import { api } from "@/trpc/react";
import { toast } from "sonner";

export type QueryOptions<T> = {
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  staleTime?: number;
  refetchInterval?: number;
  refetchOnWindowFocus?: boolean;
};

export type MutationOptions<TData, TVariables> = {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
};

// Standard error handler
export const handleApiError = (error: Error, context?: string): void => {
  console.error(`API Error${context ? ` (${context})` : ''}:`, error);
  toast.error(`Error: ${error.message || 'An unknown error occurred'}`);
};

// Base API client (wraps tRPC)
export const apiClient = {
  // Re-export the raw tRPC client for advanced use cases
  raw: api,

  // Query wrapper with standard options
  query: <T>(
    queryFn: (options?: any) => ReturnType<typeof api.any.any.useQuery>,
    options?: QueryOptions<T>
  ) => {
    return queryFn({
      staleTime: 1000 * 60 * 5, // 5 minutes by default
      refetchOnWindowFocus: false, // Default to false to prevent unnecessary refetches
      refetchOnMount: false, // Default to false to prevent refetches on component mount
      ...options, // Allow overriding defaults with specific options
      onError: (error: Error) => {
        handleApiError(error);
        options?.onError?.(error);
      }
    });
  },

  // Mutation wrapper with standard options
  mutation: <TData, TVariables>(
    mutationFn: (options?: any) => ReturnType<typeof api.any.any.useMutation>,
    options?: MutationOptions<TData, TVariables>
  ) => {
    return mutationFn({
      ...options,
      onError: (error: Error, variables: TVariables) => {
        handleApiError(error);
        options?.onError?.(error, variables);
      },
      onSuccess: (data: TData, variables: TVariables) => {
        options?.onSuccess?.(data, variables);
      }
    });
  }
};
