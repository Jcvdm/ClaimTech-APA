'use client';

import { useCallback } from 'react';

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  exponentialBackoff?: boolean;
  onRetry?: (retryCount: number, error: Error) => void;
  onMaxRetriesReached?: (error: Error) => void;
}

export function useRetryableOperation() {
  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> => {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      exponentialBackoff = true,
      onRetry,
      onMaxRetriesReached
    } = options;

    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          onMaxRetriesReached?.(lastError);
          throw lastError;
        }
        
        onRetry?.(attempt + 1, lastError);
        
        // Calculate delay
        let delay = baseDelay;
        if (exponentialBackoff) {
          delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        }
        
        // Add jitter to prevent thundering herd
        delay += Math.random() * 1000;
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }, []);

  return { executeWithRetry };
}