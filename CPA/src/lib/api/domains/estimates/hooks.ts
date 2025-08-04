// src/lib/api/domains/estimates/hooks.ts
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { estimateQueries } from "./queries";
import { QUERY_KEYS } from "./constants";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import {
  type Estimate,
  type EstimateCreate,
  type EstimateLine,
  type EstimateLineCreate,
  type EstimateLineUpdate
} from "./types";

// Network error handling utilities
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

// Enhanced error classification for better handling
type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
type ErrorType = 'network' | 'validation' | 'permission' | 'server' | 'client' | 'unknown';

interface EnhancedError {
  originalError: any;
  type: ErrorType;
  severity: ErrorSeverity;
  isRetryable: boolean;
  userMessage: string;
  technicalMessage: string;
  suggestedActions: string[];
}

const classifyError = (error: any): EnhancedError => {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code || error?.status;
  
  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('fetch') || 
      errorMessage.includes('timeout') || errorMessage.includes('connection') ||
      errorCode === 'NETWORK_ERROR' || errorCode === 'TIMEOUT') {
    return {
      originalError: error,
      type: 'network',
      severity: 'high',
      isRetryable: true,
      userMessage: 'Network connection issue. Please check your internet connection.',
      technicalMessage: error.message,
      suggestedActions: ['Check internet connection', 'Try again in a few moments', 'Refresh the page']
    };
  }

  // Validation errors
  if (errorMessage.includes('validation') || errorMessage.includes('invalid') ||
      errorMessage.includes('required') || errorMessage.includes('too_small') ||
      errorCode === 'BAD_REQUEST' || (errorCode >= 400 && errorCode < 500)) {
    return {
      originalError: error,
      type: 'validation',
      severity: 'medium',
      isRetryable: false,
      userMessage: 'The data you entered is not valid. Please check your input.',
      technicalMessage: error.message,
      suggestedActions: ['Check your input values', 'Ensure all required fields are filled', 'Contact support if the issue persists']
    };
  }

  // Permission errors
  if (errorMessage.includes('permission') || errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') || errorCode === 401 || errorCode === 403) {
    return {
      originalError: error,
      type: 'permission',
      severity: 'high',
      isRetryable: false,
      userMessage: 'You do not have permission to perform this action.',
      technicalMessage: error.message,
      suggestedActions: ['Check your user permissions', 'Contact your administrator', 'Try logging out and back in']
    };
  }

  // Server errors
  if (errorCode >= 500 || errorMessage.includes('server') || errorMessage.includes('internal')) {
    return {
      originalError: error,
      type: 'server',
      severity: 'high',
      isRetryable: true,
      userMessage: 'Server error occurred. Our team has been notified.',
      technicalMessage: error.message,
      suggestedActions: ['Try again in a few minutes', 'Contact support if the issue persists']
    };
  }

  // Default case
  return {
    originalError: error,
    type: 'unknown',
    severity: 'medium',
    isRetryable: true,
    userMessage: 'An unexpected error occurred.',
    technicalMessage: error.message || 'Unknown error',
    suggestedActions: ['Try again', 'Refresh the page', 'Contact support if the issue persists']
  };
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const executeWithRetry = async <T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (attempt: number, error: EnhancedError) => void
): Promise<T> => {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: EnhancedError;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = classifyError(error);
      
      // Don't retry if it's not a retryable error
      if (!lastError.isRetryable) {
        throw lastError;
      }

      // Don't retry on the last attempt
      if (attempt === finalConfig.maxAttempts) {
        throw lastError;
      }

      // Call retry callback if provided
      onRetry?.(attempt, lastError);

      // Calculate delay with exponential backoff
      const delay = Math.min(
        finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
        finalConfig.maxDelay
      );

      console.warn(`[executeWithRetry] Attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.technicalMessage);
      await sleep(delay);
    }
  }

  throw lastError!;
};

/**
 * Hook for fetching an estimate by claim ID
 * @param claimId The claim ID
 * @param options Additional query options
 */
export function useEstimate(claimId: string, options?: any) {
  return estimateQueries.getByClaimId(claimId, options);
}

// UUID validation helper
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

/**
 * Hook for fetching estimate lines by estimate ID
 * @param estimateId The estimate ID
 * @param options Additional query options
 */
export function useEstimateLines(estimateId: string, options?: any) {
  console.log("[useEstimateLines] Fetching lines for estimate:", estimateId);

  // Early validation to prevent invalid API calls
  if (!estimateId || !isValidUUID(estimateId)) {
    console.warn("[useEstimateLines] Invalid estimateId provided:", estimateId);
    // Return a disabled query state
    return {
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: () => Promise.resolve(),
      isFetching: false,
      status: 'success' as const
    };
  }

  const query = estimateQueries.getLinesByEstimateId(estimateId, {
    ...options,
    onSuccess: (data) => {
      console.log("[useEstimateLines] Successfully fetched lines:", data);
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error("[useEstimateLines] Error fetching lines:", error);
      options?.onError?.(error);
    },
    // Force refetch on mount to ensure we have the latest data
    refetchOnMount: true,
    // Reduce stale time to ensure we get fresh data
    staleTime: 0
  });

  return query;
}

/**
 * Hook for creating a new estimate
 */
export function useCreateEstimate() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore(); // Get user from Zustand store

  console.log("[useCreateEstimate] Current user from Zustand store:", user);

  // Check if user is available
  if (!user) {
    throw new Error("User must be authenticated to create estimates");
  }

  return api.estimate.create.useMutation({
    onSuccess: (data) => {
      console.log("[useCreateEstimate] Estimate created successfully:", data);
      toast.success("Estimate created successfully");
      // Invalidate the claim's estimate query
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.BY_CLAIM_ID(data.claim_id)
      });
    },
    onError: (error) => {
      console.error("[useCreateEstimate] Error creating estimate:", error);
      toast.error(`Failed to create estimate: ${error.message}`);
    }
  });
}

/**
 * Hook for adding a new estimate line with optimistic updates and enhanced error handling
 */
export function useAddEstimateLine() {
  const queryClient = useQueryClient();
  const [loadingLines, setLoadingLines] = useState<Record<string, boolean>>({});
  const [retryAttempts, setRetryAttempts] = useState<Record<string, number>>({});

  const handleRetry = useCallback(async (variables: EstimateLineCreate) => {
    const retryKey = `new-${variables.estimate_id}`;
    const currentAttempts = retryAttempts[retryKey] || 0;
    
    if (currentAttempts >= 3) {
      toast.error('Maximum retry attempts reached', {
        description: 'Please refresh the page and try again.',
      });
      return;
    }

    setRetryAttempts(prev => ({ ...prev, [retryKey]: currentAttempts + 1 }));
    
    try {
      await executeWithRetry(
        () => mutation.mutateAsync(variables),
        { maxAttempts: 1 }, // Single attempt since we're handling retries manually
        (attempt, enhancedError) => {
          toast.info(`Retrying... (${currentAttempts + 1}/3)`, {
            description: enhancedError.userMessage,
          });
        }
      );
      
      // Reset retry count on success
      setRetryAttempts(prev => {
        const updated = { ...prev };
        delete updated[retryKey];
        return updated;
      });
    } catch (error) {
      console.error('[useAddEstimateLine] Retry failed:', error);
    }
  }, [retryAttempts]);

  const mutation = api.estimate.createLine.useMutation({
    onMutate: async (newLine) => {
      try {
        // Set loading state for this operation
        setLoadingLines(prev => ({ ...prev, new: true }));

        // Cancel any outgoing refetches
        await queryClient.cancelQueries({
          queryKey: QUERY_KEYS.LINES_BY_ESTIMATE_ID(newLine.estimate_id)
        });

        // Snapshot the previous value
        const previousLines = queryClient.getQueryData<EstimateLine[]>(
          QUERY_KEYS.LINES_BY_ESTIMATE_ID(newLine.estimate_id)
        ) || [];

        // Optimistically update to the new value
        const optimisticLine: EstimateLine = {
          id: `temp-${Date.now()}`, // Temporary ID
          ...newLine,
          damage_id: newLine.damage_id || null,
          part_number: newLine.part_number || null,
          part_cost: newLine.part_cost || null,
          strip_fit_hours: newLine.strip_fit_hours || null,
          repair_hours: newLine.repair_hours || null,
          paint_hours: newLine.paint_hours || null,
          sublet_cost: newLine.sublet_cost || null,
          line_notes: null,
          calculated_part_total: null,
          calculated_labor_total: null,
          calculated_paint_material_total: null,
          calculated_sublet_total: null,
          calculated_line_total: null,
          created_at: new Date(),
          updated_at: new Date(),
        };

        queryClient.setQueryData<EstimateLine[]>(
          QUERY_KEYS.LINES_BY_ESTIMATE_ID(newLine.estimate_id),
          [...previousLines, optimisticLine]
        );

        // Return a context object with the snapshot
        return { previousLines, newLine };
      } catch (error) {
        console.error('[useAddEstimateLine] onMutate error:', error);
        // Clear loading state on error
        setLoadingLines(prev => {
          const updated = { ...prev };
          delete updated.new;
          return updated;
        });
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      try {
        // Clear loading state
        setLoadingLines(prev => {
          const updated = { ...prev };
          delete updated.new;
          return updated;
        });

        // Reset retry attempts
        const retryKey = `new-${variables.estimate_id}`;
        setRetryAttempts(prev => {
          const updated = { ...prev };
          delete updated[retryKey];
          return updated;
        });

        // Invalidate the estimate lines query
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.LINES_BY_ESTIMATE_ID(data.estimate_id)
        });

        // Invalidate the estimate query to update totals
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.BY_ID(data.estimate_id)
        });

        toast.success("Estimate line added successfully");
      } catch (error) {
        console.error('[useAddEstimateLine] onSuccess error:', error);
      }
    },
    onError: (error, variables, context) => {
      try {
        // Clear loading state
        setLoadingLines(prev => {
          const updated = { ...prev };
          delete updated.new;
          return updated;
        });

        // Revert back to the previous state
        if (context) {
          queryClient.setQueryData(
            QUERY_KEYS.LINES_BY_ESTIMATE_ID(context.newLine.estimate_id),
            context.previousLines
          );
        }

        // Enhanced error handling
        const enhancedError = classifyError(error);
        console.error('[useAddEstimateLine] Enhanced error:', enhancedError);

        // Show appropriate error message based on error type
        if (enhancedError.type === 'validation') {
          toast.error('Invalid estimate line data', {
            description: enhancedError.userMessage,
            action: enhancedError.suggestedActions[0] ? {
              label: 'Help',
              onClick: () => {
                toast.info('Validation Help', {
                  description: enhancedError.suggestedActions.join(' • '),
                });
              }
            } : undefined,
          });
        } else if (enhancedError.isRetryable) {
          toast.error('Failed to add estimate line', {
            description: enhancedError.userMessage,
            action: {
              label: 'Retry',
              onClick: () => handleRetry(variables)
            },
          });
        } else {
          toast.error('Failed to add estimate line', {
            description: enhancedError.userMessage,
          });
        }
      } catch (errorHandlingError) {
        console.error('[useAddEstimateLine] Error handling error:', errorHandlingError);
        toast.error(`Failed to add estimate line: ${error.message}`);
      }
    }
  });

  return {
    ...mutation,
    loadingLines,
    retryAttempts,
    isLineLoading: (lineId: string) => loadingLines[lineId] || false,
    isNewLineLoading: () => loadingLines.new || false,
    retry: handleRetry,
  };
}

/**
 * Hook for updating an estimate line with optimistic updates and enhanced error handling
 */
export function useUpdateEstimateLine() {
  const queryClient = useQueryClient();
  const [loadingLines, setLoadingLines] = useState<Record<string, boolean>>({});
  const [retryAttempts, setRetryAttempts] = useState<Record<string, number>>({});

  const handleRetry = useCallback(async (variables: EstimateLineUpdate) => {
    const retryKey = `update-${variables.id}`;
    const currentAttempts = retryAttempts[retryKey] || 0;
    
    if (currentAttempts >= 3) {
      toast.error('Maximum retry attempts reached', {
        description: 'Please refresh the page and try again.',
      });
      return;
    }

    setRetryAttempts(prev => ({ ...prev, [retryKey]: currentAttempts + 1 }));
    
    try {
      await executeWithRetry(
        () => mutation.mutateAsync(variables),
        { maxAttempts: 1 },
        (attempt, enhancedError) => {
          toast.info(`Retrying update... (${currentAttempts + 1}/3)`, {
            description: enhancedError.userMessage,
          });
        }
      );
      
      setRetryAttempts(prev => {
        const updated = { ...prev };
        delete updated[retryKey];
        return updated;
      });
    } catch (error) {
      console.error('[useUpdateEstimateLine] Retry failed:', error);
    }
  }, [retryAttempts]);

  const mutation = api.estimate.updateLine.useMutation({
    onMutate: async (updatedLine) => {
      try {
        // Set loading state for this line
        setLoadingLines(prev => ({ ...prev, [updatedLine.id]: true }));

        // Cancel any outgoing refetches
        await queryClient.cancelQueries({
          queryKey: QUERY_KEYS.LINES_BY_ESTIMATE_ID(updatedLine.estimate_id)
        });

        // Snapshot the previous value
        const previousLines = queryClient.getQueryData<EstimateLine[]>(
          QUERY_KEYS.LINES_BY_ESTIMATE_ID(updatedLine.estimate_id)
        ) || [];

        // Optimistically update to the new value
        const optimisticLines = previousLines.map(line =>
          line.id === updatedLine.id
            ? { ...line, ...updatedLine, updated_at: new Date() }
            : line
        );

        queryClient.setQueryData<EstimateLine[]>(
          QUERY_KEYS.LINES_BY_ESTIMATE_ID(updatedLine.estimate_id),
          optimisticLines
        );

        // Return a context object with the snapshot
        return { previousLines, updatedLine };
      } catch (error) {
        console.error('[useUpdateEstimateLine] onMutate error:', error);
        setLoadingLines(prev => {
          const updated = { ...prev };
          delete updated[updatedLine.id];
          return updated;
        });
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      try {
        // Clear loading state for this line
        setLoadingLines(prev => {
          const updated = { ...prev };
          delete updated[variables.id];
          return updated;
        });

        // Reset retry attempts
        const retryKey = `update-${variables.id}`;
        setRetryAttempts(prev => {
          const updated = { ...prev };
          delete updated[retryKey];
          return updated;
        });

        // Invalidate the estimate lines query
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.LINES_BY_ESTIMATE_ID(data.estimate_id)
        });

        // Invalidate the estimate query to update totals
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.BY_ID(data.estimate_id)
        });

        // Only show success toast for manual operations, not automatic saves
        if (!variables._isAutoSave) {
          toast.success("Estimate line updated successfully");
        }
      } catch (error) {
        console.error('[useUpdateEstimateLine] onSuccess error:', error);
      }
    },
    onError: (error, variables, context) => {
      try {
        // Clear loading state for this line
        setLoadingLines(prev => {
          const updated = { ...prev };
          delete updated[variables.id];
          return updated;
        });

        // Revert back to the previous state
        if (context) {
          queryClient.setQueryData(
            QUERY_KEYS.LINES_BY_ESTIMATE_ID(context.updatedLine.estimate_id),
            context.previousLines
          );
        }

        // Enhanced error handling
        const enhancedError = classifyError(error);
        console.error('[useUpdateEstimateLine] Enhanced error:', enhancedError);

        // Different handling for auto-save vs manual operations
        if (variables._isAutoSave) {
          // For auto-save failures, show less intrusive notifications
          if (enhancedError.type === 'network') {
            console.warn('[useUpdateEstimateLine] Auto-save failed due to network issue, will retry later');
            // Could implement a queue for failed auto-saves here
          } else if (enhancedError.type !== 'validation') {
            toast.error('Auto-save failed', {
              description: 'Your changes have been preserved locally.',
            });
          }
        } else {
          // For manual operations, show full error handling
          if (enhancedError.type === 'validation') {
            toast.error('Invalid data', {
              description: enhancedError.userMessage,
              action: {
                label: 'Help',
                onClick: () => {
                  toast.info('Validation Help', {
                    description: enhancedError.suggestedActions.join(' • '),
                  });
                }
              },
            });
          } else if (enhancedError.isRetryable) {
            toast.error('Failed to update estimate line', {
              description: enhancedError.userMessage,
              action: {
                label: 'Retry',
                onClick: () => handleRetry(variables)
              },
            });
          } else {
            toast.error('Failed to update estimate line', {
              description: enhancedError.userMessage,
            });
          }
        }
      } catch (errorHandlingError) {
        console.error('[useUpdateEstimateLine] Error handling error:', errorHandlingError);
        toast.error(`Failed to update estimate line: ${error.message}`);
      }
    }
  });

  return {
    ...mutation,
    loadingLines,
    retryAttempts,
    isLineLoading: (lineId: string) => loadingLines[lineId] || false,
    retry: handleRetry,
  };
}

/**
 * Hook for deleting an estimate line with optimistic updates and enhanced error handling
 */
export function useDeleteEstimateLine() {
  const queryClient = useQueryClient();
  const [loadingLines, setLoadingLines] = useState<Record<string, boolean>>({});
  const [retryAttempts, setRetryAttempts] = useState<Record<string, number>>({});

  const handleRetry = useCallback(async (variables: { id: string }) => {
    const retryKey = `delete-${variables.id}`;
    const currentAttempts = retryAttempts[retryKey] || 0;
    
    if (currentAttempts >= 3) {
      toast.error('Maximum retry attempts reached', {
        description: 'Please refresh the page and try again.',
      });
      return;
    }

    setRetryAttempts(prev => ({ ...prev, [retryKey]: currentAttempts + 1 }));
    
    try {
      await executeWithRetry(
        () => mutation.mutateAsync(variables),
        { maxAttempts: 1 },
        (attempt, enhancedError) => {
          toast.info(`Retrying delete... (${currentAttempts + 1}/3)`, {
            description: enhancedError.userMessage,
          });
        }
      );
      
      setRetryAttempts(prev => {
        const updated = { ...prev };
        delete updated[retryKey];
        return updated;
      });
    } catch (error) {
      console.error('[useDeleteEstimateLine] Retry failed:', error);
    }
  }, [retryAttempts]);

  const mutation = api.estimate.deleteLine.useMutation({
    onMutate: async (variables) => {
      try {
        // Set loading state for this line
        setLoadingLines(prev => ({ ...prev, [variables.id]: true }));

        // We need to find the estimate_id for this line
        // Search through all estimate line queries
        const queryCache = queryClient.getQueryCache();
        const queries = queryCache.findAll({ type: 'active' });

        let estimateId: string | null = null;
        let previousLines: EstimateLine[] = [];

        for (const query of queries) {
          const queryKey = query.queryKey;
          if (Array.isArray(queryKey) && queryKey[0] === QUERY_KEYS.BASE && queryKey[1] === 'lines') {
            const lines = queryClient.getQueryData<EstimateLine[]>(queryKey) || [];
            const lineToDelete = lines.find(line => line.id === variables.id);

            if (lineToDelete) {
              estimateId = lineToDelete.estimate_id;
              previousLines = lines;
              break;
            }
          }
        }

        if (!estimateId) {
          console.warn('[useDeleteEstimateLine] Could not find estimate ID for line:', variables.id);
          return { previousLines: [], estimateId: null };
        }

        // Cancel any outgoing refetches
        await queryClient.cancelQueries({
          queryKey: QUERY_KEYS.LINES_BY_ESTIMATE_ID(estimateId)
        });

        // Optimistically update to the new value
        const optimisticLines = previousLines.filter(line => line.id !== variables.id);

        queryClient.setQueryData<EstimateLine[]>(
          QUERY_KEYS.LINES_BY_ESTIMATE_ID(estimateId),
          optimisticLines
        );

        // Return a context object with the snapshot
        return { previousLines, estimateId };
      } catch (error) {
        console.error('[useDeleteEstimateLine] onMutate error:', error);
        setLoadingLines(prev => {
          const updated = { ...prev };
          delete updated[variables.id];
          return updated;
        });
        throw error;
      }
    },
    onSuccess: (_, variables, context) => {
      try {
        // Clear loading state for this line
        setLoadingLines(prev => {
          const updated = { ...prev };
          delete updated[variables.id];
          return updated;
        });

        // Reset retry attempts
        const retryKey = `delete-${variables.id}`;
        setRetryAttempts(prev => {
          const updated = { ...prev };
          delete updated[retryKey];
          return updated;
        });

        if (context?.estimateId) {
          // Invalidate the estimate lines query
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.LINES_BY_ESTIMATE_ID(context.estimateId)
          });

          // Invalidate the estimate query to update totals
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.BY_ID(context.estimateId)
          });
        } else {
          // If we couldn't determine the estimate_id, invalidate all estimate-related queries
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.ALL
          });
        }

        toast.success("Estimate line deleted successfully");
      } catch (error) {
        console.error('[useDeleteEstimateLine] onSuccess error:', error);
      }
    },
    onError: (error, variables, context) => {
      try {
        // Clear loading state for this line
        setLoadingLines(prev => {
          const updated = { ...prev };
          delete updated[variables.id];
          return updated;
        });

        // Revert back to the previous state
        if (context && context.estimateId) {
          queryClient.setQueryData(
            QUERY_KEYS.LINES_BY_ESTIMATE_ID(context.estimateId),
            context.previousLines
          );
        }

        // Enhanced error handling
        const enhancedError = classifyError(error);
        console.error('[useDeleteEstimateLine] Enhanced error:', enhancedError);

        if (enhancedError.type === 'permission') {
          toast.error('Permission denied', {
            description: enhancedError.userMessage,
          });
        } else if (enhancedError.isRetryable) {
          toast.error('Failed to delete estimate line', {
            description: enhancedError.userMessage,
            action: {
              label: 'Retry',
              onClick: () => handleRetry(variables)
            },
          });
        } else {
          toast.error('Failed to delete estimate line', {
            description: enhancedError.userMessage,
          });
        }
      } catch (errorHandlingError) {
        console.error('[useDeleteEstimateLine] Error handling error:', errorHandlingError);
        toast.error(`Failed to delete estimate line: ${error.message}`);
      }
    }
  });

  return {
    ...mutation,
    loadingLines,
    retryAttempts,
    isLineLoading: (lineId: string) => loadingLines[lineId] || false,
    retry: handleRetry,
  };
}
