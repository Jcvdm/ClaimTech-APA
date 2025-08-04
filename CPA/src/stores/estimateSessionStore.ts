'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';
import Dexie, { type Table } from 'dexie';
import { type EstimateLine } from '@/lib/api/domains/estimates/types';

// IndexedDB schema for estimate sessions
interface EstimateSession {
  id: string; // estimateId
  pendingChanges: Record<string, Partial<EstimateLine>>; // lineId -> changes
  lastModified: number;
  version: number;
}

// Create IndexedDB instance
class EstimateSessionDB extends Dexie {
  sessions!: Table<EstimateSession>;

  constructor() {
    super('EstimateEditingSessions');
    this.version(1).stores({
      sessions: 'id, lastModified, version'
    });
  }
}

const db = new EstimateSessionDB();

// Session store state interface
interface EstimateSessionState {
  // Current editing session
  currentEstimateId: string | null;
  serverData: Map<string, EstimateLine>;
  pendingChanges: Map<string, Partial<EstimateLine>>;
  syncStatus: 'idle' | 'syncing' | 'error' | 'conflict';
  lastSyncTime: number | null;
  conflictFields: Map<string, string[]>; // lineId -> conflicting fields
  
  // Actions
  startSession: (estimateId: string, serverLines: EstimateLine[]) => Promise<void>;
  endSession: () => Promise<void>;
  updateField: (lineId: string, field: keyof EstimateLine, value: any) => void;
  syncChanges: (syncFn?: (updates: Array<{id: string; estimate_id: string; [key: string]: any}>) => Promise<{success: boolean; errors: Array<{id: string; error: string}>}>) => Promise<void>;
  resolveConflict: (lineId: string, field: string, useLocal: boolean) => void;
  getDisplayData: () => EstimateLine[];
  hasUnsavedChanges: () => boolean;
  clearPendingChanges: () => void;
  
  // Session persistence
  saveSession: () => Promise<void>;
  loadSession: (estimateId: string) => Promise<boolean>;
}

// Custom storage engine for IndexedDB
const indexedDBStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const estimateId = name.replace('estimate-session-', '');
      const session = await db.sessions.get(estimateId);
      if (session) {
        return JSON.stringify({
          pendingChanges: Object.fromEntries(
            Object.entries(session.pendingChanges)
          ),
          lastModified: session.lastModified,
          version: session.version
        });
      }
      return null;
    } catch (error) {
      console.error('[EstimateSessionStore] Error loading from IndexedDB:', error);
      return null;
    }
  },
  
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const estimateId = name.replace('estimate-session-', '');
      const data = JSON.parse(value);
      await db.sessions.put({
        id: estimateId,
        pendingChanges: data.pendingChanges || {},
        lastModified: Date.now(),
        version: data.version || 1
      });
    } catch (error) {
      console.error('[EstimateSessionStore] Error saving to IndexedDB:', error);
    }
  },
  
  removeItem: async (name: string): Promise<void> => {
    try {
      const estimateId = name.replace('estimate-session-', '');
      await db.sessions.delete(estimateId);
    } catch (error) {
      console.error('[EstimateSessionStore] Error removing from IndexedDB:', error);
    }
  }
};

export const useEstimateSessionStore = create<EstimateSessionState>()(
  devtools(
    persist(
      (set, get) => ({
        currentEstimateId: null,
        serverData: new Map(),
        pendingChanges: new Map(),
        syncStatus: 'idle',
        lastSyncTime: null,
        conflictFields: new Map(),
        
        startSession: async (estimateId: string, serverLines: EstimateLine[]) => {
          console.log('[EstimateSessionStore] Starting session for estimate:', estimateId);
          
          // End previous session if exists
          const currentId = get().currentEstimateId;
          if (currentId && currentId !== estimateId) {
            await get().endSession();
          }
          
          // Set up new session
          const serverDataMap = new Map(
            serverLines.map(line => [line.id, line])
          );
          
          set({
            currentEstimateId: estimateId,
            serverData: serverDataMap,
            syncStatus: 'idle',
            conflictFields: new Map()
          });
          
          // Try to load existing session
          const hasExistingSession = await get().loadSession(estimateId);
          if (hasExistingSession) {
            console.log('[EstimateSessionStore] Restored existing session with pending changes');
          }
        },
        
        endSession: async () => {
          const { currentEstimateId, hasUnsavedChanges } = get();
          
          if (currentEstimateId && hasUnsavedChanges()) {
            // Save session before ending
            await get().saveSession();
          }
          
          set({
            currentEstimateId: null,
            serverData: new Map(),
            pendingChanges: new Map(),
            syncStatus: 'idle',
            lastSyncTime: null,
            conflictFields: new Map()
          });
        },
        
        updateField: (lineId: string, field: keyof EstimateLine, value: any) => {
          console.log(`[EstimateSessionStore] Updating field ${String(field)} for line ${lineId}:`, value);
          
          set(state => {
            const pendingChanges = new Map(state.pendingChanges);
            const lineChanges = pendingChanges.get(lineId) || {};
            
            console.log(`[EstimateSessionStore] Before update - lineChanges:`, lineChanges);
            
            // Update the specific field
            lineChanges[field] = value;
            pendingChanges.set(lineId, lineChanges);
            
            console.log(`[EstimateSessionStore] After update - lineChanges:`, lineChanges);
            console.log(`[EstimateSessionStore] Total pending changes:`, pendingChanges.size);
            
            return { pendingChanges };
          });
          
          // Auto-save to IndexedDB (debounced internally)
          get().saveSession();
        },
        
        syncChanges: async (syncFn?: (updates: Array<{id: string; estimate_id: string; [key: string]: any}>) => Promise<{success: boolean; errors: Array<{id: string; error: string}>}>) => {
          const { pendingChanges, currentEstimateId } = get();
          
          if (!currentEstimateId || pendingChanges.size === 0) {
            console.log('[EstimateSessionStore] No changes to sync');
            return;
          }

          if (!syncFn) {
            console.warn('[EstimateSessionStore] No sync function provided');
            return;
          }

          set({ syncStatus: 'syncing' });
          
          try {
            console.log('[EstimateSessionStore] Syncing changes to server...', pendingChanges.size, 'lines');
            
            // Prepare bulk update data
            const updates: Array<{
              id: string;
              estimate_id: string;
              [key: string]: any;
            }> = [];
            
            Array.from(pendingChanges.entries()).forEach(([lineId, lineChanges]) => {
              // Filter out undefined values and only include changed fields
              const cleanedChanges = Object.entries(lineChanges).reduce((acc, [key, value]) => {
                // Only include the field if it has been explicitly set (not undefined)
                if (value !== undefined) {
                  acc[key] = value;
                }
                return acc;
              }, {} as Record<string, any>);
              
              // Only add to updates if there are actual changes
              if (Object.keys(cleanedChanges).length > 0) {
                updates.push({
                  id: lineId,
                  estimate_id: currentEstimateId,
                  ...cleanedChanges
                });
              }
            });
            
            console.log('[EstimateSessionStore] Performing bulk update for', updates.length, 'lines');
            
            // Skip sync if no updates
            if (updates.length === 0) {
              console.log('[EstimateSessionStore] No updates to sync, skipping');
              set({ syncStatus: 'idle' });
              return;
            }
            
            // Call the provided sync function
            console.log('[EstimateSessionStore] About to call syncFn with updates:', updates);
            
            const result = await syncFn(updates);
            
            console.log('[EstimateSessionStore] Raw bulk update result:', JSON.stringify(result, null, 2));
            
            // Ensure result has expected structure
            const success = result?.success ?? false;
            const errors = Array.isArray(result?.errors) ? result.errors : [];
            
            console.log('[EstimateSessionStore] Parsed result:', { 
              success, 
              errors, 
              errorCount: errors.length,
              resultType: typeof result,
              resultKeys: result ? Object.keys(result) : 'null'
            });
            
            if (success) {
              // Sync was successful - clear all changes regardless of error array
              set({ 
                syncStatus: 'idle',
                lastSyncTime: Date.now(),
                pendingChanges: new Map() // Clear all pending changes
              });
              console.log('[EstimateSessionStore] All changes synced successfully');
              
              // Log any "errors" that came with successful sync (they might be warnings)
              if (errors.length > 0) {
                console.warn('[EstimateSessionStore] Sync successful but had warnings:', errors);
              }
              
              // Always return successfully for success=true
              return;
            } else {
              // Sync failed
              console.error('[EstimateSessionStore] Sync failed:', { success, errors });
              
              if (errors.length > 0) {
                // Separate stale line errors from real errors
                const staleLineErrors = errors.filter(e => 
                  e?.error?.includes('Line not found') || 
                  e?.error?.includes('does not belong to this estimate')
                );
                const realErrors = errors.filter(e => 
                  !e?.error?.includes('Line not found') && 
                  !e?.error?.includes('does not belong to this estimate')
                );
                
                console.log('[EstimateSessionStore] Found stale lines:', staleLineErrors.map(e => e.id));
                console.log('[EstimateSessionStore] Real errors:', realErrors);
                
                // Keep only real failed changes in pending state (remove stale lines)
                const failedChanges = new Map<string, Partial<EstimateLine>>();
                for (const error of realErrors) {
                  const originalChange = pendingChanges.get(error?.id);
                  if (originalChange) {
                    failedChanges.set(error.id, originalChange);
                  }
                }
                
                // If we only had stale line errors, treat as success
                if (realErrors.length === 0) {
                  console.log('[EstimateSessionStore] All errors were stale lines - treating as success');
                  set({ 
                    syncStatus: 'idle',
                    lastSyncTime: Date.now(),
                    pendingChanges: new Map() // Clear all pending changes including stale ones
                  });
                  return; // Don't throw error
                }
                
                set({ 
                  syncStatus: 'error',
                  pendingChanges: failedChanges
                });
                
                // Create error message safely (only for real errors)
                const errorDetails = realErrors.map(e => {
                  const id = e?.id || 'unknown';
                  const message = e?.error || e?.message || 'unknown error';
                  return `${id}: ${message}`;
                }).join(', ');
                
                throw new Error(`Failed to sync ${realErrors.length} of ${updates.length} changes: ${errorDetails}`);
              } else {
                // No specific errors but sync failed
                set({ syncStatus: 'error' });
                throw new Error('Sync failed with no specific error details');
              }
            }
          } catch (error) {
            console.error('[EstimateSessionStore] Sync error caught:', {
              error,
              errorType: typeof error,
              errorName: error?.constructor?.name,
              errorMessage: error?.message,
              errorStack: error?.stack
            });
            
            set({ syncStatus: 'error' });
            
            // Re-throw error for useEstimateSession hook to handle
            // But make sure it's a proper Error object
            if (error instanceof Error) {
              console.error('[EstimateSessionStore] Re-throwing Error object:', error.message);
              throw error;
            } else {
              console.error('[EstimateSessionStore] Creating new Error from:', String(error));
              throw new Error(`Sync failed: ${String(error)}`);
            }
          }
        },
        
        resolveConflict: (lineId: string, field: string, useLocal: boolean) => {
          if (!useLocal) {
            // Remove the pending change for this field
            set(state => {
              const pendingChanges = new Map(state.pendingChanges);
              const lineChanges = pendingChanges.get(lineId);
              
              if (lineChanges) {
                delete lineChanges[field as keyof EstimateLine];
                if (Object.keys(lineChanges).length === 0) {
                  pendingChanges.delete(lineId);
                } else {
                  pendingChanges.set(lineId, lineChanges);
                }
              }
              
              // Remove from conflict tracking
              const conflictFields = new Map(state.conflictFields);
              const lineConflicts = conflictFields.get(lineId) || [];
              const updatedConflicts = lineConflicts.filter(f => f !== field);
              
              if (updatedConflicts.length === 0) {
                conflictFields.delete(lineId);
              } else {
                conflictFields.set(lineId, updatedConflicts);
              }
              
              return { pendingChanges, conflictFields };
            });
          }
        },
        
        getDisplayData: () => {
          const { serverData, pendingChanges } = get();
          const displayData: EstimateLine[] = [];
          
          console.log('[EstimateSessionStore] getDisplayData - serverData size:', serverData.size, 'pendingChanges size:', pendingChanges.size);
          
          // Merge server data with pending changes
          Array.from(serverData.entries()).forEach(([lineId, serverLine]) => {
            const changes = pendingChanges.get(lineId);
            if (changes) {
              const mergedLine = { ...serverLine, ...changes };
              console.log('[EstimateSessionStore] Merged line', lineId, ':', mergedLine);
              displayData.push(mergedLine);
            } else {
              displayData.push(serverLine);
            }
          });
          
          // Sort by sequence number
          return displayData.sort((a, b) => a.sequence_number - b.sequence_number);
        },
        
        hasUnsavedChanges: () => {
          return get().pendingChanges.size > 0;
        },
        
        clearPendingChanges: () => {
          set({ pendingChanges: new Map(), conflictFields: new Map() });
        },
        
        saveSession: async () => {
          const { currentEstimateId, pendingChanges } = get();
          if (!currentEstimateId || pendingChanges.size === 0) return;
          
          try {
            await db.sessions.put({
              id: currentEstimateId,
              pendingChanges: Object.fromEntries(pendingChanges),
              lastModified: Date.now(),
              version: 1
            });
            console.log('[EstimateSessionStore] Session saved to IndexedDB');
          } catch (error) {
            console.error('[EstimateSessionStore] Error saving session:', error);
          }
        },
        
        loadSession: async (estimateId: string) => {
          try {
            const session = await db.sessions.get(estimateId);
            if (session) {
              const pendingChanges = new Map(
                Object.entries(session.pendingChanges)
              );
              
              set({ pendingChanges });
              console.log('[EstimateSessionStore] Loaded session from IndexedDB:', pendingChanges.size, 'pending changes');
              return true;
            }
            return false;
          } catch (error) {
            console.error('[EstimateSessionStore] Error loading session:', error);
            return false;
          }
        }
      }),
      {
        name: `estimate-session-${Date.now()}`, // Dynamic name based on session
        storage: createJSONStorage(() => indexedDBStorage as any),
        partialize: (state) => ({
          pendingChanges: Object.fromEntries(state.pendingChanges),
          lastModified: Date.now(),
          version: 1
        })
      }
    ),
    {
      name: 'estimate-session-store'
    }
  )
);

// Utility functions
export const getEstimateSessionStore = () => useEstimateSessionStore.getState();

// Session persistence utilities
export const persistEstimateSession = async (estimateId: string) => {
  const store = getEstimateSessionStore();
  if (store.currentEstimateId === estimateId) {
    await store.saveSession();
  }
};

export const hasUnsavedEstimateChanges = (estimateId: string): boolean => {
  const store = getEstimateSessionStore();
  return store.currentEstimateId === estimateId && store.hasUnsavedChanges();
};