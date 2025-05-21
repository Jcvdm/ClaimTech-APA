'use client';

import { create } from 'zustand';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface SyncOperation {
  id: string;
  timestamp: number;
}

interface SyncStatusState {
  status: SyncStatus;
  message: string;
  operations: Set<string>;
  addOperation: (id: string) => void;
  removeOperation: (id: string) => void;
  setError: (message: string) => void;
  reset: () => void;
}

/**
 * Store for tracking global synchronization status
 * Used to display a global indicator for sync operations
 */
export const useSyncStatusStore = create<SyncStatusState>((set, get) => ({
  status: 'idle',
  message: '',
  operations: new Set<string>(),
  
  /**
   * Add a new sync operation to track
   * @param id Unique identifier for the operation
   */
  addOperation: (id: string) => {
    set((state) => {
      const newOperations = new Set(state.operations);
      newOperations.add(id);
      
      return {
        operations: newOperations,
        status: 'syncing',
        message: 'Syncing...'
      };
    });
  },
  
  /**
   * Remove a sync operation when it completes
   * @param id Unique identifier for the operation
   */
  removeOperation: (id: string) => {
    set((state) => {
      const newOperations = new Set(state.operations);
      newOperations.delete(id);
      
      // If no more operations, set success
      if (newOperations.size === 0) {
        setTimeout(() => {
          // Only set to idle if still in success state
          if (get().status === 'success') {
            set({ status: 'idle', message: '' });
          }
        }, 3000);
        
        return {
          operations: newOperations,
          status: 'success',
          message: 'All changes saved'
        };
      }
      
      return {
        operations: newOperations
      };
    });
  },
  
  /**
   * Set an error state with a message
   * @param message Error message to display
   */
  setError: (message: string) => {
    set({
      status: 'error',
      message: `Error: ${message}`
    });
    
    // Auto-clear error after 5 seconds
    setTimeout(() => {
      // Only clear if still showing the same error
      if (get().status === 'error' && get().message === `Error: ${message}`) {
        set({ status: 'idle', message: '' });
      }
    }, 5000);
  },
  
  /**
   * Reset the sync status to idle
   */
  reset: () => {
    set({
      status: 'idle',
      message: '',
      operations: new Set()
    });
  }
}));
