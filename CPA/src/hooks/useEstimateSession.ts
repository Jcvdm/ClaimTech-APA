'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useEstimateSessionStore } from '@/stores/estimateSessionStore';
import { useHybridEstimateData, useHybridEstimateLines, useEstimatePrefetching } from '@/lib/api/domains/estimates/estimateCache';
import { useEstimateBackgroundSync } from '@/hooks/useEstimateBackgroundSync';
import { type EstimateLine } from '@/lib/api/domains/estimates/types';
import { toast } from 'sonner';

interface UseEstimateSessionOptions {
  estimateId: string;
  claimId: string; // New: Required for DAL integration
  serverLines?: EstimateLine[]; // Optional now - DAL provides fallback
  onSyncSuccess?: () => void;
  onSyncError?: (error: Error) => void;
}

interface UseEstimateSessionReturn {
  // Data from DAL
  estimate: any; // Estimate data from DAL
  displayLines: EstimateLine[];
  hasUnsavedChanges: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
  lastActivityTime: number;
  
  // Loading states
  isLoading: boolean;
  isLinesLoading: boolean;
  
  // Actions
  updateField: (lineId: string, field: keyof EstimateLine, value: any) => void;
  addOptimisticLine: (tempId: string, line: EstimateLine) => void;
  replaceOptimisticLine: (tempId: string, realLine: EstimateLine) => void;
  removeLine: (lineId: string) => void;
  syncNow: () => Promise<void>;
  trackActivity: () => void;
  
  // Status helpers
  isLineModified: (lineId: string) => boolean;
  pendingChangesCount: number;
  
  // DAL integration
  refreshFromServer: () => Promise<void>;
}

// UUID validation helper
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export function useEstimateSession({
  estimateId,
  claimId,
  serverLines,
  onSyncSuccess,
  onSyncError
}: UseEstimateSessionOptions): UseEstimateSessionReturn {
  // Validate estimateId before proceeding
  if (!estimateId || !isValidUUID(estimateId)) {
    console.warn('[useEstimateSession] Invalid estimateId provided:', estimateId);
    // Return a "disabled" session state
    return {
      estimate: null,
      displayLines: serverLines || [],
      hasUnsavedChanges: false,
      syncStatus: 'idle',
      lastActivityTime: Date.now(),
      isLoading: false,
      isLinesLoading: false,
      updateField: () => console.warn('[useEstimateSession] Cannot update field - invalid estimate ID'),
      addOptimisticLine: () => console.warn('[useEstimateSession] Cannot add line - invalid estimate ID'),
      replaceOptimisticLine: () => console.warn('[useEstimateSession] Cannot replace line - invalid estimate ID'),
      removeLine: () => console.warn('[useEstimateSession] Cannot remove line - invalid estimate ID'),
      syncNow: async () => console.warn('[useEstimateSession] Cannot sync - invalid estimate ID'),
      trackActivity: () => {},
      isLineModified: () => false,
      pendingChangesCount: 0,
      refreshFromServer: async () => console.warn('[useEstimateSession] Cannot refresh - invalid estimate ID')
    };
  }
  // DAL hooks for data access
  const estimateQuery = useHybridEstimateData(claimId, {
    prefetchLines: true, // Auto-prefetch lines when estimate loads
    enabled: !!claimId,
  });
  
  const linesQuery = useHybridEstimateLines(estimateId, {
    enabled: !!estimateId,
  });
  
  // DAL prefetching and session management
  const { 
    prefetchForEstimateTab,
    markSessionActive,
    markSessionInactive,
  } = useEstimatePrefetching();
  
  // Background sync engine
  const { 
    forceSyncNow,
    syncMetrics,
    isOnline 
  } = useEstimateBackgroundSync();

  // Session backup functionality - integrated directly
  const createBackup = useCallback(() => {
    try {
      const sessionState = useEstimateSessionStore.getState();
      if (sessionState.currentEstimateId === estimateId) {
        const backupData = {
          estimateId,
          displayLines: Array.from(sessionState.displayLines.entries()),
          pendingChanges: Array.from(sessionState.pendingChanges),
          syncQueue: Array.from(sessionState.syncQueue.entries()),
          timestamp: Date.now(),
          version: '1.0'
        };

        localStorage.setItem(`estimate-session-backup-${estimateId}`, JSON.stringify(backupData));
        console.log('[useEstimateSession] Session backup created');
        return true;
      }
    } catch (error) {
      console.error('[useEstimateSession] Failed to create backup:', error);
    }
    return false;
  }, [estimateId]);

  const clearBackup = useCallback(() => {
    try {
      localStorage.removeItem(`estimate-session-backup-${estimateId}`);
      console.log('[useEstimateSession] Session backup cleared');
    } catch (error) {
      console.error('[useEstimateSession] Failed to clear backup:', error);
    }
  }, [estimateId]);

  // Session store integration
  const {
    currentEstimateId,
    displayLines: storeDisplayLines,
    pendingChanges,
    syncStatus,
    lastActivityTime,
    initializeLines,
    updateLine,
    addOptimisticLine,
    replaceOptimisticLine,
    removeLine,
    getDisplayLines,
    hasUnsavedChanges,
    markAsSynced,
    trackActivity,
    setSyncStatus
  } = useEstimateSessionStore();

  // Memoize display lines to prevent unnecessary re-renders
  // Only recreate when the underlying store data actually changes
  const displayLines = useMemo(() => {
    return getDisplayLines();
  }, [storeDisplayLines, currentEstimateId, lastActivityTime]);
  
  // Compute hasUnsavedChanges outside of memo dependency to prevent function call in deps
  const hasChanges = hasUnsavedChanges();

  // Get server lines from DAL or fallback to provided ones
  const dalServerLines = linesQuery.data || serverLines || [];

  // Initialize DAL prefetching when session starts
  useEffect(() => {
    if (claimId && estimateId) {
      console.log('[useEstimateSession] Initializing DAL prefetching for estimate session');
      
      // Mark session as active for enhanced caching
      markSessionActive(estimateId);
      
      // Prefetch data for estimate tab if not already fresh
      prefetchForEstimateTab(claimId, { priority: true });
    }
    
    return () => {
      // Clean up session when hook unmounts
      if (estimateId) {
        markSessionInactive(estimateId);
      }
    };
  }, [claimId, estimateId, markSessionActive, markSessionInactive, prefetchForEstimateTab]); // Fixed dependencies

  // Initialize session store when DAL data becomes available (with navigation persistence and race condition handling)
  useEffect(() => {
    const hasServerData = dalServerLines.length > 0;
    const hasNoSession = currentEstimateId !== estimateId;
    const hasEmptySession = currentEstimateId === estimateId && displayLines.length === 0;
    const isLoading = linesQuery.isLoading || estimateQuery.isLoading;

    // Wait for cache to finish loading before initializing
    if (hasServerData && !isLoading && (hasNoSession || hasEmptySession)) {
      console.log('[useEstimateSession] Cache ready, initializing session with DAL data for estimate:', estimateId);
      initializeLines(estimateId, dalServerLines);
      // Create initial backup
      createBackup();
    } else if (hasServerData && currentEstimateId === estimateId && displayLines.length > 0) {
      console.log('[useEstimateSession] Session already active for estimate, preserving state:', estimateId);
      // Merge any new server data that might have been updated while session was active
      const existingIds = new Set(displayLines.map(line => line.id));
      const newServerLines = dalServerLines.filter(line => !existingIds.has(line.id));
      if (newServerLines.length > 0) {
        console.log('[useEstimateSession] Merging new server lines into existing session:', newServerLines.length);
        const mergedLines = [...displayLines, ...newServerLines];
        initializeLines(estimateId, mergedLines);
        // Update backup with merged data
        createBackup();
      }
    } else if (!isLoading && hasServerData) {
      console.log('[useEstimateSession] Cache ready but waiting for proper conditions to initialize session');
    }
  }, [estimateId, dalServerLines.length, currentEstimateId, displayLines.length, linesQuery.isLoading, estimateQuery.isLoading, initializeLines, createBackup]); // Fixed dependencies to prevent infinite loops

  // Update field with immediate optimistic update
  const updateField = useCallback((lineId: string, field: keyof EstimateLine, value: any) => {
    if (currentEstimateId !== estimateId) {
      console.warn('[useEstimateSession] Cannot update field - session mismatch');
      return;
    }
    
    console.log(`[useEstimateSession] Updating ${String(field)} for line ${lineId}:`, value);
    
    // Create partial update object
    const updates = { [field]: value } as Partial<EstimateLine>;
    updateLine(lineId, updates);
    
    // Create backup after changes
    setTimeout(() => {
      createBackup();
    }, 100); // Small delay to allow state updates
  }, [currentEstimateId, estimateId, updateLine, getDisplayLines, createBackup, hasUnsavedChanges]);

  // Simplified: Direct DAL sync with minimal wrapper
  const syncNow = useCallback(async () => {
    if (!hasUnsavedChanges()) {
      console.log('[useEstimateSession] No changes to sync');
      return;
    }

    console.log('[useEstimateSession] Triggering DAL background sync');
    await forceSyncNow();
    
    // Clear backup after successful sync
    if (!hasUnsavedChanges()) {
      clearBackup();
    }
    
    onSyncSuccess?.();
  }, [hasUnsavedChanges, forceSyncNow, clearBackup, onSyncSuccess]);

  // Status helpers
  const isLineModified = useCallback((lineId: string): boolean => {
    return pendingChanges.has(lineId);
  }, [pendingChanges]);

  const pendingChangesCount = pendingChanges.size;

  // Simplified: Direct DAL refresh
  const refreshFromServer = useCallback(async () => {
    console.log('[useEstimateSession] Refreshing data from server via DAL');
    await Promise.all([estimateQuery.refetch(), linesQuery.refetch()]);
  }, [estimateQuery.refetch, linesQuery.refetch]);

  // Memoize the return object to prevent recreating it on every render
  const returnValue = useMemo(() => ({
    // Data from DAL
    estimate: estimateQuery.data,
    displayLines,
    hasUnsavedChanges: hasChanges, // Use computed value instead of function call
    syncStatus,
    lastActivityTime,
    
    // Loading states from DAL
    isLoading: estimateQuery.isLoading,
    isLinesLoading: linesQuery.isLoading,
    
    // Actions
    updateField,
    addOptimisticLine,
    replaceOptimisticLine,
    removeLine,
    syncNow,
    trackActivity,
    
    // Status helpers
    isLineModified,
    pendingChangesCount,
    
    // DAL integration
    refreshFromServer
  }), [
    estimateQuery.data,
    displayLines, // Now properly memoized, will only change when data actually changes
    hasChanges, // Use computed boolean instead of function call
    syncStatus,
    lastActivityTime,
    estimateQuery.isLoading,
    linesQuery.isLoading,
    updateField,
    addOptimisticLine,
    replaceOptimisticLine,
    removeLine,
    syncNow,
    trackActivity,
    isLineModified,
    pendingChangesCount,
    refreshFromServer
  ]);
  
  return returnValue;
}

// Simplified sync status utility
export function useEstimateSyncStatus(estimateId: string) {
  const { currentEstimateId, syncStatus, hasUnsavedChanges } = useEstimateSessionStore();
  const { isOnline } = useEstimateBackgroundSync();
  
  return currentEstimateId === estimateId 
    ? { syncStatus, hasUnsavedChanges: hasUnsavedChanges(), isOnline }
    : { syncStatus: 'idle' as const, hasUnsavedChanges: false, isOnline: true };
}