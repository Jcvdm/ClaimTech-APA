'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

// Enhanced error classification with more granular types
export type ErrorType = 
  | 'network' 
  | 'validation' 
  | 'permission' 
  | 'server' 
  | 'client' 
  | 'session' 
  | 'cache' 
  | 'sync' 
  | 'timeout'
  | 'unknown';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface EnhancedError {
  originalError: any;
  type: ErrorType;
  severity: ErrorSeverity;
  isRetryable: boolean;
  userMessage: string;
  technicalMessage: string;
  suggestedActions: string[];
  context?: Record<string, any>;
  timestamp: number;
  sessionId: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface RecoveryStrategy {
  name: string;
  description: string;
  action: () => Promise<void> | void;
  priority: number;
  conditions: string[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Enhanced error handling hook with comprehensive classification and recovery
 */
export function useEnhancedErrorHandling() {
  const [errorHistory, setErrorHistory] = useState<EnhancedError[]>([]);
  const [currentRetryAttempts, setCurrentRetryAttempts] = useState<Map<string, number>>(new Map());
  const sessionIdRef = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const circuitBreakerRef = useRef<Map<string, { failures: number; lastFailure: number }>>(new Map());
  
  // Circuit breaker configuration
  const CIRCUIT_BREAKER_CONFIG = {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minute
    halfOpenMaxCalls: 3,
  };

  /**
   * Classify error with enhanced context awareness
   */
  const classifyError = useCallback((error: any, context?: Record<string, any>): EnhancedError => {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorStack = error?.stack?.toLowerCase() || '';
    const errorCode = error?.code || error?.status;
    
    let type: ErrorType = 'unknown';
    let severity: ErrorSeverity = 'medium';
    let isRetryable = true;
    let userMessage = 'An unexpected error occurred.';
    let technicalMessage = error?.message || 'Unknown error';
    let suggestedActions: string[] = [];

    // Network-related errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || 
        errorMessage.includes('timeout') || errorMessage.includes('connection') ||
        errorCode === 'NETWORK_ERROR' || errorCode === 'TIMEOUT') {
      type = 'network';
      severity = 'high';
      isRetryable = true;
      userMessage = 'Network connection issue detected.';
      suggestedActions = [
        'Check your internet connection',
        'Try again in a few moments',
        'Switch to a different network if available'
      ];
    }
    
    // Session-related errors
    else if (errorMessage.includes('session') || errorMessage.includes('auth') ||
             errorMessage.includes('token') || errorCode === 401) {
      type = 'session';
      severity = 'high';
      isRetryable = false;
      userMessage = 'Your session has expired or is invalid.';
      suggestedActions = [
        'Log out and log back in',
        'Refresh the page',
        'Clear browser cache if problem persists'
      ];
    }
    
    // Cache-related errors
    else if (errorMessage.includes('cache') || errorStack.includes('react-query') ||
             errorStack.includes('tanstack')) {
      type = 'cache';
      severity = 'medium';
      isRetryable = true;
      userMessage = 'Data loading issue encountered.';
      suggestedActions = [
        'Refresh the page',
        'Clear browser cache',
        'Try again in a few minutes'
      ];
    }
    
    // Sync-related errors
    else if (errorMessage.includes('sync') || errorMessage.includes('conflict') ||
             context?.operation === 'sync') {
      type = 'sync';
      severity = 'medium';
      isRetryable = true;
      userMessage = 'Data synchronization failed.';
      suggestedActions = [
        'Check for conflicting changes',
        'Refresh to get latest data',
        'Try manual save'
      ];
    }
    
    // Validation errors
    else if (errorMessage.includes('validation') || errorMessage.includes('invalid') ||
             errorMessage.includes('required') || (errorCode >= 400 && errorCode < 500)) {
      type = 'validation';
      severity = 'medium';
      isRetryable = false;
      userMessage = 'The data provided is not valid.';
      suggestedActions = [
        'Check all required fields are filled',
        'Verify data formats are correct',
        'Contact support if validation seems incorrect'
      ];
    }
    
    // Permission errors
    else if (errorMessage.includes('permission') || errorMessage.includes('forbidden') ||
             errorCode === 403) {
      type = 'permission';
      severity = 'high';
      isRetryable = false;
      userMessage = 'You do not have permission for this action.';
      suggestedActions = [
        'Contact your administrator',
        'Check if you are logged in correctly',
        'Verify your user role and permissions'
      ];
    }
    
    // Server errors
    else if (errorCode >= 500 || errorMessage.includes('server') || 
             errorMessage.includes('internal')) {
      type = 'server';
      severity = 'high';
      isRetryable = true;
      userMessage = 'Server error occurred. Our team has been notified.';
      suggestedActions = [
        'Try again in a few minutes',
        'Contact support if issue persists',
        'Check system status page'
      ];
    }
    
    // Timeout errors
    else if (errorMessage.includes('timeout') || errorMessage.includes('abort')) {
      type = 'timeout';
      severity = 'medium';
      isRetryable = true;
      userMessage = 'The operation timed out.';
      suggestedActions = [
        'Try again with a stable connection',
        'Check if the server is responding slowly',
        'Consider breaking large operations into smaller chunks'
      ];
    }
    
    // Client-side errors
    else if (errorCode >= 400 && errorCode < 500) {
      type = 'client';
      severity = 'medium';
      isRetryable = false;
      userMessage = 'Client-side error occurred.';
      suggestedActions = [
        'Refresh the page',
        'Clear browser cache',
        'Try a different browser'
      ];
    }

    return {
      originalError: error,
      type,
      severity,
      isRetryable,
      userMessage,
      technicalMessage,
      suggestedActions,
      context,
      timestamp: Date.now(),
      sessionId: sessionIdRef.current
    };
  }, []);

  /**
   * Check circuit breaker status for operation
   */
  const checkCircuitBreaker = useCallback((operationKey: string): boolean => {
    const breakerState = circuitBreakerRef.current.get(operationKey);
    
    if (!breakerState) return true; // No failures recorded
    
    const { failures, lastFailure } = breakerState;
    const timeSinceLastFailure = Date.now() - lastFailure;
    
    // If enough time has passed, allow half-open state
    if (timeSinceLastFailure > CIRCUIT_BREAKER_CONFIG.recoveryTimeout) {
      return true;
    }
    
    // Circuit is open (broken) if too many failures
    return failures < CIRCUIT_BREAKER_CONFIG.failureThreshold;
  }, []);

  /**
   * Record circuit breaker failure
   */
  const recordCircuitBreakerFailure = useCallback((operationKey: string) => {
    const current = circuitBreakerRef.current.get(operationKey) || { failures: 0, lastFailure: 0 };
    circuitBreakerRef.current.set(operationKey, {
      failures: current.failures + 1,
      lastFailure: Date.now()
    });
  }, []);

  /**
   * Reset circuit breaker on success
   */
  const resetCircuitBreaker = useCallback((operationKey: string) => {
    circuitBreakerRef.current.delete(operationKey);
  }, []);

  /**
   * Execute operation with retry and circuit breaker
   */
  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    operationKey: string,
    config: Partial<RetryConfig> = {},
    context?: Record<string, any>
  ): Promise<T> => {
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: EnhancedError;
    
    // Check circuit breaker
    if (!checkCircuitBreaker(operationKey)) {
      const circuitError = new Error(`Circuit breaker is open for operation: ${operationKey}`);
      throw classifyError(circuitError, { ...context, circuitBreakerTripped: true });
    }

    const currentAttempts = currentRetryAttempts.get(operationKey) || 0;
    
    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        // Success - reset circuit breaker and retry count
        resetCircuitBreaker(operationKey);
        setCurrentRetryAttempts(prev => {
          const updated = new Map(prev);
          updated.delete(operationKey);
          return updated;
        });
        
        return result;
      } catch (error) {
        lastError = classifyError(error, { ...context, attempt, operationKey });
        
        // Record error in history
        setErrorHistory(prev => [...prev.slice(-19), lastError]); // Keep last 20 errors
        
        // Don't retry if it's not retryable
        if (!lastError.isRetryable) {
          recordCircuitBreakerFailure(operationKey);
          throw lastError;
        }

        // Don't retry on the last attempt
        if (attempt === finalConfig.maxAttempts) {
          recordCircuitBreakerFailure(operationKey);
          throw lastError;
        }

        // Update retry count
        setCurrentRetryAttempts(prev => {
          const updated = new Map(prev);
          updated.set(operationKey, currentAttempts + attempt);
          return updated;
        });

        // Calculate delay with exponential backoff and jitter
        let delay = Math.min(
          finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
          finalConfig.maxDelay
        );

        if (finalConfig.jitter) {
          delay = delay * (0.5 + Math.random() * 0.5); // Add jitter
        }

        console.warn(`[EnhancedErrorHandling] Attempt ${attempt} failed for ${operationKey}, retrying in ${delay}ms:`, lastError.technicalMessage);
        
        // Show retry notification for user-visible operations
        if (attempt < finalConfig.maxAttempts) {
          toast.loading(`Retrying... (${attempt}/${finalConfig.maxAttempts})`, {
            id: `retry_${operationKey}`,
            duration: delay,
          });
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }, [classifyError, checkCircuitBreaker, resetCircuitBreaker, recordCircuitBreakerFailure, currentRetryAttempts]);

  /**
   * Handle error with appropriate user notification and recovery strategies
   */
  const handleError = useCallback((
    error: any, 
    context?: Record<string, any>,
    recoveryStrategies: RecoveryStrategy[] = []
  ) => {
    const enhancedError = classifyError(error, context);
    
    // Add to error history
    setErrorHistory(prev => [...prev.slice(-19), enhancedError]);

    // Determine appropriate notification based on severity and context
    const showToast = () => {
      const baseToastOptions = {
        duration: enhancedError.severity === 'critical' ? Infinity : 
                  enhancedError.severity === 'high' ? 8000 : 5000,
      };

      // Critical errors need immediate attention
      if (enhancedError.severity === 'critical') {
        toast.error(enhancedError.userMessage, {
          ...baseToastOptions,
          description: 'This is a critical error that requires immediate action.',
          action: recoveryStrategies.length > 0 ? {
            label: recoveryStrategies[0].name,
            onClick: recoveryStrategies[0].action
          } : undefined,
        });
      }
      
      // High severity errors with recovery options
      else if (enhancedError.severity === 'high' && recoveryStrategies.length > 0) {
        toast.error(enhancedError.userMessage, {
          ...baseToastOptions,
          description: enhancedError.suggestedActions[0],
          action: {
            label: recoveryStrategies[0].name,
            onClick: recoveryStrategies[0].action
          },
        });
      }
      
      // Medium severity errors
      else if (enhancedError.severity === 'medium') {
        toast.warning(enhancedError.userMessage, {
          ...baseToastOptions,
          description: enhancedError.suggestedActions[0],
        });
      }
      
      // Low severity errors (info level)
      else {
        toast.info(enhancedError.userMessage, {
          ...baseToastOptions,
          description: enhancedError.suggestedActions[0],
        });
      }
    };

    // Show appropriate notification
    if (context?.silent !== true) {
      showToast();
    }

    // Log error for debugging
    console.error('[EnhancedErrorHandling] Error handled:', {
      type: enhancedError.type,
      severity: enhancedError.severity,
      message: enhancedError.technicalMessage,
      context: enhancedError.context,
      timestamp: new Date(enhancedError.timestamp).toISOString()
    });

    return enhancedError;
  }, [classifyError]);

  /**
   * Get error statistics for monitoring
   */
  const getErrorStats = useCallback(() => {
    const now = Date.now();
    const recentErrors = errorHistory.filter(error => now - error.timestamp < 300000); // Last 5 minutes
    
    const stats = {
      total: errorHistory.length,
      recent: recentErrors.length,
      byType: {} as Record<ErrorType, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      retryableErrors: errorHistory.filter(e => e.isRetryable).length,
      circuitBreakerStates: Array.from(circuitBreakerRef.current.entries()).map(([key, state]) => ({
        operation: key,
        failures: state.failures,
        isOpen: state.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold,
        timeSinceLastFailure: now - state.lastFailure
      }))
    };

    // Count by type and severity
    errorHistory.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
    });

    return stats;
  }, [errorHistory]);

  /**
   * Clear error history
   */
  const clearErrorHistory = useCallback(() => {
    setErrorHistory([]);
    setCurrentRetryAttempts(new Map());
    circuitBreakerRef.current.clear();
  }, []);

  // Cleanup old errors periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const cutoff = Date.now() - 3600000; // 1 hour ago
      setErrorHistory(prev => prev.filter(error => error.timestamp > cutoff));
    }, 300000); // Every 5 minutes

    return () => clearInterval(cleanup);
  }, []);

  return {
    classifyError,
    executeWithRetry,
    handleError,
    getErrorStats,
    clearErrorHistory,
    checkCircuitBreaker,
    errorHistory: errorHistory.slice(), // Return copy to prevent mutations
    currentRetryAttempts: new Map(currentRetryAttempts), // Return copy
  };
}