'use client';

import { useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

interface DataSnapshot<T> {
  data: T;
  timestamp: number;
  version?: string | number;
  checksum?: string;
}

interface IntegrityCheck<T> {
  id: string;
  data: T;
  expectedChecksum?: string;
  lastKnownGood?: DataSnapshot<T>;
}

interface DataIntegrityOptions {
  enableChecksums?: boolean;
  conflictResolution?: 'server-wins' | 'client-wins' | 'prompt-user';
  maxSnapshotHistory?: number;
  onCorruptionDetected?: (corruptedData: any, lastKnownGood: any) => void;
  onConflictDetected?: (serverData: any, clientData: any) => void;
}

/**
 * Hook for maintaining data integrity during concurrent operations and failures
 */
export function useDataIntegrity<T extends { id: string; updated_at?: Date | string }>(
  options: DataIntegrityOptions = {}
) {
  const {
    enableChecksums = true,
    conflictResolution = 'server-wins',
    maxSnapshotHistory = 10,
    onCorruptionDetected,
    onConflictDetected
  } = options;

  // Store snapshots of data for integrity checking
  const snapshots = useRef<Map<string, DataSnapshot<T>[]>>(new Map());
  
  // Track pending operations to detect conflicts
  const pendingOperations = useRef<Map<string, { operation: string; timestamp: number }>>(new Map());
  
  // Simple checksum calculation for data integrity
  const calculateChecksum = useCallback((data: T): string => {
    if (!enableChecksums) return '';
    
    try {
      // Create a deterministic string representation of the data
      const normalized = JSON.stringify(data, Object.keys(data).sort());
      
      // Simple hash function (good enough for integrity checking)
      let hash = 0;
      for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      
      return hash.toString(36);
    } catch (error) {
      console.warn('[useDataIntegrity] Error calculating checksum:', error);
      return '';
    }
  }, [enableChecksums]);

  // Create a snapshot of data
  const createSnapshot = useCallback((data: T): DataSnapshot<T> => {
    return {
      data: { ...data },
      timestamp: Date.now(),
      version: data.updated_at ? new Date(data.updated_at).getTime().toString() : undefined,
      checksum: calculateChecksum(data)
    };
  }, [calculateChecksum]);

  // Store a snapshot for integrity checking
  const storeSnapshot = useCallback((id: string, data: T) => {
    const snapshot = createSnapshot(data);
    const existing = snapshots.current.get(id) || [];
    
    // Add new snapshot and keep only the most recent ones
    const updated = [snapshot, ...existing].slice(0, maxSnapshotHistory);
    snapshots.current.set(id, updated);
    
    console.log(`[useDataIntegrity] Stored snapshot for ${id}, total snapshots: ${updated.length}`);
  }, [createSnapshot, maxSnapshotHistory]);

  // Get the latest snapshot for an item
  const getLatestSnapshot = useCallback((id: string): DataSnapshot<T> | undefined => {
    const itemSnapshots = snapshots.current.get(id);
    return itemSnapshots?.[0];
  }, []);

  // Check data integrity against stored snapshot
  const checkIntegrity = useCallback((id: string, currentData: T): {
    isCorrupted: boolean;
    hasConflict: boolean;
    corruptionDetails?: string;
    conflictDetails?: string;
    lastKnownGood?: DataSnapshot<T>;
  } => {
    const latestSnapshot = getLatestSnapshot(id);
    
    if (!latestSnapshot) {
      // No snapshot to compare against
      return { isCorrupted: false, hasConflict: false };
    }

    const currentChecksum = calculateChecksum(currentData);
    const expectedChecksum = latestSnapshot.checksum;
    
    // Check for data corruption
    const isCorrupted = enableChecksums && expectedChecksum && 
                       currentChecksum !== expectedChecksum &&
                       JSON.stringify(currentData) !== JSON.stringify(latestSnapshot.data);

    // Check for version conflicts
    const currentVersion = currentData.updated_at ? new Date(currentData.updated_at).getTime() : 0;
    const snapshotVersion = latestSnapshot.version ? parseInt(latestSnapshot.version) : 0;
    const hasConflict = currentVersion > snapshotVersion + 1000; // Allow 1 second tolerance

    let corruptionDetails = '';
    let conflictDetails = '';

    if (isCorrupted) {
      corruptionDetails = `Data checksum mismatch. Expected: ${expectedChecksum}, Got: ${currentChecksum}`;
    }

    if (hasConflict) {
      conflictDetails = `Version conflict. Server version: ${currentVersion}, Local version: ${snapshotVersion}`;
    }

    return {
      isCorrupted,
      hasConflict,
      corruptionDetails: corruptionDetails || undefined,
      conflictDetails: conflictDetails || undefined,
      lastKnownGood: latestSnapshot
    };
  }, [getLatestSnapshot, calculateChecksum, enableChecksums]);

  // Validate data before operations
  const validateData = useCallback((id: string, data: T): {
    isValid: boolean;
    issues: string[];
    canProceed: boolean;
  } => {
    const issues: string[] = [];
    
    // Basic validation
    if (!id || !data) {
      issues.push('Missing required data or ID');
    }

    // Check data structure
    if (data && typeof data !== 'object') {
      issues.push('Data must be an object');
    }

    // Check for required fields
    if (data && !data.id) {
      issues.push('Data must have an ID field');
    }

    // Check integrity
    const integrityCheck = checkIntegrity(id, data);
    
    if (integrityCheck.isCorrupted) {
      issues.push(`Data corruption detected: ${integrityCheck.corruptionDetails}`);
    }

    if (integrityCheck.hasConflict) {
      issues.push(`Version conflict detected: ${integrityCheck.conflictDetails}`);
    }

    const isValid = issues.length === 0;
    const canProceed = isValid || (!integrityCheck.isCorrupted && conflictResolution !== 'prompt-user');

    return { isValid, issues, canProceed };
  }, [checkIntegrity, conflictResolution]);

  // Handle detected conflicts
  const handleConflict = useCallback(async (
    id: string, 
    serverData: T, 
    clientData: T
  ): Promise<{ resolvedData: T; resolution: 'server' | 'client' | 'merged' | 'cancelled' }> => {
    console.warn(`[useDataIntegrity] Conflict detected for ${id}:`, { serverData, clientData });
    
    // Call conflict callback if provided
    onConflictDetected?.(serverData, clientData);

    switch (conflictResolution) {
      case 'server-wins':
        toast.info('Data conflict resolved', {
          description: 'Server version was used to resolve the conflict.',
        });
        return { resolvedData: serverData, resolution: 'server' };

      case 'client-wins':
        toast.info('Data conflict resolved', {
          description: 'Your local changes were preserved.',
        });
        return { resolvedData: clientData, resolution: 'client' };

      case 'prompt-user':
        // In a real implementation, you might show a modal here
        // For now, we'll default to server-wins with user notification
        const userChoice = await new Promise<'server' | 'client'>((resolve) => {
          toast.error('Data conflict detected', {
            description: 'Another user may have modified this data. Choose how to resolve:',
            action: {
              label: 'Use Server Version',
              onClick: () => resolve('server')
            },
            cancel: {
              label: 'Keep My Changes',
              onClick: () => resolve('client')
            },
            duration: 0, // Don't auto-dismiss
          });
          
          // Default to server after 30 seconds
          setTimeout(() => resolve('server'), 30000);
        });

        return { 
          resolvedData: userChoice === 'server' ? serverData : clientData,
          resolution: userChoice
        };

      default:
        return { resolvedData: serverData, resolution: 'server' };
    }
  }, [conflictResolution, onConflictDetected]);

  // Handle detected corruption
  const handleCorruption = useCallback((id: string, corruptedData: T, lastKnownGood?: DataSnapshot<T>) => {
    console.error(`[useDataIntegrity] Data corruption detected for ${id}:`, corruptedData);
    
    // Call corruption callback if provided
    onCorruptionDetected?.(corruptedData, lastKnownGood?.data);

    if (lastKnownGood) {
      toast.error('Data corruption detected', {
        description: 'The data has been restored to the last known good state.',
        action: {
          label: 'View Details',
          onClick: () => {
            console.log('Corrupted data:', corruptedData);
            console.log('Last known good:', lastKnownGood.data);
          }
        }
      });
      return lastKnownGood.data;
    } else {
      toast.error('Data corruption detected', {
        description: 'No backup available. Please refresh the page.',
      });
      return corruptedData; // Return as-is if no backup
    }
  }, [onCorruptionDetected]);

  // Mark operation as pending
  const markPendingOperation = useCallback((id: string, operation: string) => {
    pendingOperations.current.set(id, {
      operation,
      timestamp: Date.now()
    });
  }, []);

  // Clear pending operation
  const clearPendingOperation = useCallback((id: string) => {
    pendingOperations.current.delete(id);
  }, []);

  // Check if operation is pending
  const hasPendingOperation = useCallback((id: string): boolean => {
    return pendingOperations.current.has(id);
  }, []);

  // Clean up old snapshots and operations
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      const maxAge = 10 * 60 * 1000; // 10 minutes

      // Clean up old pending operations
      for (const [id, operation] of pendingOperations.current.entries()) {
        if (now - operation.timestamp > maxAge) {
          pendingOperations.current.delete(id);
        }
      }

      // Clean up old snapshots
      for (const [id, itemSnapshots] of snapshots.current.entries()) {
        const recentSnapshots = itemSnapshots.filter(snapshot => 
          now - snapshot.timestamp < maxAge
        );
        
        if (recentSnapshots.length === 0) {
          snapshots.current.delete(id);
        } else if (recentSnapshots.length < itemSnapshots.length) {
          snapshots.current.set(id, recentSnapshots);
        }
      }
    };

    const interval = setInterval(cleanup, 5 * 60 * 1000); // Clean up every 5 minutes
    return () => clearInterval(interval);
  }, []);

  return {
    storeSnapshot,
    checkIntegrity,
    validateData,
    handleConflict,
    handleCorruption,
    markPendingOperation,
    clearPendingOperation,
    hasPendingOperation,
    getLatestSnapshot,
    
    // Utility functions
    createSnapshot,
    calculateChecksum,
  };
}