'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { type EstimateLine, type EstimateLineUpdate } from '@/lib/api/domains/estimates/types';

// Deep equality utility to prevent unnecessary updates
const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return a === b;
  
  // Handle arrays
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  
  // Handle objects
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  
  return true;
};

// UUID and temp ID validation helpers  
const isValidUUID = (id: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const isTempId = (id: string): boolean => {
  return id.startsWith('temp-');
};

// DAL integration types
interface SyncQueueItem {
  lineId: string;
  updates: Partial<EstimateLine>;
  timestamp: number;
  retryCount: number;
}

interface DirtyLineState {
  originalData: EstimateLine;
  currentData: EstimateLine;
  hasChanges: boolean;
  lastModified: number;
}

// Enhanced session store state interface with DAL integration
interface EstimateSessionState {
  // Current editing session - simple and focused
  // Core session state
  currentClaimId: string | null; // NEW: Claim isolation key
  currentEstimateId: string | null;
  displayLines: Map<string, EstimateLine>; // Single source of truth for UI
  pendingChanges: Set<string>; // Track which lines have unsaved changes
  syncStatus: 'idle' | 'syncing' | 'error';
  lastActivityTime: number;
  
  // DAL-specific state
  syncQueue: Map<string, SyncQueueItem>; // Queue for background sync operations
  dirtyTracking: Map<string, DirtyLineState>; // Detailed dirty state tracking
  lastSyncTime: number;
  isOnline: boolean;
  retryScheduled: boolean;
  
  // Core actions - simplified API
  initializeLines: (claimId: string, estimateId: string, serverLines: EstimateLine[]) => void;
  updateLine: (lineId: string, updates: Partial<EstimateLine>) => void;
  addOptimisticLine: (tempId: string, line: EstimateLine) => void;
  replaceOptimisticLine: (tempId: string, realLine: EstimateLine) => void;
  removeLine: (lineId: string) => void;
  getDisplayLines: () => EstimateLine[];
  hasUnsavedChanges: () => boolean;
  markAsSynced: (lineIds: string[]) => void;
  resetSession: () => void;
  
  // DAL-specific actions
  queueForSync: (lineId: string, updates: Partial<EstimateLine>) => void;
  dequeueFromSync: (lineId: string) => void;
  getSyncQueue: () => SyncQueueItem[];
  getDirtyLines: () => string[];
  isLineDirty: (lineId: string) => boolean;
  getOriginalLineData: (lineId: string) => EstimateLine | undefined;
  markLineClean: (lineId: string) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  scheduleRetry: () => void;
  clearRetrySchedule: () => void;
  
  // Activity tracking for smart sync
  trackActivity: () => void;
  setSyncStatus: (status: 'idle' | 'syncing' | 'error') => void;
  
  // Enhanced sync management
  updateLastSyncTime: () => void;
  canSync: () => boolean;
  
  // Runtime contamination detection
  validateSession: (expectedClaimId: string, expectedEstimateId: string) => boolean;
  detectContamination: (expectedClaimId: string, expectedEstimateId: string, context?: string) => boolean;
}

export const useEstimateSessionStore = create<EstimateSessionState>()(
  devtools(
    (set, get) => ({
      // Core session state
      currentClaimId: null,
      currentEstimateId: null,
      displayLines: new Map(),
      pendingChanges: new Set(),
      syncStatus: 'idle',
      lastActivityTime: Date.now(),
      
      // DAL-specific state
      syncQueue: new Map(),
      dirtyTracking: new Map(),
      lastSyncTime: 0,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      retryScheduled: false,
      
      initializeLines: (claimId: string, estimateId: string, serverLines: EstimateLine[]) => {
        console.log('[EstimateStore] Initializing lines for claim:', claimId, 'estimate:', estimateId);
        
        // CRITICAL: Validate claim-estimate context to prevent contamination
        const currentState = get();
        if (currentState.currentClaimId && currentState.currentClaimId !== claimId) {
          console.warn('[EstimateStore] CLAIM MISMATCH - Forcing session reset', {
            oldClaimId: currentState.currentClaimId,
            newClaimId: claimId
          });
          // Force complete session reset for different claim
          get().resetSession();
        }
        
        const linesMap = new Map(serverLines.map(line => [line.id, line]));
        
        // Initialize dirty tracking with clean state
        const dirtyTracking = new Map<string, DirtyLineState>();
        serverLines.forEach(line => {
          dirtyTracking.set(line.id, {
            originalData: { ...line },
            currentData: { ...line },
            hasChanges: false,
            lastModified: Date.now()
          });
        });
        
        set({
          currentClaimId: claimId,
          currentEstimateId: estimateId,
          displayLines: linesMap,
          pendingChanges: new Set(), // Clear pending changes on new session
          syncStatus: 'idle',
          lastActivityTime: Date.now(),
          syncQueue: new Map(), // Clear sync queue on new session
          dirtyTracking,
          lastSyncTime: Date.now()
        });
      },
      
      updateLine: (lineId: string, updates: Partial<EstimateLine>) => {
        console.log(`[EstimateStore] Updating line ${lineId}:`, updates);
        
        set(state => {
          const currentLine = state.displayLines.get(lineId);
          
          if (!currentLine) {
            console.warn(`[EstimateStore] Line ${lineId} not found for update`);
            return { lastActivityTime: Date.now() };
          }
          
          // Check if any values are actually changing using deep equality
          let hasActualChanges = false;
          for (const [field, newValue] of Object.entries(updates)) {
            const currentValue = (currentLine as any)[field];
            if (!deepEqual(currentValue, newValue)) {
              hasActualChanges = true;
              break;
            }
          }
          
          if (!hasActualChanges) {
            console.log(`[EstimateStore] No actual changes detected for line ${lineId}, but updating lastActivityTime for UI responsiveness`);
            return { lastActivityTime: Date.now() };
          }
          
          const newDisplayLines = new Map(state.displayLines);
          const newDirtyTracking = new Map(state.dirtyTracking);
          const newSyncQueue = new Map(state.syncQueue);
          
          const updatedLine = { ...currentLine, ...updates };
          
          // Update the line with new values - immediate UI update
          newDisplayLines.set(lineId, updatedLine);
          
          // Update dirty tracking
          const dirtyState = newDirtyTracking.get(lineId);
          if (dirtyState) {
            const newDirtyState: DirtyLineState = {
              ...dirtyState,
              currentData: updatedLine,
              hasChanges: true,
              lastModified: Date.now()
            };
            newDirtyTracking.set(lineId, newDirtyState);
          }
          
          // Add/update in sync queue - but only for real UUIDs, not temp IDs
          if (!isTempId(lineId) && isValidUUID(lineId)) {
            const existingQueueItem = newSyncQueue.get(lineId);
            const queueItem: SyncQueueItem = {
              lineId,
              updates: existingQueueItem 
                ? { ...existingQueueItem.updates, ...updates }
                : updates,
              timestamp: Date.now(),
              retryCount: existingQueueItem?.retryCount || 0
            };
            newSyncQueue.set(lineId, queueItem);
          } else if (isTempId(lineId)) {
            console.log(`[EstimateStore] Skipping sync queue for temp ID: ${lineId}`);
          }
          
          // Mark as having pending changes
          const newPendingChanges = new Set(state.pendingChanges);
          newPendingChanges.add(lineId);
          
          return { 
            displayLines: newDisplayLines,
            dirtyTracking: newDirtyTracking,
            syncQueue: newSyncQueue,
            pendingChanges: newPendingChanges,
            lastActivityTime: Date.now()
          };
        });
      },
      
      addOptimisticLine: (tempId: string, line: EstimateLine) => {
        console.log(`[EstimateStore] Adding optimistic line ${tempId}`);
        
        set(state => {
          const newDisplayLines = new Map(state.displayLines);
          newDisplayLines.set(tempId, line);
          
          return { 
            displayLines: newDisplayLines,
            lastActivityTime: Date.now()
          };
        });
      },
      
      replaceOptimisticLine: (tempId: string, realLine: EstimateLine) => {
        console.log(`[EstimateStore] Replacing optimistic line ${tempId} with real line ${realLine.id}`);
        
        set(state => {
          const newDisplayLines = new Map(state.displayLines);
          const newPendingChanges = new Set(state.pendingChanges);
          
          // Remove temp line
          newDisplayLines.delete(tempId);
          
          // Add real line
          newDisplayLines.set(realLine.id, realLine);
          
          // Transfer pending status if temp line had changes
          if (newPendingChanges.has(tempId)) {
            newPendingChanges.delete(tempId);
            // Don't mark real line as pending since it just came from server
          }
          
          return { 
            displayLines: newDisplayLines,
            pendingChanges: newPendingChanges,
            lastActivityTime: Date.now()
          };
        });
      },
      
      removeLine: (lineId: string) => {
        console.log(`[EstimateStore] Removing line ${lineId}`);
        
        set(state => {
          const newDisplayLines = new Map(state.displayLines);
          const newPendingChanges = new Set(state.pendingChanges);
          
          newDisplayLines.delete(lineId);
          newPendingChanges.delete(lineId);
          
          return { 
            displayLines: newDisplayLines,
            pendingChanges: newPendingChanges,
            lastActivityTime: Date.now()
          };
        });
      },
      
      getDisplayLines: () => {
        const lines = Array.from(get().displayLines.values());
        return lines.sort((a, b) => a.sequence_number - b.sequence_number);
      },
      
      hasUnsavedChanges: () => {
        return get().pendingChanges.size > 0;
      },
      
      markAsSynced: (lineIds: string[]) => {
        console.log(`[EstimateStore] Marking ${lineIds.length} lines as synced`);
        
        set(state => {
          const newPendingChanges = new Set(state.pendingChanges);
          const newSyncQueue = new Map(state.syncQueue);
          const newDirtyTracking = new Map(state.dirtyTracking);
          
          lineIds.forEach(id => {
            // Remove from pending changes
            newPendingChanges.delete(id);
            
            // Remove from sync queue
            newSyncQueue.delete(id);
            
            // Update dirty tracking - mark as clean
            const dirtyState = newDirtyTracking.get(id);
            if (dirtyState) {
              const displayLine = state.displayLines.get(id);
              if (displayLine) {
                newDirtyTracking.set(id, {
                  originalData: { ...displayLine },
                  currentData: { ...displayLine },
                  hasChanges: false,
                  lastModified: Date.now()
                });
              }
            }
          });
          
          return { 
            pendingChanges: newPendingChanges,
            syncQueue: newSyncQueue,
            dirtyTracking: newDirtyTracking,
            lastSyncTime: Date.now()
          };
        });
      },
      
      resetSession: () => {
        console.log('[EstimateStore] Resetting session');
        
        set({
          currentClaimId: null,
          currentEstimateId: null,
          displayLines: new Map(),
          pendingChanges: new Set(),
          syncStatus: 'idle',
          lastActivityTime: Date.now(),
          syncQueue: new Map(),
          dirtyTracking: new Map(),
          lastSyncTime: 0,
          retryScheduled: false
        });
      },
      
      trackActivity: () => {
        set({ lastActivityTime: Date.now() });
      },
      
      setSyncStatus: (status: 'idle' | 'syncing' | 'error') => {
        set({ syncStatus: status });
      },
      
      // DAL-specific actions
      queueForSync: (lineId: string, updates: Partial<EstimateLine>) => {
        set(state => {
          const newSyncQueue = new Map(state.syncQueue);
          const existingItem = newSyncQueue.get(lineId);
          
          const queueItem: SyncQueueItem = {
            lineId,
            updates: existingItem 
              ? { ...existingItem.updates, ...updates }
              : updates,
            timestamp: Date.now(),
            retryCount: existingItem?.retryCount || 0
          };
          
          newSyncQueue.set(lineId, queueItem);
          
          return { syncQueue: newSyncQueue };
        });
      },
      
      dequeueFromSync: (lineId: string) => {
        set(state => {
          const newSyncQueue = new Map(state.syncQueue);
          newSyncQueue.delete(lineId);
          return { syncQueue: newSyncQueue };
        });
      },
      
      getSyncQueue: () => {
        return Array.from(get().syncQueue.values()).sort((a, b) => a.timestamp - b.timestamp);
      },
      
      getDirtyLines: () => {
        const { dirtyTracking } = get();
        return Array.from(dirtyTracking.entries())
          .filter(([_, state]) => state.hasChanges)
          .map(([lineId]) => lineId);
      },
      
      isLineDirty: (lineId: string) => {
        const dirtyState = get().dirtyTracking.get(lineId);
        return dirtyState?.hasChanges || false;
      },
      
      getOriginalLineData: (lineId: string) => {
        const dirtyState = get().dirtyTracking.get(lineId);
        return dirtyState?.originalData;
      },
      
      markLineClean: (lineId: string) => {
        set(state => {
          const newDirtyTracking = new Map(state.dirtyTracking);
          const dirtyState = newDirtyTracking.get(lineId);
          
          if (dirtyState) {
            const displayLine = state.displayLines.get(lineId);
            if (displayLine) {
              newDirtyTracking.set(lineId, {
                originalData: { ...displayLine },
                currentData: { ...displayLine },
                hasChanges: false,
                lastModified: Date.now()
              });
            }
          }
          
          return { dirtyTracking: newDirtyTracking };
        });
      },
      
      setOnlineStatus: (isOnline: boolean) => {
        set({ isOnline });
      },
      
      scheduleRetry: () => {
        set({ retryScheduled: true });
      },
      
      clearRetrySchedule: () => {
        set({ retryScheduled: false });
      },
      
      updateLastSyncTime: () => {
        set({ lastSyncTime: Date.now() });
      },
      
      canSync: () => {
        const state = get();
        return state.isOnline && state.syncQueue.size > 0 && state.syncStatus !== 'syncing';
      },
      
      validateSession: (expectedClaimId: string, expectedEstimateId: string) => {
        const state = get();
        return state.currentClaimId === expectedClaimId && state.currentEstimateId === expectedEstimateId;
      },
      
      detectContamination: (expectedClaimId: string, expectedEstimateId: string, context = 'unknown') => {
        const state = get();
        const isContaminated = state.currentClaimId !== expectedClaimId || state.currentEstimateId !== expectedEstimateId;
        
        if (isContaminated) {
          console.error('[EstimateStore] CONTAMINATION DETECTED', {
            context,
            currentClaimId: state.currentClaimId,
            expectedClaimId,
            currentEstimateId: state.currentEstimateId,
            expectedEstimateId,
            timestamp: Date.now()
          });
          
          // Additional line-level validation
          let lineContamination = false;
          state.displayLines.forEach((line, lineId) => {
            if (line.estimate_id !== expectedEstimateId) {
              console.error('[EstimateStore] LINE CONTAMINATION DETECTED', {
                lineId,
                lineEstimateId: line.estimate_id,
                expectedEstimateId,
                context
              });
              lineContamination = true;
            }
          });
          
          return { sessionContamination: isContaminated, lineContamination };
        }
        
        return { sessionContamination: false, lineContamination: false };
      }
    }),
    {
      name: 'estimate-session-store'
    }
  )
);

// Utility functions
export const getEstimateSessionStore = () => useEstimateSessionStore.getState();

// Check if an estimate has unsaved changes
export const hasUnsavedEstimateChanges = (estimateId: string): boolean => {
  const store = getEstimateSessionStore();
  return store.currentEstimateId === estimateId && store.hasUnsavedChanges();
};