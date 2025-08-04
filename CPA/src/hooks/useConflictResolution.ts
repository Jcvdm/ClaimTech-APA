'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { enhancedToast } from '@/components/ui/enhanced-toast';

interface ConflictData<T> {
  id: string;
  serverVersion: T;
  clientVersion: T;
  baseVersion?: T; // The common ancestor for 3-way merge
  serverTimestamp: number;
  clientTimestamp: number;
  conflictFields: string[];
}

interface ConflictResolution<T> {
  resolution: 'server' | 'client' | 'merged' | 'cancelled';
  resolvedData: T;
  timestamp: number;
}

interface MergeResult<T> {
  success: boolean;
  mergedData?: T;
  conflictingFields: string[];
  autoResolved: string[];
}

interface ConflictResolutionOptions {
  autoResolveSimple?: boolean; // Auto-resolve non-conflicting changes
  enableThreeWayMerge?: boolean; // Use base version for better merging
  conflictTimeout?: number; // How long to wait for user resolution
  onConflictDetected?: (conflict: ConflictData<any>) => void;
  onConflictResolved?: (resolution: ConflictResolution<any>) => void;
}

/**
 * Hook for handling conflicts during concurrent editing scenarios
 */
export function useConflictResolution<T extends Record<string, any>>(
  options: ConflictResolutionOptions = {}
) {
  const {
    autoResolveSimple = true,
    enableThreeWayMerge = true,
    conflictTimeout = 30000, // 30 seconds
    onConflictDetected,
    onConflictResolved,
  } = options;

  const [activeConflicts, setActiveConflicts] = useState<Map<string, ConflictData<T>>>(new Map());
  const [isResolvingConflict, setIsResolvingConflict] = useState(false);
  const conflictTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Detect if two objects have conflicts
  const detectConflicts = useCallback((
    serverData: T,
    clientData: T,
    baseData?: T
  ): string[] => {
    const conflictFields: string[] = [];
    const allKeys = new Set([
      ...Object.keys(serverData),
      ...Object.keys(clientData),
      ...(baseData ? Object.keys(baseData) : [])
    ]);

    for (const key of allKeys) {
      const serverValue = serverData[key];
      const clientValue = clientData[key];
      const baseValue = baseData?.[key];

      // Skip if values are identical
      if (deepEqual(serverValue, clientValue)) {
        continue;
      }

      // If we have a base version, check if both sides changed
      if (enableThreeWayMerge && baseValue !== undefined) {
        const serverChanged = !deepEqual(serverValue, baseValue);
        const clientChanged = !deepEqual(clientValue, baseValue);
        
        // Only consider it a conflict if both sides changed
        if (serverChanged && clientChanged) {
          conflictFields.push(key);
        }
      } else {
        // Without base version, any difference is a potential conflict
        conflictFields.push(key);
      }
    }

    return conflictFields;
  }, [enableThreeWayMerge]);

  // Deep equality check
  const deepEqual = useCallback((a: any, b: any): boolean => {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;
    
    if (typeof a === 'object') {
      if (Array.isArray(a) !== Array.isArray(b)) return false;
      
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!deepEqual(a[key], b[key])) return false;
      }
      
      return true;
    }
    
    return false;
  }, []);

  // Attempt automatic merge of non-conflicting changes
  const attemptAutoMerge = useCallback((
    serverData: T,
    clientData: T,
    baseData?: T
  ): MergeResult<T> => {
    if (!autoResolveSimple) {
      return {
        success: false,
        conflictingFields: detectConflicts(serverData, clientData, baseData),
        autoResolved: [],
      };
    }

    const conflictingFields = detectConflicts(serverData, clientData, baseData);
    const autoResolved: string[] = [];
    const mergedData = { ...serverData }; // Start with server data

    if (enableThreeWayMerge && baseData) {
      // Three-way merge: apply non-conflicting client changes
      for (const key of Object.keys(clientData)) {
        if (!conflictingFields.includes(key)) {
          const clientValue = clientData[key];
          const baseValue = baseData[key];
          
          // If client changed this field and server didn't, use client value
          if (!deepEqual(clientValue, baseValue) && deepEqual(serverData[key], baseValue)) {
            mergedData[key] = clientValue;
            autoResolved.push(key);
          }
        }
      }
    } else {
      // Simple merge: prefer client for non-conflicting fields
      for (const key of Object.keys(clientData)) {
        if (!conflictingFields.includes(key)) {
          mergedData[key] = clientData[key];
          autoResolved.push(key);
        }
      }
    }

    return {
      success: conflictingFields.length === 0,
      mergedData,
      conflictingFields,
      autoResolved,
    };
  }, [autoResolveSimple, enableThreeWayMerge, detectConflicts, deepEqual]);

  // Check for conflicts and attempt resolution
  const checkForConflicts = useCallback(async (
    id: string,
    serverData: T,
    clientData: T,
    baseData?: T
  ): Promise<ConflictResolution<T> | null> => {
    console.log(`[useConflictResolution] Checking for conflicts for ${id}`);

    const mergeResult = attemptAutoMerge(serverData, clientData, baseData);

    // If auto-merge successful, return resolved data
    if (mergeResult.success && mergeResult.mergedData) {
      console.log(`[useConflictResolution] Auto-merged successfully for ${id}`, mergeResult.autoResolved);
      
      const resolution: ConflictResolution<T> = {
        resolution: 'merged',
        resolvedData: mergeResult.mergedData,
        timestamp: Date.now(),
      };

      onConflictResolved?.(resolution);
      return resolution;
    }

    // If there are conflicts, present them to the user
    if (mergeResult.conflictingFields.length > 0) {
      console.warn(`[useConflictResolution] Conflicts detected for ${id}:`, mergeResult.conflictingFields);

      const conflictData: ConflictData<T> = {
        id,
        serverVersion: serverData,
        clientVersion: clientData,
        baseVersion: baseData,
        serverTimestamp: Date.now(),
        clientTimestamp: Date.now(),
        conflictFields: mergeResult.conflictingFields,
      };

      // Store the conflict
      setActiveConflicts(prev => new Map(prev).set(id, conflictData));
      onConflictDetected?.(conflictData);

      // Set timeout for automatic resolution
      const timeoutId = setTimeout(() => {
        console.warn(`[useConflictResolution] Conflict resolution timeout for ${id}, defaulting to server version`);
        resolveConflict(id, 'server');
      }, conflictTimeout);
      
      conflictTimeouts.current.set(id, timeoutId);

      // Show user prompt for conflict resolution
      return await promptUserResolution(conflictData);
    }

    // No conflicts
    return null;
  }, [attemptAutoMerge, conflictTimeout, onConflictDetected, onConflictResolved]);

  // Prompt user for conflict resolution
  const promptUserResolution = useCallback(async (
    conflict: ConflictData<T>
  ): Promise<ConflictResolution<T>> => {
    return new Promise((resolve) => {
      setIsResolvingConflict(true);

      const resolveWithChoice = (choice: 'server' | 'client') => {
        const resolution: ConflictResolution<T> = {
          resolution: choice,
          resolvedData: choice === 'server' ? conflict.serverVersion : conflict.clientVersion,
          timestamp: Date.now(),
        };

        resolve(resolution);
        setIsResolvingConflict(false);
        resolveConflict(conflict.id, choice);
      };

      // Show enhanced toast with conflict resolution options
      enhancedToast.conflictResolution(
        'Data conflict detected',
        {
          onUseServer: () => resolveWithChoice('server'),
          onUseLocal: () => resolveWithChoice('client'),
          onViewDiff: () => {
            console.log('Server version:', conflict.serverVersion);
            console.log('Client version:', conflict.clientVersion);
            console.log('Conflicting fields:', conflict.conflictFields);
            
            enhancedToast.info('Conflict Details', {
              description: `Conflicting fields: ${conflict.conflictFields.join(', ')}`,
              persistent: true,
            });
          },
          serverVersion: `Server (${new Date(conflict.serverTimestamp).toLocaleTimeString()})`,
          localVersion: `Local (${new Date(conflict.clientTimestamp).toLocaleTimeString()})`,
        }
      );
    });
  }, []);

  // Resolve a specific conflict
  const resolveConflict = useCallback((
    id: string,
    resolution: 'server' | 'client' | 'merged',
    customData?: T
  ) => {
    const conflict = activeConflicts.get(id);
    if (!conflict) {
      console.warn(`[useConflictResolution] No active conflict found for ${id}`);
      return;
    }

    // Clear timeout
    const timeoutId = conflictTimeouts.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      conflictTimeouts.current.delete(id);
    }

    // Determine resolved data
    let resolvedData: T;
    switch (resolution) {
      case 'server':
        resolvedData = conflict.serverVersion;
        break;
      case 'client':
        resolvedData = conflict.clientVersion;
        break;
      case 'merged':
        resolvedData = customData || conflict.serverVersion;
        break;
      default:
        resolvedData = conflict.serverVersion;
    }

    const resolutionResult: ConflictResolution<T> = {
      resolution,
      resolvedData,
      timestamp: Date.now(),
    };

    // Remove from active conflicts
    setActiveConflicts(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });

    onConflictResolved?.(resolutionResult);
    console.log(`[useConflictResolution] Resolved conflict for ${id} with ${resolution} strategy`);
  }, [activeConflicts, onConflictResolved]);

  // Manually merge conflict with custom resolution
  const mergeConflict = useCallback((
    id: string,
    mergedData: T
  ) => {
    resolveConflict(id, 'merged', mergedData);
  }, [resolveConflict]);

  // Get conflict details for display
  const getConflictDetails = useCallback((id: string) => {
    return activeConflicts.get(id);
  }, [activeConflicts]);

  // Check if there are any active conflicts
  const hasActiveConflicts = useCallback(() => {
    return activeConflicts.size > 0;
  }, [activeConflicts]);

  // Cancel all conflicts (use server versions)
  const cancelAllConflicts = useCallback(() => {
    for (const [id] of activeConflicts) {
      resolveConflict(id, 'server');
    }
  }, [activeConflicts, resolveConflict]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      for (const [, timeoutId] of conflictTimeouts.current) {
        clearTimeout(timeoutId);
      }
      conflictTimeouts.current.clear();
    };
  }, []);

  return {
    // State
    activeConflicts: Array.from(activeConflicts.values()),
    isResolvingConflict,
    hasActiveConflicts: hasActiveConflicts(),

    // Actions
    checkForConflicts,
    resolveConflict,
    mergeConflict,
    cancelAllConflicts,

    // Utilities
    getConflictDetails,
    detectConflicts,
    attemptAutoMerge,
  };
}