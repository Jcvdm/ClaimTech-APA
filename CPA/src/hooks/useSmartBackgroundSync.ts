'use client';

import { useEffect, useCallback } from 'react';
import { useEstimateSessionStore } from '@/stores/estimateSessionStore';
import { api } from '@/trpc/react';
import { toast } from 'sonner';

interface UseSmartBackgroundSyncOptions {
  estimateId: string;
  inactivityThreshold?: number; // milliseconds
  checkInterval?: number; // milliseconds
  enabled?: boolean;
  onSyncSuccess?: () => void;
  onSyncError?: (error: Error) => void;
}

export function useSmartBackgroundSync({
  estimateId,
  inactivityThreshold = 3000, // 3 seconds
  checkInterval = 2000, // 2 seconds
  enabled = true,
  onSyncSuccess,
  onSyncError
}: UseSmartBackgroundSyncOptions) {
  const {
    currentEstimateId,
    pendingChanges,
    syncStatus,
    lastActivityTime,
    hasUnsavedChanges,
    getDisplayLines,
    markAsSynced,
    setSyncStatus
  } = useEstimateSessionStore();

  // Get the bulk update mutation
  const bulkUpdateMutation = api.estimate.bulkUpdateLines.useMutation();

  // Sync function
  const performBackgroundSync = useCallback(async () => {
    if (!enabled || currentEstimateId !== estimateId) return;
    if (!hasUnsavedChanges() || syncStatus !== 'idle') return;

    const timeSinceLastActivity = Date.now() - lastActivityTime;
    if (timeSinceLastActivity < inactivityThreshold) return;

    const linesToSync = Array.from(pendingChanges);
    if (linesToSync.length === 0) return;

    console.log(`[BackgroundSync] Syncing ${linesToSync.length} lines after ${timeSinceLastActivity}ms inactivity`);
    
    setSyncStatus('syncing');

    try {
      const displayLines = getDisplayLines();
      const displayLinesMap = new Map(displayLines.map(line => [line.id, line]));

      // Prepare updates for each pending line
      const updates = linesToSync.map(lineId => {
        const line = displayLinesMap.get(lineId);
        if (!line) {
          console.warn(`[BackgroundSync] Line ${lineId} not found in display lines`);
          return null;
        }

        // Return the full line data for bulk update
        return {
          id: lineId,
          estimate_id: estimateId,
          sequence_number: line.sequence_number,
          description: line.description,
          operation_code: line.operation_code,
          part_type: line.part_type,
          part_number: line.part_number,
          part_cost: line.part_cost,
          quantity: line.quantity,
          strip_fit_hours: line.strip_fit_hours,
          repair_hours: line.repair_hours,
          paint_hours: line.paint_hours,
          sublet_cost: line.sublet_cost,
          is_included: line.is_included,
          line_notes: line.line_notes
        };
      }).filter((update): update is NonNullable<typeof update> => update !== null);

      if (updates.length === 0) {
        setSyncStatus('idle');
        return;
      }

      const result = await bulkUpdateMutation.mutateAsync({
        estimate_id: estimateId,
        updates
      });

      if (result.success) {
        // Mark all synced lines as no longer pending
        markAsSynced(linesToSync);
        setSyncStatus('idle');
        onSyncSuccess?.();
        
        console.log(`[BackgroundSync] Successfully synced ${linesToSync.length} changes`);
        
        // Only show toast for significant batches (3+ changes)
        if (linesToSync.length >= 3) {
          toast.success(`Auto-saved ${linesToSync.length} changes`, {
            duration: 2000
          });
        }
      } else {
        setSyncStatus('error');
        throw new Error('Background sync failed');
      }
    } catch (error) {
      console.error('[BackgroundSync] Sync error:', error);
      setSyncStatus('error');
      onSyncError?.(error as Error);
      
      // Silent failure for background sync - don't show intrusive error toasts
      console.warn(`[BackgroundSync] Failed to sync ${linesToSync.length} changes - will retry on next activity`);
    }
  }, [
    enabled,
    currentEstimateId,
    estimateId,
    hasUnsavedChanges,
    syncStatus,
    lastActivityTime,
    inactivityThreshold,
    pendingChanges,
    getDisplayLines,
    markAsSynced,
    setSyncStatus,
    bulkUpdateMutation,
    onSyncSuccess,
    onSyncError
  ]);

  // Background sync timer
  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      performBackgroundSync().catch((error) => {
        console.error('[BackgroundSync] Timer sync failed:', error);
      });
    }, checkInterval);

    return () => clearInterval(timer);
  }, [performBackgroundSync, checkInterval, enabled]);

  return {
    performBackgroundSync,
    isBackgroundSyncActive: syncStatus === 'syncing',
    hasUnsavedChanges: hasUnsavedChanges(),
    pendingChangesCount: pendingChanges.size
  };
}