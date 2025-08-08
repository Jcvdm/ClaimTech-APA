'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEstimateSessionStore } from '@/stores/estimateSessionStore';
import { useUpdateEstimateLine } from '@/lib/api/domains/estimates/hooks';
import { type EstimateLineUpdate } from '@/lib/api/domains/estimates/types';
import { toast } from 'sonner';
import { useEnhancedErrorHandling } from './useEnhancedErrorHandling';

// UUID and temp ID validation helpers
const isValidUUID = (id: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const isTempId = (id: string): boolean => {
  return id.startsWith('temp-');
};

// Configuration for background sync
const SYNC_CONFIG = {
  // Activity-based timing
  ACTIVITY_TIMEOUT: 2500,           // 2.5 seconds after user stops editing
  MAX_BATCH_SIZE: 5,               // Maximum lines to sync in one batch
  RETRY_DELAYS: [1000, 3000, 5000], // Progressive retry delays
  MAX_RETRY_ATTEMPTS: 3,           // Maximum retry attempts per line
  
  // Network conditions
  OFFLINE_RETRY_INTERVAL: 30000,   // 30 seconds between offline retry attempts
  SYNC_TIMEOUT: 10000,             // 10 seconds timeout per sync operation
  
  // Queue management
  QUEUE_CLEANUP_INTERVAL: 60000,   // Clean up old queue items every minute
  MAX_QUEUE_AGE: 300000,           // Remove items older than 5 minutes
};

interface SyncResult {
  success: boolean;
  lineId: string;
  error?: Error;
  retryable: boolean;
}

interface SyncMetrics {
  totalSynced: number;
  totalFailed: number;
  averageSyncTime: number;
  lastSyncAttempt: number;
}

/**
 * Smart background sync engine for estimate lines
 * Handles activity-based syncing, batching, retries, and error recovery
 */
export function useEstimateBackgroundSync() {
  const queryClient = useQueryClient();
  const updateLineMutation = useUpdateEstimateLine();
  const { executeWithRetry, handleError, getErrorStats } = useEnhancedErrorHandling();
  
  // Session store integration
  const {
    getSyncQueue,
    dequeueFromSync,
    markAsSynced,
    setSyncStatus,
    trackActivity,
    lastActivityTime,
    isOnline,
    setOnlineStatus,
    canSync,
    retryScheduled,
    scheduleRetry,
    clearRetrySchedule,
    updateLastSyncTime
  } = useEstimateSessionStore();

  // Local sync state
  const [syncMetrics, setSyncMetrics] = useState<SyncMetrics>({
    totalSynced: 0,
    totalFailed: 0,
    averageSyncTime: 0,
    lastSyncAttempt: 0
  });

  const [currentlySyncing, setCurrentlySyncing] = useState<Set<string>>(new Set());
  
  // Refs for managing timers and state
  const activityTimeoutRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const cleanupIntervalRef = useRef<number | null>(null);
  const onlineCheckIntervalRef = useRef<number | null>(null);
  const syncInProgressRef = useRef<boolean>(false);

  /**
   * Check if an error is retryable
   */
  const isRetryableError = useCallback((error: any, lineId?: string): boolean => {
    if (!error) return false;
    
    // Never retry temp IDs - they need to be replaced with real IDs first
    if (lineId && isTempId(lineId)) {
      console.log(`[BackgroundSync] Skipping retry for temp ID: ${lineId}`);
      return false;
    }
    
    // UUID validation errors for temp IDs are not retryable
    const message = error.message?.toLowerCase() || '';
    if (message.includes('invalid uuid') && lineId && isTempId(lineId)) {
      console.log(`[BackgroundSync] UUID validation error for temp ID ${lineId} - not retryable`);
      return false;
    }
    
    const status = error.status || error.code;
    
    // Network errors are retryable
    if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
      return true;
    }
    
    // Server errors (5xx) are retryable
    if (status >= 500 && status < 600) {
      return true;
    }
    
    // Rate limiting is retryable
    if (status === 429) {
      return true;
    }
    
    // Client errors (4xx) except 404 are generally not retryable
    if (status >= 400 && status < 500 && status !== 404) {
      return false;
    }
    
    // Default to retryable for unknown errors
    return true;
  }, []);

  /**
   * Sync a single line to the server with enhanced error handling
   */
  const syncLine = useCallback(async (
    lineId: string, 
    updates: Partial<EstimateLineUpdate>
  ): Promise<SyncResult> => {
    const operationKey = `sync_line_${lineId}`;
    
    try {
      console.log(`[BackgroundSync] Syncing line ${lineId}:`, updates);
      
      const result = await executeWithRetry(
        async () => {
          // Mark the update as auto-save to prevent success toasts
          const updatePayload: EstimateLineUpdate = {
            id: lineId,
            ...updates,
            _isAutoSave: true
          } as EstimateLineUpdate & { _isAutoSave: boolean };

          // Perform the sync operation with timeout
          const syncPromise = updateLineMutation.mutateAsync(updatePayload);
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Sync timeout')), SYNC_CONFIG.SYNC_TIMEOUT);
          });

          return await Promise.race([syncPromise, timeoutPromise]);
        },
        operationKey,
        {
          maxAttempts: SYNC_CONFIG.MAX_RETRY_ATTEMPTS,
          baseDelay: SYNC_CONFIG.RETRY_DELAYS[0],
          maxDelay: SYNC_CONFIG.RETRY_DELAYS[SYNC_CONFIG.RETRY_DELAYS.length - 1],
          backoffMultiplier: 1.5,
          jitter: true
        },
        {
          lineId,
          operation: 'background_sync',
          updates: Object.keys(updates)
        }
      );

      console.log(`[BackgroundSync] Line ${lineId} synced successfully`);

      return {
        success: true,
        lineId,
        retryable: false
      };
    } catch (enhancedError: any) {
      console.error(`[BackgroundSync] Failed to sync line ${lineId}:`, enhancedError);
      
      // Handle the error with appropriate user notification (if not silent)
      handleError(enhancedError.originalError || enhancedError, {
        operation: 'background_sync',
        lineId,
        silent: enhancedError.type === 'network' // Don't show network errors for background sync
      });
      
      return {
        success: false,
        lineId,
        error: enhancedError.originalError || enhancedError,
        retryable: enhancedError.isRetryable
      };
    }
  }, [updateLineMutation, executeWithRetry, handleError]);

  /**
   * Sync a batch of lines
   */
  const syncBatch = useCallback(async (queueItems: any[]): Promise<SyncResult[]> => {
    if (queueItems.length === 0) return [];

    console.log(`[BackgroundSync] Syncing batch of ${queueItems.length} lines`);
    setCurrentlySyncing(new Set(queueItems.map(item => item.lineId)));

    try {
      // Process items in parallel but with controlled concurrency
      const results = await Promise.allSettled(
        queueItems.map(item => syncLine(item.lineId, item.updates))
      );

      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          const lineId = queueItems[index].lineId;
          return {
            success: false,
            lineId,
            error: result.reason,
            retryable: isRetryableError(result.reason, lineId)
          };
        }
      });
    } finally {
      setCurrentlySyncing(new Set());
    }
  }, [syncLine, isRetryableError]);

  /**
   * Process the sync queue
   */
  const processSyncQueue = useCallback(async () => {
    if (syncInProgressRef.current || !canSync()) {
      return;
    }

    syncInProgressRef.current = true;
    setSyncStatus('syncing');
    updateLastSyncTime();

    try {
      const queue = getSyncQueue();
      if (queue.length === 0) {
        setSyncStatus('idle');
        return;
      }

      // Filter out temp IDs from sync queue - they should not be synced to backend
      const validQueue = queue.filter(item => {
        const { lineId } = item;
        const isValid = !isTempId(lineId) && isValidUUID(lineId);
        
        if (!isValid) {
          console.log(`[BackgroundSync] Skipping sync for invalid line ID: ${lineId} (tempId: ${isTempId(lineId)}, validUUID: ${isValidUUID(lineId)})`);
          // Remove invalid IDs from queue to prevent accumulation
          dequeueFromSync(lineId);
        }
        
        return isValid;
      });

      if (validQueue.length === 0) {
        console.log(`[BackgroundSync] No valid lines to sync (filtered ${queue.length} items)`);
        setSyncStatus('idle');
        return;
      }

      console.log(`[BackgroundSync] Processing sync queue with ${validQueue.length} valid items (filtered out ${queue.length - validQueue.length} temp/invalid IDs)`);

      // Group items by batch size
      const batches: any[][] = [];
      for (let i = 0; i < validQueue.length; i += SYNC_CONFIG.MAX_BATCH_SIZE) {
        batches.push(validQueue.slice(i, i + SYNC_CONFIG.MAX_BATCH_SIZE));
      }

      let totalSynced = 0;
      let totalFailed = 0;
      const syncTimes: number[] = [];

      // Process batches sequentially to avoid overwhelming the server
      for (const batch of batches) {
        const batchStartTime = Date.now();
        const results = await syncBatch(batch);
        const batchSyncTime = Date.now() - batchStartTime;

        // Process results
        const successfulSyncs: string[] = [];
        const failedSyncs: { lineId: string; retryCount: number; retryable: boolean }[] = [];

        results.forEach(result => {
          if (result.success) {
            successfulSyncs.push(result.lineId);
            totalSynced++;
            syncTimes.push(batchSyncTime / results.length);
          } else {
            const queueItem = batch.find(item => item.lineId === result.lineId);
            failedSyncs.push({
              lineId: result.lineId,
              retryCount: queueItem?.retryCount || 0,
              retryable: result.retryable
            });
            totalFailed++;
          }
        });

        // Mark successful syncs
        if (successfulSyncs.length > 0) {
          markAsSynced(successfulSyncs);
          console.log(`[BackgroundSync] Marked ${successfulSyncs.length} lines as synced`);
        }

        // Handle failed syncs
        failedSyncs.forEach(({ lineId, retryCount, retryable }) => {
          if (retryable && retryCount < SYNC_CONFIG.MAX_RETRY_ATTEMPTS) {
            // Schedule retry with exponential backoff
            const retryDelay = SYNC_CONFIG.RETRY_DELAYS[Math.min(retryCount, SYNC_CONFIG.RETRY_DELAYS.length - 1)];
            setTimeout(() => {
              console.log(`[BackgroundSync] Retrying sync for line ${lineId} (attempt ${retryCount + 1})`);
              // The line will be retried in the next sync cycle
            }, retryDelay);
          } else {
            // Max retries reached or not retryable - remove from queue
            dequeueFromSync(lineId);
            console.error(`[BackgroundSync] Giving up on syncing line ${lineId} after ${retryCount} retries`);
          }
        });
      }

      // Update metrics
      setSyncMetrics(prev => ({
        totalSynced: prev.totalSynced + totalSynced,
        totalFailed: prev.totalFailed + totalFailed,
        averageSyncTime: syncTimes.length > 0 
          ? (prev.averageSyncTime + syncTimes.reduce((a, b) => a + b, 0) / syncTimes.length) / 2
          : prev.averageSyncTime,
        lastSyncAttempt: Date.now()
      }));

      setSyncStatus(totalFailed > 0 ? 'error' : 'idle');
      
      if (totalFailed > 0) {
        console.warn(`[BackgroundSync] Sync completed with ${totalFailed} failures out of ${queue.length} items`);
      } else {
        console.log(`[BackgroundSync] Sync completed successfully for all ${totalSynced} items`);
      }

    } catch (error) {
      console.error('[BackgroundSync] Error processing sync queue:', error);
      setSyncStatus('error');
      
      // Schedule retry for the entire queue
      if (!retryScheduled) {
        scheduleRetry();
        setTimeout(() => {
          clearRetrySchedule();
          processSyncQueue();
        }, SYNC_CONFIG.OFFLINE_RETRY_INTERVAL);
      }
    } finally {
      syncInProgressRef.current = false;
    }
  }, [
    canSync, getSyncQueue, syncBatch, markAsSynced, dequeueFromSync, 
    setSyncStatus, updateLastSyncTime, retryScheduled, scheduleRetry, clearRetrySchedule
  ]);

  /**
   * Schedule sync based on activity timeout
   */
  const scheduleActivitySync = useCallback(() => {
    // Clear existing timeout
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }

    // Only schedule if we're online and have items to sync
    if (!isOnline || !canSync()) {
      return;
    }

    activityTimeoutRef.current = setTimeout(() => {
      console.log('[BackgroundSync] Activity timeout reached, starting sync');
      processSyncQueue();
    }, SYNC_CONFIG.ACTIVITY_TIMEOUT) as unknown as number;
  }, [isOnline, canSync, processSyncQueue]);

  /**
   * Force sync immediately (for user-triggered actions)
   */
  const forceSyncNow = useCallback(async () => {
    console.log('[BackgroundSync] Force sync requested');
    
    // Clear activity timeout since we're syncing now
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
      activityTimeoutRef.current = null;
    }

    await processSyncQueue();
  }, [processSyncQueue]);

  /**
   * Clean up old queue items
   */
  const cleanupQueue = useCallback(() => {
    const queue = getSyncQueue();
    const now = Date.now();
    
    queue.forEach(item => {
      if (now - item.timestamp > SYNC_CONFIG.MAX_QUEUE_AGE) {
        console.warn(`[BackgroundSync] Removing stale queue item for line ${item.lineId}`);
        dequeueFromSync(item.lineId);
      }
    });
  }, [getSyncQueue, dequeueFromSync]);

  /**
   * Monitor online status
   */
  const checkOnlineStatus = useCallback(() => {
    const newOnlineStatus = navigator.onLine;
    if (newOnlineStatus !== isOnline) {
      setOnlineStatus(newOnlineStatus);
      
      if (newOnlineStatus) {
        console.log('[BackgroundSync] Back online, processing pending syncs');
        // Small delay to let the network stabilize
        setTimeout(processSyncQueue, 1000);
      } else {
        console.log('[BackgroundSync] Went offline, pausing sync operations');
      }
    }
  }, [isOnline, setOnlineStatus, processSyncQueue]);

  // Watch for activity changes and schedule syncs
  useEffect(() => {
    scheduleActivitySync();
  }, [lastActivityTime, scheduleActivitySync]);

  // Set up periodic cleanup and online status monitoring
  useEffect(() => {
    // Set up cleanup interval
    cleanupIntervalRef.current = setInterval(cleanupQueue, SYNC_CONFIG.QUEUE_CLEANUP_INTERVAL) as unknown as number;
    
    // Set up online status monitoring
    onlineCheckIntervalRef.current = setInterval(checkOnlineStatus, 5000) as unknown as number;
    
    // Listen for online/offline events
    const handleOnline = () => {
      setOnlineStatus(true);
      processSyncQueue();
    };
    
    const handleOffline = () => {
      setOnlineStatus(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
      if (onlineCheckIntervalRef.current) {
        clearInterval(onlineCheckIntervalRef.current);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [cleanupQueue, checkOnlineStatus, setOnlineStatus, processSyncQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Sync control
    forceSyncNow,
    processSyncQueue,
    
    // Status information
    syncMetrics,
    currentlySyncing,
    isOnline,
    
    // Queue information
    getSyncQueue,
    
    // Enhanced error handling
    errorStats: getErrorStats(),
    
    // For debugging/monitoring
    canSync,
  };
}