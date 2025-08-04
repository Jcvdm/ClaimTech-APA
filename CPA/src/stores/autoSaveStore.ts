'use client';

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { EstimateLine } from '@/lib/api/domains/estimates/types';

export interface FieldChange {
  id: string;
  field: keyof EstimateLine;
  value: any;
  timestamp: number;
  retryCount: number;
  priority: 'immediate' | 'standard' | 'deferred';
}

export interface PendingChange {
  lineId: string;
  changes: Record<string, FieldChange>;
  batchId?: string;
  lastModified: number;
}

export interface ConflictResolution {
  lineId: string;
  field: string;
  localValue: any;
  serverValue: any;
  resolution?: 'local' | 'server' | 'manual';
  timestamp: number;
}

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface AutoSaveState {
  // Dirty field tracking
  dirtyFields: Map<string, Set<keyof EstimateLine>>; // lineId -> dirty fields
  pendingChanges: Map<string, PendingChange>; // lineId -> pending changes
  
  // Sync queue management
  syncQueue: FieldChange[];
  activeSyncs: Map<string, number>; // operationId -> timestamp
  
  // Field-level save status tracking
  fieldSaveStatus: Map<string, SaveStatus>; // ${lineId}-${field} -> status
  
  // Conflict resolution
  conflicts: ConflictResolution[];
  
  // Connection state
  isOnline: boolean;
  lastServerSync: number;
  
  // Auto-save configuration
  config: {
    debounceDelay: number;
    batchSize: number;
    retryAttempts: number;
    immediateFields: Set<keyof EstimateLine>;
  };

  // Actions
  markFieldDirty: (lineId: string, field: keyof EstimateLine, value: any, priority?: 'immediate' | 'standard' | 'deferred') => void;
  clearDirtyField: (lineId: string, field: keyof EstimateLine) => void;
  addPendingChange: (lineId: string, field: keyof EstimateLine, value: any) => void;
  removePendingChange: (lineId: string, field: keyof EstimateLine) => void;
  addToSyncQueue: (change: FieldChange) => void;
  removeFromSyncQueue: (changeId: string) => void;
  setFieldSaveStatus: (lineId: string, field: keyof EstimateLine, status: SaveStatus) => void;
  getFieldSaveStatus: (lineId: string, field: keyof EstimateLine) => SaveStatus;
  addConflict: (conflict: ConflictResolution) => void;
  resolveConflict: (lineId: string, field: string, resolution: 'local' | 'server') => void;
  setOnlineStatus: (online: boolean) => void;
  updateConfig: (config: Partial<AutoSaveState['config']>) => void;
  reset: () => void;
  
  // Computed getters
  getPendingChangesCount: () => number;
  getConflictsCount: () => number;
  hasPendingChanges: () => boolean;
  hasConflicts: () => boolean;
}

export const useAutoSaveStore = create<AutoSaveState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      dirtyFields: new Map(),
      pendingChanges: new Map(),
      syncQueue: [],
      activeSyncs: new Map(),
      fieldSaveStatus: new Map(),
      conflicts: [],
      isOnline: true,
      lastServerSync: Date.now(),
      
      config: {
        debounceDelay: 4500, // 4.5 seconds - increased delay for better editing experience
        batchSize: 5, // Reduced batch size to prevent UI overwhelming
        retryAttempts: 3,
        immediateFields: new Set(['operation_code']), // Only operation_code needs immediate sync
        editingSessionDelay: 6000, // 6 seconds - extended delay during active editing sessions
        activityThreshold: 3000, // 3 seconds - time to consider editing session active
      },

      markFieldDirty: (lineId, field, value, priority = 'standard') => {
        set((state) => {
          const newDirtyFields = new Map(state.dirtyFields);
          const lineFields = newDirtyFields.get(lineId) || new Set();
          lineFields.add(field);
          newDirtyFields.set(lineId, lineFields);

          // Create field change
          const change: FieldChange = {
            id: `${lineId}-${field}-${Date.now()}`,
            field,
            value,
            timestamp: Date.now(),
            retryCount: 0,
            priority: state.config.immediateFields.has(field) ? 'immediate' : priority,
          };

          // Set field status to pending
          const newFieldSaveStatus = new Map(state.fieldSaveStatus);
          newFieldSaveStatus.set(`${lineId}-${field}`, 'pending');

          return {
            dirtyFields: newDirtyFields,
            syncQueue: [...state.syncQueue, change],
            fieldSaveStatus: newFieldSaveStatus,
          };
        });
      },

      clearDirtyField: (lineId, field) => {
        set((state) => {
          const newDirtyFields = new Map(state.dirtyFields);
          const lineFields = newDirtyFields.get(lineId);
          if (lineFields) {
            lineFields.delete(field);
            if (lineFields.size === 0) {
              newDirtyFields.delete(lineId);
            } else {
              newDirtyFields.set(lineId, lineFields);
            }
          }

          // Set field status to saved
          const newFieldSaveStatus = new Map(state.fieldSaveStatus);
          newFieldSaveStatus.set(`${lineId}-${field}`, 'saved');

          return { 
            dirtyFields: newDirtyFields,
            fieldSaveStatus: newFieldSaveStatus,
          };
        });
      },

      addPendingChange: (lineId, field, value) => {
        set((state) => {
          const newPendingChanges = new Map(state.pendingChanges);
          const existing = newPendingChanges.get(lineId) || {
            lineId,
            changes: {},
            lastModified: Date.now(),
          };
          
          existing.changes[field] = {
            id: `${lineId}-${field}-${Date.now()}`,
            field,
            value,
            timestamp: Date.now(),
            retryCount: 0,
            priority: 'standard',
          };
          existing.lastModified = Date.now();
          
          newPendingChanges.set(lineId, existing);

          // Set field status to saving
          const newFieldSaveStatus = new Map(state.fieldSaveStatus);
          newFieldSaveStatus.set(`${lineId}-${field}`, 'saving');

          return { 
            pendingChanges: newPendingChanges,
            fieldSaveStatus: newFieldSaveStatus,
          };
        });
      },

      removePendingChange: (lineId, field) => {
        set((state) => {
          const newPendingChanges = new Map(state.pendingChanges);
          const existing = newPendingChanges.get(lineId);
          if (existing) {
            delete existing.changes[field];
            if (Object.keys(existing.changes).length === 0) {
              newPendingChanges.delete(lineId);
            } else {
              newPendingChanges.set(lineId, existing);
            }
          }

          // Set field status to saved
          const newFieldSaveStatus = new Map(state.fieldSaveStatus);
          newFieldSaveStatus.set(`${lineId}-${field}`, 'saved');

          return { 
            pendingChanges: newPendingChanges,
            fieldSaveStatus: newFieldSaveStatus,
          };
        });
      },

      addToSyncQueue: (change) => {
        set((state) => ({
          syncQueue: [...state.syncQueue, change],
        }));
      },

      removeFromSyncQueue: (changeId) => {
        set((state) => ({
          syncQueue: state.syncQueue.filter(change => change.id !== changeId),
        }));
      },

      setFieldSaveStatus: (lineId, field, status) => {
        set((state) => {
          const newFieldSaveStatus = new Map(state.fieldSaveStatus);
          newFieldSaveStatus.set(`${lineId}-${field}`, status);
          return { fieldSaveStatus: newFieldSaveStatus };
        });
      },

      getFieldSaveStatus: (lineId, field) => {
        return get().fieldSaveStatus.get(`${lineId}-${field}`) || 'idle';
      },

      addConflict: (conflict) => {
        set((state) => ({
          conflicts: [...state.conflicts, conflict],
        }));
      },

      resolveConflict: (lineId, field, resolution) => {
        set((state) => ({
          conflicts: state.conflicts.filter(
            c => !(c.lineId === lineId && c.field === field)
          ),
        }));
      },

      setOnlineStatus: (online) => {
        set({ isOnline: online });
      },

      updateConfig: (newConfig) => {
        set((state) => ({
          config: { ...state.config, ...newConfig },
        }));
      },

      reset: () => {
        set({
          dirtyFields: new Map(),
          pendingChanges: new Map(),
          syncQueue: [],
          activeSyncs: new Map(),
          fieldSaveStatus: new Map(),
          conflicts: [],
          lastServerSync: Date.now(),
        });
      },

      // Computed getters
      getPendingChangesCount: () => {
        const state = get();
        return Array.from(state.pendingChanges.values()).reduce(
          (sum, line) => sum + Object.keys(line.changes).length, 
          0
        );
      },

      getConflictsCount: () => get().conflicts.length,

      hasPendingChanges: () => get().pendingChanges.size > 0,

      hasConflicts: () => get().conflicts.length > 0,
    })),
    { name: 'auto-save-store' }
  )
);

// Auto-cleanup for stale save statuses
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = useAutoSaveStore.getState();
    const now = Date.now();
    const newFieldSaveStatus = new Map();
    
    // Clean up stale 'saved' statuses after 5 seconds
    state.fieldSaveStatus.forEach((status, key) => {
      if (status === 'saved') {
        // Keep 'saved' status for a short time for user feedback
        const [lineId, field] = key.split('-');
        const pendingChange = state.pendingChanges.get(lineId)?.changes[field];
        if (!pendingChange || now - pendingChange.timestamp > 5000) {
          newFieldSaveStatus.set(key, 'idle');
        } else {
          newFieldSaveStatus.set(key, status);
        }
      } else {
        newFieldSaveStatus.set(key, status);
      }
    });

    if (newFieldSaveStatus.size !== state.fieldSaveStatus.size) {
      useAutoSaveStore.setState({ fieldSaveStatus: newFieldSaveStatus });
    }
  }, 5000);
}