'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useEstimateSessionStore } from '@/stores/estimateSessionStore';
import { type EstimateLine } from '@/lib/api/domains/estimates/types';
import { toast } from 'sonner';
import { api } from '@/trpc/react';

interface UseEstimateSessionOptions {
  estimateId: string;
  serverLines: EstimateLine[];
  onSyncSuccess?: () => void;
  onSyncError?: (error: Error) => void;
  autoSyncInterval?: number; // milliseconds, 0 to disable
}

interface UseEstimateSessionReturn {
  // Data
  displayLines: EstimateLine[];
  hasUnsavedChanges: boolean;
  syncStatus: 'idle' | 'syncing' | 'error' | 'conflict';
  
  // Actions
  updateField: (lineId: string, field: keyof EstimateLine, value: any) => void;
  syncNow: () => Promise<void>;
  discardChanges: () => void;
  resolveConflict: (lineId: string, field: string, useLocal: boolean) => void;
  
  // Status
  isFieldModified: (lineId: string, field: keyof EstimateLine) => boolean;
  getOriginalValue: (lineId: string, field: keyof EstimateLine) => any;
  
  // Additional UI information (for better status display)
  pendingChangesCount: number;
  conflictCount: number;
  modifiedLinesCount: number;
}

// UUID validation helper - same as in EditableEstimateLinesTable
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export function useEstimateSession({
  estimateId,
  serverLines,
  onSyncSuccess,
  onSyncError,
  autoSyncInterval = 30000 // Default 30 seconds
}: UseEstimateSessionOptions): UseEstimateSessionReturn {
  // Validate estimateId before proceeding
  if (!estimateId || !isValidUUID(estimateId)) {
    console.warn('[useEstimateSession] Invalid estimateId provided:', estimateId);
    // Return a "disabled" session state
    return {
      displayLines: serverLines || [],
      hasUnsavedChanges: false,
      syncStatus: 'idle',
      updateField: () => console.warn('[useEstimateSession] Cannot update field - invalid estimate ID'),
      syncNow: async () => console.warn('[useEstimateSession] Cannot sync - invalid estimate ID'),
      discardChanges: () => console.warn('[useEstimateSession] Cannot discard - invalid estimate ID'),
      resolveConflict: () => console.warn('[useEstimateSession] Cannot resolve conflict - invalid estimate ID'),
      isFieldModified: () => false,
      getOriginalValue: () => undefined,
      pendingChangesCount: 0,
      conflictCount: 0,
      modifiedLinesCount: 0
    };
  }
  const {
    currentEstimateId,
    serverData,
    pendingChanges,
    syncStatus,
    startSession,
    endSession,
    updateField: storeUpdateField,
    syncChanges,
    resolveConflict: storeResolveConflict,
    getDisplayData,
    hasUnsavedChanges,
    clearPendingChanges
  } = useEstimateSessionStore();

  // Initialize session when component mounts or estimateId changes
  useEffect(() => {
    const initSession = async () => {
      console.log('[useEstimateSession] Initializing session for estimate:', estimateId);
      await startSession(estimateId, serverLines);
      
      // Show notification if there were unsaved changes
      if (hasUnsavedChanges()) {
        toast.info('Restored unsaved changes from previous session', {
          action: {
            label: 'Discard',
            onClick: () => clearPendingChanges()
          }
        });
      }
    };

    initSession();

    // Cleanup on unmount
    return () => {
      console.log('[useEstimateSession] Cleaning up session');
      // End the session to save any pending changes
      endSession();
    };
  }, [estimateId, endSession]);

  // Update server data when it changes (but preserve pending changes)
  useEffect(() => {
    if (currentEstimateId === estimateId && serverLines.length > 0) {
      console.log('[useEstimateSession] Updating server data');
      const newServerData = new Map(
        serverLines.map(line => [line.id, line])
      );
      
      // Clean up stale pending changes (for lines that no longer exist)
      const validLineIds = new Set(serverLines.map(line => line.id));
      const stalePendingChanges = Array.from(pendingChanges.keys()).filter(
        lineId => !validLineIds.has(lineId)
      );
      
      if (stalePendingChanges.length > 0) {
        console.log('[useEstimateSession] Cleaning up stale pending changes for lines:', stalePendingChanges);
        const cleanedPendingChanges = new Map(pendingChanges);
        stalePendingChanges.forEach(lineId => cleanedPendingChanges.delete(lineId));
        
        useEstimateSessionStore.setState({ 
          serverData: newServerData,
          pendingChanges: cleanedPendingChanges
        });
      } else {
        // Only update if there are actual changes
        const hasChanges = serverLines.some(line => {
          const existing = serverData.get(line.id);
          return !existing || JSON.stringify(existing) !== JSON.stringify(line);
        });
        
        if (hasChanges) {
          useEstimateSessionStore.setState({ serverData: newServerData });
        }
      }
    }
  }, [serverLines, estimateId, currentEstimateId, pendingChanges]);

  // Get the bulk update mutation
  const bulkUpdateMutation = api.estimate.bulkUpdateLines.useMutation();

  // Memoized display data
  const displayLines = useMemo(() => {
    if (currentEstimateId !== estimateId) return serverLines;
    return getDisplayData();
  }, [currentEstimateId, estimateId, serverLines, pendingChanges, serverData]);

  // Update field with optimistic update
  const updateField = useCallback((lineId: string, field: keyof EstimateLine, value: any) => {
    if (currentEstimateId !== estimateId) {
      console.warn('[useEstimateSession] Cannot update field - session mismatch');
      return;
    }
    
    console.log(`[useEstimateSession] Updating ${String(field)} for line ${lineId}:`, value);
    storeUpdateField(lineId, field, value);
  }, [currentEstimateId, estimateId, storeUpdateField]);

  // Sync changes to server
  const syncNow = useCallback(async () => {
    if (!hasUnsavedChanges()) {
      console.log('[useEstimateSession] No changes to sync');
      return;
    }

    try {
      // Create the sync function that uses tRPC bulk update
      const syncFn = async (updates: Array<{id: string; estimate_id: string; [key: string]: any}>) => {
        console.log('[useEstimateSession] Calling tRPC bulkUpdateLines with', updates.length, 'updates');
        
        const result = await bulkUpdateMutation.mutateAsync({
          estimate_id: estimateId,
          updates
        });
        
        return {
          success: result.success,
          errors: result.errors
        };
      };

      console.log('[useEstimateSession] About to call syncChanges');
      await syncChanges(syncFn);
      console.log('[useEstimateSession] syncChanges completed successfully');
      onSyncSuccess?.();
      toast.success('Changes saved successfully');
    } catch (error) {
      console.error('[useEstimateSession] Sync error caught:', {
        error,
        errorType: typeof error,
        errorMessage: error?.message,
        errorName: error?.constructor?.name
      });
      onSyncError?.(error as Error);
      toast.error('Failed to save changes', {
        action: {
          label: 'Retry',
          onClick: () => syncNow()
        }
      });
    }
  }, [syncChanges, onSyncSuccess, onSyncError, hasUnsavedChanges, estimateId, bulkUpdateMutation]);

  // Auto-sync interval
  useEffect(() => {
    if (autoSyncInterval > 0 && hasUnsavedChanges()) {
      const interval = setInterval(async () => {
        if (syncStatus === 'idle' && hasUnsavedChanges()) {
          console.log('[useEstimateSession] Auto-syncing changes');
          await syncNow();
        }
      }, autoSyncInterval);

      return () => clearInterval(interval);
    }
  }, [autoSyncInterval, hasUnsavedChanges(), syncStatus, syncNow]);

  // Discard all pending changes
  const discardChanges = useCallback(() => {
    if (hasUnsavedChanges()) {
      if (confirm('Are you sure you want to discard all unsaved changes?')) {
        clearPendingChanges();
        toast.info('Changes discarded');
      }
    }
  }, [clearPendingChanges, hasUnsavedChanges]);

  // Resolve conflict
  const resolveConflict = useCallback((lineId: string, field: string, useLocal: boolean) => {
    storeResolveConflict(lineId, field, useLocal);
    toast.success(`Conflict resolved - using ${useLocal ? 'local' : 'server'} version`);
  }, [storeResolveConflict]);

  // Check if a field is modified
  const isFieldModified = useCallback((lineId: string, field: keyof EstimateLine): boolean => {
    const changes = pendingChanges.get(lineId);
    return changes ? field in changes : false;
  }, [pendingChanges]);

  // Get original server value for a field
  const getOriginalValue = useCallback((lineId: string, field: keyof EstimateLine): any => {
    const serverLine = serverData.get(lineId);
    return serverLine ? serverLine[field] : undefined;
  }, [serverData]);

  // Calculate detailed status information
  const pendingChangesCount = pendingChanges.size;
  const conflictCount = syncStatus === 'conflict' ? 1 : 0; // Simplified conflict counting
  const modifiedLinesCount = pendingChanges.size;

  return {
    displayLines,
    hasUnsavedChanges: hasUnsavedChanges(),
    syncStatus,
    updateField,
    syncNow,
    discardChanges,
    resolveConflict,
    isFieldModified,
    getOriginalValue,
    pendingChangesCount,
    conflictCount,
    modifiedLinesCount
  };
}

// Utility hook for sync status
export function useEstimateSyncStatus(estimateId: string) {
  const { currentEstimateId, syncStatus, hasUnsavedChanges } = useEstimateSessionStore();
  
  if (currentEstimateId !== estimateId) {
    return { syncStatus: 'idle' as const, hasUnsavedChanges: false };
  }
  
  return { syncStatus, hasUnsavedChanges: hasUnsavedChanges() };
}