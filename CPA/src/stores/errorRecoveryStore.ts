'use client';

import { create } from 'zustand';
import { toast } from 'sonner';

interface FailedOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'batch';
  entityId: string;
  entityType: string;
  operation: any; // The original operation data
  error: {
    message: string;
    code?: string | number;
    type: 'network' | 'validation' | 'permission' | 'server' | 'client' | 'unknown';
    isRetryable: boolean;
    timestamp: number;
  };
  retryCount: number;
  maxRetries: number;
  lastRetry?: number;
  autoRetryEnabled: boolean;
  userNotified: boolean;
}

interface RecoveryAction {
  id: string;
  label: string;
  description: string;
  action: () => Promise<boolean>;
  isDestructive?: boolean;
}

interface ErrorRecoveryState {
  failedOperations: Map<string, FailedOperation>;
  recoveryActions: Map<string, RecoveryAction[]>;
  isRecoveryInProgress: boolean;
  
  // Actions
  addFailedOperation: (operation: Omit<FailedOperation, 'id'>) => string;
  removeFailedOperation: (id: string) => void;
  updateFailedOperation: (id: string, updates: Partial<FailedOperation>) => void;
  
  addRecoveryActions: (operationId: string, actions: RecoveryAction[]) => void;
  executeRecoveryAction: (operationId: string, actionId: string) => Promise<boolean>;
  
  retryOperation: (id: string) => Promise<boolean>;
  retryAllOperations: () => Promise<number>;
  
  clearAllFailures: () => void;
  clearOldFailures: (maxAge?: number) => number;
  
  // Getters
  getFailedOperations: () => FailedOperation[];
  getFailedOperationsByType: (entityType: string) => FailedOperation[];
  getRetryableOperations: () => FailedOperation[];
  hasFailures: () => boolean;
  hasRetryableFailures: () => boolean;
  
  // Auto-retry management
  enableAutoRetry: (id: string) => void;
  disableAutoRetry: (id: string) => void;
  processAutoRetries: () => Promise<number>;
}

export const useErrorRecoveryStore = create<ErrorRecoveryState>((set, get) => ({
  failedOperations: new Map(),
  recoveryActions: new Map(),
  isRecoveryInProgress: false,

  addFailedOperation: (operation) => {
    const id = `failed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const failedOp: FailedOperation = {
      id,
      ...operation,
    };

    set((state) => {
      const newFailedOperations = new Map(state.failedOperations);
      newFailedOperations.set(id, failedOp);
      return { failedOperations: newFailedOperations };
    });

    // Show user notification if not already notified
    if (!operation.userNotified && operation.error.isRetryable) {
      toast.error(`${operation.type.charAt(0).toUpperCase() + operation.type.slice(1)} failed`, {
        description: operation.error.message,
        action: {
          label: 'Retry',
          onClick: () => get().retryOperation(id)
        },
        duration: 10000,
      });

      // Mark as notified
      get().updateFailedOperation(id, { userNotified: true });
    }

    console.error(`[ErrorRecoveryStore] Added failed operation ${id}:`, failedOp);
    return id;
  },

  removeFailedOperation: (id) => {
    set((state) => {
      const newFailedOperations = new Map(state.failedOperations);
      const newRecoveryActions = new Map(state.recoveryActions);
      
      newFailedOperations.delete(id);
      newRecoveryActions.delete(id);
      
      return { 
        failedOperations: newFailedOperations,
        recoveryActions: newRecoveryActions
      };
    });
  },

  updateFailedOperation: (id, updates) => {
    set((state) => {
      const newFailedOperations = new Map(state.failedOperations);
      const existing = newFailedOperations.get(id);
      
      if (existing) {
        newFailedOperations.set(id, { ...existing, ...updates });
      }
      
      return { failedOperations: newFailedOperations };
    });
  },

  addRecoveryActions: (operationId, actions) => {
    set((state) => {
      const newRecoveryActions = new Map(state.recoveryActions);
      newRecoveryActions.set(operationId, actions);
      return { recoveryActions: newRecoveryActions };
    });
  },

  executeRecoveryAction: async (operationId, actionId) => {
    const { recoveryActions } = get();
    const actions = recoveryActions.get(operationId);
    const action = actions?.find(a => a.id === actionId);

    if (!action) {
      console.error(`[ErrorRecoveryStore] Recovery action ${actionId} not found for operation ${operationId}`);
      return false;
    }

    set({ isRecoveryInProgress: true });

    try {
      console.log(`[ErrorRecoveryStore] Executing recovery action ${actionId} for operation ${operationId}`);
      const success = await action.action();
      
      if (success) {
        // Remove the failed operation on successful recovery
        get().removeFailedOperation(operationId);
        toast.success('Recovery successful', {
          description: `${action.label} completed successfully.`,
        });
      } else {
        toast.error('Recovery failed', {
          description: `${action.label} could not be completed.`,
        });
      }

      return success;
    } catch (error) {
      console.error(`[ErrorRecoveryStore] Recovery action failed:`, error);
      toast.error('Recovery error', {
        description: `An error occurred while executing ${action.label}.`,
      });
      return false;
    } finally {
      set({ isRecoveryInProgress: false });
    }
  },

  retryOperation: async (id) => {
    const { failedOperations } = get();
    const operation = failedOperations.get(id);

    if (!operation) {
      console.warn(`[ErrorRecoveryStore] Operation ${id} not found for retry`);
      return false;
    }

    if (!operation.error.isRetryable) {
      console.warn(`[ErrorRecoveryStore] Operation ${id} is not retryable`);
      toast.error('Cannot retry', {
        description: 'This operation cannot be retried automatically.',
      });
      return false;
    }

    if (operation.retryCount >= operation.maxRetries) {
      console.warn(`[ErrorRecoveryStore] Operation ${id} has exceeded max retries`);
      toast.error('Maximum retries exceeded', {
        description: 'This operation has been retried too many times.',
      });
      return false;
    }

    set({ isRecoveryInProgress: true });

    try {
      // Update retry count and timestamp
      get().updateFailedOperation(id, {
        retryCount: operation.retryCount + 1,
        lastRetry: Date.now(),
      });

      console.log(`[ErrorRecoveryStore] Retrying operation ${id}, attempt ${operation.retryCount + 1}/${operation.maxRetries}`);

      // Here you would implement the actual retry logic based on operation type
      // For now, we'll simulate success/failure
      const success = Math.random() > 0.3; // 70% success rate for simulation

      if (success) {
        get().removeFailedOperation(id);
        toast.success('Retry successful', {
          description: `${operation.type} operation completed successfully.`,
        });
        return true;
      } else {
        // Update error information
        get().updateFailedOperation(id, {
          error: {
            ...operation.error,
            timestamp: Date.now(),
          },
          userNotified: false, // Allow re-notification
        });
        
        toast.error('Retry failed', {
          description: `${operation.type} operation failed again. ${operation.maxRetries - operation.retryCount - 1} attempts remaining.`,
        });
        return false;
      }
    } catch (error) {
      console.error(`[ErrorRecoveryStore] Retry operation error:`, error);
      toast.error('Retry error', {
        description: 'An unexpected error occurred during retry.',
      });
      return false;
    } finally {
      set({ isRecoveryInProgress: false });
    }
  },

  retryAllOperations: async () => {
    const retryableOps = get().getRetryableOperations();
    
    if (retryableOps.length === 0) {
      toast.info('No operations to retry', {
        description: 'All operations are either successful or not retryable.',
      });
      return 0;
    }

    console.log(`[ErrorRecoveryStore] Retrying ${retryableOps.length} operations`);
    
    let successCount = 0;
    const promises = retryableOps.map(async (op) => {
      const success = await get().retryOperation(op.id);
      if (success) successCount++;
      
      // Add delay between retries to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    await Promise.all(promises);

    if (successCount > 0) {
      toast.success(`Retry complete`, {
        description: `${successCount}/${retryableOps.length} operations succeeded.`,
      });
    }

    return successCount;
  },

  clearAllFailures: () => {
    set({ 
      failedOperations: new Map(),
      recoveryActions: new Map()
    });
    
    toast.info('All failures cleared', {
      description: 'Failed operations list has been cleared.',
    });
  },

  clearOldFailures: (maxAge = 24 * 60 * 60 * 1000) => { // Default 24 hours
    const now = Date.now();
    const { failedOperations } = get();
    let clearedCount = 0;

    const newFailedOperations = new Map();
    const newRecoveryActions = new Map(get().recoveryActions);

    for (const [id, operation] of failedOperations.entries()) {
      if (now - operation.error.timestamp > maxAge) {
        newRecoveryActions.delete(id);
        clearedCount++;
      } else {
        newFailedOperations.set(id, operation);
      }
    }

    if (clearedCount > 0) {
      set({ 
        failedOperations: newFailedOperations,
        recoveryActions: newRecoveryActions
      });
      
      console.log(`[ErrorRecoveryStore] Cleared ${clearedCount} old failures`);
    }

    return clearedCount;
  },

  // Getters
  getFailedOperations: () => {
    return Array.from(get().failedOperations.values());
  },

  getFailedOperationsByType: (entityType) => {
    return Array.from(get().failedOperations.values())
      .filter(op => op.entityType === entityType);
  },

  getRetryableOperations: () => {
    return Array.from(get().failedOperations.values())
      .filter(op => op.error.isRetryable && op.retryCount < op.maxRetries);
  },

  hasFailures: () => {
    return get().failedOperations.size > 0;
  },

  hasRetryableFailures: () => {
    return get().getRetryableOperations().length > 0;
  },

  // Auto-retry management
  enableAutoRetry: (id) => {
    get().updateFailedOperation(id, { autoRetryEnabled: true });
  },

  disableAutoRetry: (id) => {
    get().updateFailedOperation(id, { autoRetryEnabled: false });
  },

  processAutoRetries: async () => {
    const operations = Array.from(get().failedOperations.values())
      .filter(op => 
        op.autoRetryEnabled && 
        op.error.isRetryable && 
        op.retryCount < op.maxRetries &&
        (!op.lastRetry || Date.now() - op.lastRetry > 30000) // Wait 30 seconds between auto-retries
      );

    if (operations.length === 0) {
      return 0;
    }

    console.log(`[ErrorRecoveryStore] Processing ${operations.length} auto-retries`);
    
    let successCount = 0;
    for (const operation of operations) {
      const success = await get().retryOperation(operation.id);
      if (success) successCount++;
      
      // Add delay between auto-retries
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return successCount;
  },
}));

// Auto-retry processor - runs every minute
if (typeof window !== 'undefined') {
  setInterval(() => {
    useErrorRecoveryStore.getState().processAutoRetries();
  }, 60000);

  // Clean up old failures every hour
  setInterval(() => {
    useErrorRecoveryStore.getState().clearOldFailures();
  }, 60 * 60 * 1000);
}