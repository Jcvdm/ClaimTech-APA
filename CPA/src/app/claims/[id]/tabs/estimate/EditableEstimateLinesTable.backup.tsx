"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Save, X, Trash, Edit, FileText, GripVertical } from "lucide-react";
import { useColumnResize } from "@/hooks/useColumnResize";
import { useEditingSession } from "@/hooks/useEditingSession";
import {
  type Estimate,
  type EstimateLine,
  type EstimateLineCreate,
  type EstimateLineUpdate,
  OperationCode,
  PartType
} from "@/lib/api/domains/estimates/types";
import { useEstimateLines, useAddEstimateLine, useUpdateEstimateLine, useDeleteEstimateLine } from "@/lib/api/domains/estimates/hooks";
import { useSyncStatusStore } from "@/stores/syncStatusStore";
import { useRowLevelBatch } from "@/hooks/useSmartDebounce";

interface EditableEstimateLinesTableProps {
  estimate: Estimate;
  onLinesChange?: (lines: EstimateLine[]) => void;
}

const OPERATION_CODES = [
  { value: OperationCode.NEW, label: "N - New" },
  { value: OperationCode.REPAIR, label: "R - Repair" },
  { value: OperationCode.ALIGN, label: "S - Aligning" },
  { value: OperationCode.PAINT, label: "P - Paint" },
  { value: OperationCode.BLEND, label: "B - Blend" },
  { value: OperationCode.OTHER, label: "O - Other" },
  { value: OperationCode.SPECIAL, label: "SC - Special Services" },
];

// Short display versions for the UI
const OPERATION_CODES_SHORT = [
  { value: OperationCode.NEW, label: "N" },
  { value: OperationCode.REPAIR, label: "R" },
  { value: OperationCode.ALIGN, label: "S" },
  { value: OperationCode.PAINT, label: "P" },
  { value: OperationCode.BLEND, label: "B" },
  { value: OperationCode.OTHER, label: "O" },
  { value: OperationCode.SPECIAL, label: "SC" },
];

const PART_TYPE_OPTIONS = [
  { value: PartType.DEALER, label: "D - Dealer" },
  { value: PartType.ALTERNATIVE, label: "ALT - Alternative" },
  { value: PartType.USED, label: "U - Used" },
  { value: PartType.OTHER, label: "O - Other" },
];

// Short display versions for the UI
const PART_TYPE_OPTIONS_SHORT = [
  { value: PartType.DEALER, label: "D" },
  { value: PartType.ALTERNATIVE, label: "ALT" },
  { value: PartType.USED, label: "U" },
  { value: PartType.OTHER, label: "O" },
];

// Define column structure for resizing
const COLUMN_DEFINITIONS = [
  { key: 'sequence', label: 'Seq', defaultWidth: 60 },
  { key: 'operation', label: 'Operation', defaultWidth: 120 },
  { key: 'description', label: 'Description', defaultWidth: 300 },
  { key: 'type', label: 'Type', defaultWidth: 80 },
  { key: 'part_number', label: 'Part #', defaultWidth: 120 },
  { key: 'part_cost', label: 'Part Cost', defaultWidth: 100 },
  { key: 'quantity', label: 'Qty', defaultWidth: 80 },
  { key: 'strip_fit', label: 'S/A', defaultWidth: 80 },
  { key: 'labor', label: 'Labor', defaultWidth: 80 },
  { key: 'paint', label: 'Paint', defaultWidth: 80 },
  { key: 'specialist', label: 'Specialist', defaultWidth: 100 },
  { key: 'status', label: 'Status', defaultWidth: 80 },
] as const;

// Create default widths object from column definitions
const DEFAULT_COLUMN_WIDTHS = COLUMN_DEFINITIONS.reduce((acc, col) => {
  acc[col.key] = col.defaultWidth;
  return acc;
}, {} as Record<string, number>);

export function EditableEstimateLinesTable({ estimate, onLinesChange }: EditableEstimateLinesTableProps) {
  console.log("[EditableEstimateLinesTable] Rendering with estimate:", estimate);

  // Early return if estimate is not provided
  if (!estimate || !estimate.id) {
    console.error('[EditableEstimateLinesTable] No estimate provided');
    return <div>Error: No estimate data available</div>;
  }

  // State declarations - moved to top to prevent reference errors
  // Local state for immediate UI updates
  const [localLines, setLocalLines] = useState<EstimateLine[]>([]);

  // Track which lines are being synced with the server
  const [syncingLines, setSyncingLines] = useState<Record<string, boolean>>({});

  // Track component initialization state
  const [isInitialized, setIsInitialized] = useState(false);

  // Track which fields are currently being edited
  const [editingFields, setEditingFields] = useState<Record<string, Record<string, boolean>>>({});

  // Track which fields are showing raw values (unformatted)
  const [showingRawValues, setShowingRawValues] = useState<Record<string, Record<string, boolean>>>({});

  // Track which fields are actively being edited (edit protection)
  const [activelyEditingFields, setActivelyEditingFields] = useState<Record<string, Record<string, boolean>>>({});

  // Field value backup system for additional protection against unexpected overwrites
  const [fieldBackups, setFieldBackups] = useState<Record<string, Record<string, any>>>({});

  // localStorage key for persisting field edits across navigation
  const getLocalStorageKey = (lineId: string, field: string) => `estimate_${estimate.id}_line_${lineId}_${field}`;

  // Track ongoing mutation requests to prevent race conditions
  const [ongoingMutations, setOngoingMutations] = useState<Set<string>>(new Set());

  // Track the currently focused cell for keyboard navigation
  const [focusedCell, setFocusedCell] = useState<{
    rowId: string;
    field: keyof EstimateLine;
  } | null>(null);

  // Track original values for reverting edits with Escape key
  const [originalValues, setOriginalValues] = useState<Record<string, Record<string, any>>>({});

  // Add styles for column resizing
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .column-resize-handle:hover {
        background-color: rgb(59 130 246) !important;
      }
      .column-resize-handle.resizing {
        background-color: rgb(59 130 246) !important;
        width: 6px !important;
      }
      /* Prevent text selection during resize */
      .resizing-table * {
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const {
    data: serverLines = [],
    isLoading,
    isError,
    error,
    refetch
  } = useEstimateLines(estimate.id);

  // Initialize mutations first before using them in rowBatch
  const addLine = useAddEstimateLine();
  const updateLine = useUpdateEstimateLine();
  const deleteLine = useDeleteEstimateLine();

  // Initialize editing session management for intelligent sync timing
  const {
    recordFieldEdit,
    isEditingSessionActive,
    getDelayMultiplier,
    getSessionState,
    endEditingSession,
  } = useEditingSession({
    sessionTimeout: 3000, // 3 seconds of inactivity ends session
    rapidEditingThreshold: 3, // 3+ rapid edits triggers extended delay
    rapidEditingWindow: 10000, // Count edits in 10-second window
  });

  // Row-level batching for improved performance and reduced API calls
  // Initialize after mutations and editing session are available with comprehensive error handling
  // Now uses dynamic delays based on editing session activity
  const rowBatch = useRowLevelBatch<EstimateLine>(
    async (line: EstimateLine, changes: Partial<EstimateLine>) => {
      // Check if component is properly initialized
      if (!isInitialized) {
        console.warn('[EditableEstimateLinesTable] Component not initialized, skipping batch update');
        throw new Error('Component not initialized');
      }

      // Validate required data
      if (!line?.id || !updateLine) {
        console.error('[EditableEstimateLinesTable] Invalid line data or updateLine not available');
        throw new Error('Invalid line data or updateLine mutation not available');
      }

      // Generate a unique operation ID for this batch update
      const operationId = `batch-update-${line.id}-${Date.now()}`;
      
      try {
        // Track the start of this sync operation
        useSyncStatusStore.getState().addOperation(operationId);
        
        console.log(`[EditableEstimateLinesTable] Batch updating line ${line.id} with changes:`, changes);
        
        // Mark line as syncing
        setSyncingLines(prev => ({ ...prev, [line.id]: true }));

        // Prepare update data with all batched changes
        const updatedLine: EstimateLineUpdate = {
          id: line.id,
          estimate_id: line.estimate_id,
          _isAutoSave: true, // Flag to indicate this is an auto-save operation
          ...changes // Include all batched field changes
        };

        // Send batch update to server with enhanced error handling
        const serverResponse = await updateLine.mutateAsync(updatedLine);
        
        console.log("[EditableEstimateLinesTable] Batch update successful:", serverResponse);
        console.log("[EditableEstimateLinesTable] Batch update - original line before sync:", line);
        console.log("[EditableEstimateLinesTable] Batch update - changes applied:", changes);
        console.log("[EditableEstimateLinesTable] Batch update - server response:", serverResponse);

        // Update local state with server response using smart merge to preserve active edits
        setLocalLines(currentLines => {
          try {
            const updatedLines = currentLines.map(localLine => {
              if (localLine.id === serverResponse.id) {
                // Check if any fields are actively being edited
                const activeFields = activelyEditingFields[serverResponse.id];
                console.log(`[EditableEstimateLinesTable] Batch merge - Active fields for line ${serverResponse.id}:`, activeFields);
                console.log(`[EditableEstimateLinesTable] Batch merge - Local line before merge:`, localLine);
                console.log(`[EditableEstimateLinesTable] Batch merge - Server response to merge:`, serverResponse);
                
                // Check for fields with localStorage backups (recent user edits)
                const fieldsWithBackups: string[] = [];
                ['description', 'part_type', 'operation_code', 'part_number', 'part_cost', 'quantity'].forEach(fieldName => {
                  const backupValue = loadFromLocalStorage(serverResponse.id, fieldName as keyof EstimateLine);
                  if (backupValue !== undefined) {
                    fieldsWithBackups.push(fieldName);
                  }
                });
                
                console.log(`[EditableEstimateLinesTable] Batch merge - Fields with localStorage backups:`, fieldsWithBackups);
                
                if ((!activeFields || Object.keys(activeFields).length === 0) && fieldsWithBackups.length === 0) {
                  // No active edits and no localStorage backups, check for potential data loss
                  const localDescription = localLine.description;
                  const serverDescription = serverResponse.description;
                  if (localDescription && (!serverDescription || serverDescription !== localDescription)) {
                    console.warn(`[EditableEstimateLinesTable] Potential description data loss detected! Local: "${localDescription}", Server: "${serverDescription}"`);
                  }
                  // No edits or backups, safe to use server response
                  return serverResponse;
                }

                // Merge server response, preserving actively edited fields and fields with localStorage backups
                const mergedLine = { ...serverResponse };
                
                // First, preserve actively edited fields
                if (activeFields) {
                  Object.keys(activeFields).forEach(fieldName => {
                    if (activeFields[fieldName]) {
                      // Preserve the current value for actively edited field
                      console.log(`[EditableEstimateLinesTable] Preserving actively edited field ${fieldName} during batch update for line ${serverResponse.id}`);
                      mergedLine[fieldName as keyof EstimateLine] = localLine[fieldName as keyof EstimateLine];
                    }
                  });
                }
                
                // Then, preserve fields with localStorage backups (recent user edits)
                fieldsWithBackups.forEach(fieldName => {
                  const backupValue = loadFromLocalStorage(serverResponse.id, fieldName as keyof EstimateLine);
                  if (backupValue !== undefined) {
                    console.log(`[EditableEstimateLinesTable] Preserving field ${fieldName} from localStorage backup during batch update for line ${serverResponse.id}:`, backupValue);
                    mergedLine[fieldName as keyof EstimateLine] = backupValue;
                  }
                });
                
                console.log(`[EditableEstimateLinesTable] Batch merge - Final merged line:`, mergedLine);
                return mergedLine;
              }
              return localLine;
            });
            return updatedLines;
          } catch (mergeError) {
            console.error('[EditableEstimateLinesTable] Error merging server response:', mergeError);
            // Return original lines on merge error
            return currentLines;
          }
        });

        // Clear syncing state
        setSyncingLines(prev => {
          const updated = { ...prev };
          delete updated[line.id];
          return updated;
        });

        // Track completion
        useSyncStatusStore.getState().removeOperation(operationId);
      } catch (error: any) {
        console.error("[EditableEstimateLinesTable] Batch update error:", error);
        
        try {
          // Clear syncing state
          setSyncingLines(prev => {
            const updated = { ...prev };
            delete updated[line.id];
            return updated;
          });

          // Only show user-facing errors for non-network issues during auto-save
          const errorMessage = error?.message?.toLowerCase() || '';
          const isNetworkError = errorMessage.includes('network') || errorMessage.includes('timeout') || 
                                errorMessage.includes('connection') || errorMessage.includes('fetch');

          if (!isNetworkError) {
            // For non-network errors, show validation feedback
            if (errorMessage.includes("too_small") || errorMessage.includes("required") || 
                errorMessage.includes("validation")) {
              console.warn('[EditableEstimateLinesTable] Validation error during auto-save:', error.message);
              // Don't show intrusive toasts for auto-save validation errors
            } else {
              toast.error('Auto-save failed during batch update', {
                description: 'Your changes have been preserved locally.',
              });
            }
          }

          // Track error in sync status
          useSyncStatusStore.getState().setError(error?.message || 'Unknown error');
          useSyncStatusStore.getState().removeOperation(operationId);
        } catch (errorHandlingError) {
          console.error('[EditableEstimateLinesTable] Error handling batch update error:', errorHandlingError);
        }
        
        // Always re-throw to let the batch system handle retries
        throw error;
      }
    },
    {
      delay: 4000, // 4 seconds base delay - will be dynamically adjusted by editing session
      maxBatchSize: 5, // Reduced batch size to prevent UI overwhelming
      getDelayMultiplier: getDelayMultiplier, // Dynamic delay adjustment based on editing session
      maxRetries: 3, // Maximum retry attempts for failed operations
      onError: (error, rowId, changes) => {
        // Enhanced error callback for batch failures
        console.error(`[EditableEstimateLinesTable] Batch operation failed permanently for row ${rowId}:`, error, changes);
        
        try {
          // Attempt to revert to server state for validation errors
          const errorMessage = error?.message?.toLowerCase() || '';
          if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
            const serverLine = serverLines.find(l => l.id === rowId);
            if (serverLine) {
              console.log(`[EditableEstimateLinesTable] Reverting row ${rowId} to server state due to validation error`);
              setLocalLines(currentLines =>
                currentLines.map(l => l.id === rowId ? serverLine : l)
              );
              
              toast.error('Invalid data detected', {
                description: 'The row has been reverted to the last valid state.',
              });
            }
          } else if (!errorMessage.includes('network')) {
            // For non-network errors, show user feedback
            toast.error('Failed to save changes', {
              description: 'Some changes could not be saved to the server.',
              action: {
                label: 'Retry',
                onClick: () => {
                  if (rowBatch?.retryFailedOperation) {
                    rowBatch.retryFailedOperation(rowId);
                  }
                }
              }
            });
          }
        } catch (callbackError) {
          console.error('[EditableEstimateLinesTable] Error in batch error callback:', callbackError);
        }
      }
    }
  );

  // Smart merge function to preserve actively edited fields during server updates
  const smartMergeServerData = (currentLines: EstimateLine[], serverLines: EstimateLine[]): EstimateLine[] => {
    if (!serverLines || serverLines.length === 0) return currentLines;
    if (!currentLines || currentLines.length === 0) return serverLines;

    return serverLines.map(serverLine => {
      const currentLine = currentLines.find(l => l.id === serverLine.id);
      if (!currentLine) return serverLine;

      // Check if any fields for this line are actively being edited
      const activeFields = activelyEditingFields[serverLine.id];
      
      // Check for localStorage data that might need to be restored
      const restoredData = restoreAllFromLocalStorage();
      const lineRestoredData = restoredData[serverLine.id];
      
      if ((!activeFields || Object.keys(activeFields).length === 0) && !lineRestoredData) {
        // No active edits and no localStorage data, safe to use server data
        return serverLine;
      }

      // Merge line data, preserving actively edited fields and localStorage data
      const mergedLine = { ...serverLine };
      
      // First, restore any localStorage data (takes precedence over server)
      if (lineRestoredData) {
        Object.keys(lineRestoredData).forEach(fieldName => {
          console.log(`[EditableEstimateLinesTable] Restoring field ${fieldName} from localStorage for line ${serverLine.id}:`, lineRestoredData[fieldName]);
          mergedLine[fieldName as keyof EstimateLine] = lineRestoredData[fieldName];
        });
      }
      
      // Then, preserve actively edited fields (takes highest precedence)
      if (activeFields) {
        Object.keys(activeFields).forEach(fieldName => {
          if (activeFields[fieldName]) {
            // Preserve the current value for actively edited field
            console.log(`[EditableEstimateLinesTable] Preserving actively edited field ${fieldName} for line ${serverLine.id}`);
            mergedLine[fieldName as keyof EstimateLine] = currentLine[fieldName as keyof EstimateLine];
          }
        });
      }

      return mergedLine;
    });
  };

  // Initialize local state from server data when it changes
  useEffect(() => {
    if (serverLines && !isLoading) {
      console.log("[EditableEstimateLinesTable] Updating local lines from server data");
      // Use smart merge to preserve actively edited fields
      setLocalLines(currentLines => smartMergeServerData(currentLines, serverLines));
    }
  }, [serverLines, isLoading]);

  console.log("[EditableEstimateLinesTable] Server lines data:", serverLines);
  console.log("[EditableEstimateLinesTable] Local lines data:", localLines);
  console.log("[EditableEstimateLinesTable] isLoading:", isLoading);
  console.log("[EditableEstimateLinesTable] isError:", isError);

  // Notify parent component of line changes for live totals calculation
  useEffect(() => {
    if (onLinesChange && localLines.length >= 0) {
      console.log("[EditableEstimateLinesTable] Notifying parent of lines change:", localLines.length, "lines");
      onLinesChange(localLines);
    }
  }, [localLines, onLinesChange]);
  if (isError) {
    console.error("[EditableEstimateLinesTable] Error:", error);
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-red-600 mb-2">Error loading estimate lines</div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Force refetch when component mounts
  useEffect(() => {
    console.log("[EditableEstimateLinesTable] Component mounted, refetching lines");
    refetch();
  }, [estimate.id, refetch]);


  // Flush pending batches on unmount or when estimate changes
  useEffect(() => {
    return () => {
      console.log("[EditableEstimateLinesTable] Component unmounting, flushing pending batches and ending editing session");
      if (rowBatch?.flush) {
        rowBatch.flush();
      }
      endEditingSession();
    };
  }, [rowBatch, endEditingSession]);

  // Also flush batches when estimate ID changes
  useEffect(() => {
    if (rowBatch?.flush) {
      rowBatch.flush();
    }
    endEditingSession(); // End editing session when switching estimates
  }, [estimate.id, rowBatch, endEditingSession]);

  // Initialize column resizing
  const {
    columnWidths,
    isResizing,
    resizingColumn,
    getResizeHandleProps,
    getColumnWidth,
    setColumnWidth,
    resetColumnWidths,
    autoSizeColumn,
  } = useColumnResize({
    storageKey: `estimate-table-columns-${estimate.id}`,
    defaultWidths: DEFAULT_COLUMN_WIDTHS,
    minWidth: 60,
    maxWidth: 600,
  });

  // Mark component as initialized once all hooks are set up
  useEffect(() => {
    if (rowBatch && updateLine && addLine && deleteLine) {
      setIsInitialized(true);
      console.log('[EditableEstimateLinesTable] Component fully initialized');
    }
  }, [rowBatch, updateLine, addLine, deleteLine]);

  // Helper function to mark a field as actively being edited (edit protection)
  const markFieldAsActivelyEditing = (lineId: string, field: keyof EstimateLine) => {
    setActivelyEditingFields(prev => {
      const lineFields = prev[lineId] || {};
      return {
        ...prev,
        [lineId]: {
          ...lineFields,
          [field as string]: true
        }
      };
    });
    console.log(`[EditableEstimateLinesTable] Marked field ${String(field)} as actively editing for line ${lineId}`);
  };

  // Helper function to mark a field as no longer actively being edited
  const markFieldAsNotActivelyEditing = (lineId: string, field: keyof EstimateLine) => {
    setActivelyEditingFields(prev => {
      const lineFields = prev[lineId] || {};
      const updatedFields = { ...lineFields };
      delete updatedFields[field as string];
      return {
        ...prev,
        [lineId]: updatedFields
      };
    });
    console.log(`[EditableEstimateLinesTable] Unmarked field ${String(field)} as actively editing for line ${lineId}`);
  };

  // Check if a field is actively being edited
  const isFieldActivelyEditing = (lineId: string, field: keyof EstimateLine): boolean => {
    return Boolean(activelyEditingFields[lineId]?.[field as string]);
  };

  // Field backup system for additional protection
  const backupFieldValue = (lineId: string, field: keyof EstimateLine, value: any) => {
    setFieldBackups(prev => {
      const lineBackups = prev[lineId] || {};
      return {
        ...prev,
        [lineId]: {
          ...lineBackups,
          [field as string]: value
        }
      };
    });
    console.log(`[EditableEstimateLinesTable] Backed up field ${String(field)} for line ${lineId}:`, value);
  };

  const restoreFieldValue = (lineId: string, field: keyof EstimateLine): any => {
    const backupValue = fieldBackups[lineId]?.[field as string];
    if (backupValue !== undefined) {
      console.log(`[EditableEstimateLinesTable] Restoring field ${String(field)} for line ${lineId}:`, backupValue);
      updateLocalLine(lineId, field, backupValue, true);
      return backupValue;
    }
    return undefined;
  };

  const clearFieldBackup = (lineId: string, field: keyof EstimateLine) => {
    setFieldBackups(prev => {
      const lineBackups = prev[lineId] || {};
      const updatedBackups = { ...lineBackups };
      delete updatedBackups[field as string];
      return {
        ...prev,
        [lineId]: updatedBackups
      };
    });
  };

  // localStorage persistence functions for cross-navigation data protection
  const saveToLocalStorage = (lineId: string, field: keyof EstimateLine, value: any) => {
    try {
      const key = getLocalStorageKey(lineId, String(field));
      const data = {
        value,
        timestamp: Date.now(),
        lineId,
        field: String(field)
      };
      localStorage.setItem(key, JSON.stringify(data));
      console.log(`[EditableEstimateLinesTable] Saved to localStorage: ${key}`, value);
    } catch (error) {
      console.warn('[EditableEstimateLinesTable] Failed to save to localStorage:', error);
    }
  };

  const loadFromLocalStorage = (lineId: string, field: keyof EstimateLine): any => {
    try {
      const key = getLocalStorageKey(lineId, String(field));
      const stored = localStorage.getItem(key);
      if (stored) {
        const data = JSON.parse(stored);
        // Only use data that's less than 10 minutes old
        if (Date.now() - data.timestamp < 10 * 60 * 1000) {
          console.log(`[EditableEstimateLinesTable] Loaded from localStorage: ${key}`, data.value);
          return data.value;
        } else {
          // Clean up old data
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('[EditableEstimateLinesTable] Failed to load from localStorage:', error);
    }
    return undefined;
  };

  const clearFromLocalStorage = (lineId: string, field: keyof EstimateLine) => {
    try {
      const key = getLocalStorageKey(lineId, String(field));
      localStorage.removeItem(key);
      console.log(`[EditableEstimateLinesTable] Cleared from localStorage: ${key}`);
    } catch (error) {
      console.warn('[EditableEstimateLinesTable] Failed to clear localStorage:', error);
    }
  };

  const restoreAllFromLocalStorage = () => {
    try {
      const restoredData: Record<string, Record<string, any>> = {};
      const prefix = `estimate_${estimate.id}_line_`;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const data = JSON.parse(stored);
            // Only restore recent data (less than 10 minutes old)
            if (Date.now() - data.timestamp < 10 * 60 * 1000) {
              if (!restoredData[data.lineId]) {
                restoredData[data.lineId] = {};
              }
              restoredData[data.lineId][data.field] = data.value;
              console.log(`[EditableEstimateLinesTable] Restored from localStorage: line ${data.lineId}, field ${data.field}`, data.value);
            } else {
              // Clean up old data
              localStorage.removeItem(key);
            }
          }
        }
      }
      
      return restoredData;
    } catch (error) {
      console.warn('[EditableEstimateLinesTable] Failed to restore from localStorage:', error);
      return {};
    }
  };

  // Mutation tracking functions to prevent race conditions
  const getMutationKey = (lineId: string, field: keyof EstimateLine) => `${lineId}-${String(field)}`;
  
  const isMutationOngoing = (lineId: string, field: keyof EstimateLine): boolean => {
    return ongoingMutations.has(getMutationKey(lineId, field));
  };
  
  const addOngoingMutation = (lineId: string, field: keyof EstimateLine) => {
    const key = getMutationKey(lineId, field);
    setOngoingMutations(prev => new Set(prev).add(key));
    console.log(`[EditableEstimateLinesTable] Started mutation for ${key}`);
  };
  
  const removeOngoingMutation = (lineId: string, field: keyof EstimateLine) => {
    const key = getMutationKey(lineId, field);
    setOngoingMutations(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
    console.log(`[EditableEstimateLinesTable] Completed mutation for ${key}`);
  };


  // Note: Removed activeRowId state - all cells are now immediately editable
  // Note: Removed handleRowClick - cells are now directly clickable without row activation
  // Note: Removed click-outside handler - no longer needed since there's no row activation

  // Get the next sequence number for a new line
  const getNextSequenceNumber = () => {
    if (!localLines || localLines.length === 0) return 1;
    try {
      const sequenceNumbers = localLines
        .map(line => line?.sequence_number || 0)
        .filter(num => typeof num === 'number' && num > 0);
      return sequenceNumbers.length > 0 ? Math.max(...sequenceNumbers) + 1 : 1;
    } catch (error) {
      console.error('[EditableEstimateLinesTable] Error calculating next sequence number:', error);
      return localLines.length + 1; // Fallback to array length + 1
    }
  };

  // Check if part cost can be edited based on operation code
  const canEditPartCost = (line: EstimateLine) => {
    return line.operation_code === OperationCode.NEW ||
           line.operation_code === OperationCode.OTHER ||
           line.operation_code === OperationCode.SPECIAL;
  };

  // Handle editing part number
  const handleEditPartNumber = (line: EstimateLine) => {
    // Focus on the part number input
    const partNumberInput = document.querySelector(`input[name="part_number-${line.id}"]`) as HTMLInputElement;
    if (partNumberInput) {
      partNumberInput.focus();
    }
  };

  // Immediately create a new line when "Add Line" is clicked with comprehensive error handling
  const handleAddLine = () => {
    try {
      // Check if component is properly initialized
      if (!isInitialized) {
        console.warn('[EditableEstimateLinesTable] Component not initialized, cannot add line');
        toast.error('Please wait for the component to initialize');
        return;
      }

      // Validate estimate data
      if (!estimate?.id) {
        console.error('[EditableEstimateLinesTable] Invalid estimate data');
        toast.error('Invalid estimate data. Please refresh the page.');
        return;
      }

      // Check if addLine mutation is available
      if (!addLine) {
        console.error('[EditableEstimateLinesTable] Add line mutation not available');
        toast.error('Add line functionality not available. Please refresh the page.');
        return;
      }

      console.log("[EditableEstimateLinesTable] Adding new line for estimate:", estimate.id);

      // Generate sequence number with error handling
      let nextSequenceNumber: number;
      try {
        nextSequenceNumber = getNextSequenceNumber();
        console.log("[EditableEstimateLinesTable] Next sequence number:", nextSequenceNumber);
      } catch (error) {
        console.error('[EditableEstimateLinesTable] Error calculating sequence number:', error);
        nextSequenceNumber = (localLines?.length || 0) + 1; // Fallback
      }

      // Generate unique identifiers
      const operationId = `add-line-${Date.now()}`;
      const tempId = `temp-${Date.now()}`;

      try {
        // Track the start of this sync operation in the global store
        useSyncStatusStore.getState().addOperation(operationId);

        // Mark as adding a new line (for internal tracking only)
        setSyncingLines(prev => ({ ...prev, new: true }));

        const newLine: EstimateLineCreate = {
          estimate_id: estimate.id,
          sequence_number: nextSequenceNumber,
          description: "", // Empty string is now allowed by the schema
          operation_code: OperationCode.NEW,
          quantity: 1,
          is_included: true,
        };

        console.log("[EditableEstimateLinesTable] Creating new line with data:", newLine);

        // Create a temporary line for local state with error handling
        const tempLine: EstimateLine = {
          id: tempId,
          ...newLine,
          damage_id: null,
          part_type: null,
          part_number: null,
          part_cost: null,
          strip_fit_hours: null,
          repair_hours: null,
          paint_hours: null,
          sublet_cost: null,
          line_notes: null,
          calculated_part_total: null,
          calculated_labor_total: null,
          calculated_paint_material_total: null,
          calculated_sublet_total: null,
          calculated_line_total: null,
          created_at: new Date(),
          updated_at: new Date(),
        };

        // Add to local state immediately with error protection
        try {
          setLocalLines(currentLines => {
            if (!Array.isArray(currentLines)) {
              console.warn('[EditableEstimateLinesTable] Invalid currentLines, initializing as array');
              return [tempLine];
            }
            return [...currentLines, tempLine];
          });
        } catch (stateError) {
          console.error('[EditableEstimateLinesTable] Error updating local state:', stateError);
          toast.error('Error updating interface. Please try again.');
          
          // Clean up and exit
          setSyncingLines(prev => {
            const updated = { ...prev };
            delete updated.new;
            return updated;
          });
          useSyncStatusStore.getState().removeOperation(operationId);
          return;
        }

        // Send to server with comprehensive error handling
        addLine.mutate(newLine, {
          onSuccess: (createdLine) => {
            try {
              console.log("[EditableEstimateLinesTable] Line created successfully:", createdLine);

              // Clear syncing state
              setSyncingLines(prev => {
                const updated = { ...prev };
                delete updated.new;
                return updated;
              });

              // Replace temp line with real line in local state
              setLocalLines(currentLines => {
                try {
                  if (!Array.isArray(currentLines)) {
                    console.warn('[EditableEstimateLinesTable] Invalid currentLines in onSuccess');
                    return [createdLine];
                  }
                  return currentLines.map(line =>
                    line.id === tempId ? createdLine : line
                  );
                } catch (replaceError) {
                  console.error('[EditableEstimateLinesTable] Error replacing temp line:', replaceError);
                  // Fallback: just add the created line
                  return [...currentLines.filter(l => l.id !== tempId), createdLine];
                }
              });

              // Track the completion of this sync operation
              useSyncStatusStore.getState().removeOperation(operationId);
              
              toast.success('New line added successfully');
            } catch (successError) {
              console.error('[EditableEstimateLinesTable] Error in onSuccess handler:', successError);
              // Still track completion to prevent stuck operations
              useSyncStatusStore.getState().removeOperation(operationId);
            }
          },
          onError: (error) => {
            try {
              console.error("[EditableEstimateLinesTable] Error creating line:", error);

              // Clear syncing state
              setSyncingLines(prev => {
                const updated = { ...prev };
                delete updated.new;
                return updated;
              });

              // Remove temp line from local state
              try {
                setLocalLines(currentLines => {
                  if (!Array.isArray(currentLines)) {
                    console.warn('[EditableEstimateLinesTable] Invalid currentLines in onError');
                    return [];
                  }
                  return currentLines.filter(line => line.id !== tempId);
                });
              } catch (removeError) {
                console.error('[EditableEstimateLinesTable] Error removing temp line:', removeError);
              }

              // Enhanced error handling for different error types
              const errorMessage = error?.message || 'Unknown error';
              const errorCode = error?.code || error?.status;
              
              if (errorMessage.includes("too_small") || errorMessage.includes("required") || 
                  errorMessage.includes("validation")) {
                try {
                  const validationErrors = JSON.parse(errorMessage);
                  const errorMessages = validationErrors.map((err: any) =>
                    `${err.path.join('.')}: ${err.message}`
                  ).join(', ');

                  toast.error('Validation Error', {
                    description: errorMessages,
                    action: {
                      label: 'Help',
                      onClick: () => {
                        toast.info('Creating Line Help', {
                          description: 'Ensure all required fields have valid values. Check sequence numbers and operation codes.',
                        });
                      }
                    }
                  });
                } catch (parseError) {
                  toast.error('Failed to create line', {
                    description: errorMessage,
                  });
                }
              } else if (errorCode === 401 || errorCode === 403) {
                toast.error('Permission Denied', {
                  description: 'You do not have permission to add estimate lines.',
                });
              } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
                toast.error('Network Error', {
                  description: 'Failed to connect to the server. Please check your connection and try again.',
                  action: {
                    label: 'Retry',
                    onClick: () => handleAddLine()
                  }
                });
              } else {
                toast.error('Failed to create line', {
                  description: errorMessage,
                  action: {
                    label: 'Try Again',
                    onClick: () => handleAddLine()
                  }
                });
              }

              // Track the error in the global store
              useSyncStatusStore.getState().setError(errorMessage);

              // Track the completion of this sync operation (even though it failed)
              useSyncStatusStore.getState().removeOperation(operationId);
            } catch (errorHandlingError) {
              console.error('[EditableEstimateLinesTable] Error in onError handler:', errorHandlingError);
              // Still track completion to prevent stuck operations
              useSyncStatusStore.getState().removeOperation(operationId);
              toast.error('An unexpected error occurred while handling the add line failure.');
            }
          }
        });
      } catch (mutationError) {
        console.error('[EditableEstimateLinesTable] Error initiating add line mutation:', mutationError);
        
        // Clean up state
        setSyncingLines(prev => {
          const updated = { ...prev };
          delete updated.new;
          return updated;
        });
        useSyncStatusStore.getState().removeOperation(operationId);
        
        toast.error('Failed to initiate line creation', {
          description: 'Please try again or refresh the page.',
        });
      }
    } catch (error) {
      console.error('[EditableEstimateLinesTable] Unexpected error in handleAddLine:', error);
      toast.error('An unexpected error occurred', {
        description: 'Please refresh the page and try again.',
      });
    }
  };

  // Function to update local state immediately with edit protection
  const updateLocalLine = (lineId: string, field: keyof EstimateLine, value: any, bypassProtection = false) => {
    if (!lineId || !field) {
      console.warn('[EditableEstimateLinesTable] Invalid parameters for updateLocalLine:', { lineId, field, value });
      return;
    }

    // Check if field is actively being edited and this isn't a user-initiated update
    if (!bypassProtection && isFieldActivelyEditing(lineId, field)) {
      console.log(`[EditableEstimateLinesTable] Skipping update for actively edited field ${String(field)} on line ${lineId}`);
      return;
    }

    console.log(`[EditableEstimateLinesTable] Updating local line ${lineId}, field ${String(field)}, value:`, value);

    try {
      setLocalLines(currentLines =>
        currentLines.map(line =>
          line.id === lineId ? { ...line, [field]: value } : line
        )
      );
      
      // Save to localStorage for persistence across navigation
      if (bypassProtection) { // Only save user-initiated changes
        saveToLocalStorage(lineId, field, value);
      }
    } catch (error) {
      console.error('[EditableEstimateLinesTable] Error updating local line:', error);
    }
  };

  // Helper function for immediate sync of critical fields (like operation_code)
  const syncFieldImmediately = async (line: EstimateLine, field: keyof EstimateLine, value: any) => {
    if (!line?.id || !field || !updateLine) {
      console.warn('[EditableEstimateLinesTable] Invalid parameters for syncFieldImmediately:', { line, field, value });
      return;
    }

    // Check if there's already an ongoing mutation for this field
    if (isMutationOngoing(line.id, field)) {
      console.warn(`[EditableEstimateLinesTable] Mutation already in progress for ${String(field)} on line ${line.id}, skipping`);
      return;
    }

    const operationId = `immediate-sync-${line.id}-${field}-${Date.now()}`;
    
    try {
      // Track this mutation to prevent races
      addOngoingMutation(line.id, field);
      useSyncStatusStore.getState().addOperation(operationId);
      setSyncingLines(prev => ({ ...prev, [line.id]: true }));

      // Validate the update payload before sending
      const updatedLine: EstimateLineUpdate = {
        id: line.id,
        estimate_id: line.estimate_id,
        [field]: value
      };

      // Additional validation to prevent tRPC errors
      if (!updatedLine.id || !updatedLine.estimate_id) {
        throw new Error('Invalid line data: missing id or estimate_id');
      }

      // Validate the field value
      if (value === undefined) {
        console.warn(`[EditableEstimateLinesTable] Skipping sync of undefined value for ${String(field)}`);
        removeOngoingMutation(line.id, field);
        return;
      }

      const serverResponse = await updateLine.mutateAsync(updatedLine);
      
      setLocalLines(currentLines =>
        currentLines.map(localLine => {
          if (localLine.id === serverResponse.id) {
            // Enhanced field protection: preserve all actively edited fields and localStorage backups
            const activeFields = activelyEditingFields[serverResponse.id];
            console.log(`[EditableEstimateLinesTable] Immediate sync - Server response for line ${serverResponse.id}, syncing field: ${String(field)}`);
            console.log(`[EditableEstimateLinesTable] Immediate sync - Active fields for line ${serverResponse.id}:`, activeFields);
            
            // Check for fields with localStorage backups (recent user edits)
            const fieldsWithBackups: string[] = [];
            ['description', 'part_type', 'operation_code', 'part_number', 'part_cost', 'quantity'].forEach(fieldName => {
              const backupValue = loadFromLocalStorage(serverResponse.id, fieldName as keyof EstimateLine);
              if (backupValue !== undefined) {
                fieldsWithBackups.push(fieldName);
              }
            });
            
            console.log(`[EditableEstimateLinesTable] Immediate sync - Fields with localStorage backups:`, fieldsWithBackups);
            
            if ((!activeFields || Object.keys(activeFields).length === 0) && fieldsWithBackups.length === 0) {
              // No active edits and no localStorage backups, safe to update only the specific field that was synced
              const updatedLine = { ...localLine };
              updatedLine[field] = serverResponse[field];
              console.log(`[EditableEstimateLinesTable] Immediate sync - No active edits or backups, updating field ${String(field)} with server value:`, serverResponse[field]);
              return updatedLine;
            }

            // Create updated line starting with local values to preserve active edits
            const updatedLine = { ...localLine };
            
            // Only update the field that was actually synced if it's not actively being edited
            if (!activeFields[String(field)]) {
              updatedLine[field] = serverResponse[field];
              console.log(`[EditableEstimateLinesTable] Updated synced field ${String(field)} with server value:`, serverResponse[field]);
            } else {
              console.log(`[EditableEstimateLinesTable] Preserving actively edited field ${String(field)} with local value:`, localLine[field]);
            }
            
            // Preserve ALL other actively edited fields with strong protection
            if (activeFields) {
              Object.keys(activeFields).forEach(fieldName => {
                if (activeFields[fieldName] && fieldName !== String(field)) {
                  // Keep the local value for other actively edited fields
                  console.log(`[EditableEstimateLinesTable] Immediate sync - Preserving actively edited field ${fieldName} for line ${serverResponse.id}`);
                  const localValue = localLine[fieldName as keyof EstimateLine];
                  updatedLine[fieldName as keyof EstimateLine] = localValue;
                  
                  // Additional protection: ensure the value is not null/undefined/empty if the local value exists
                  if (localValue !== null && localValue !== undefined && localValue !== '') {
                    updatedLine[fieldName as keyof EstimateLine] = localValue;
                  } else {
                    // If local value is unexpectedly empty, try to restore from backup
                    const backupValue = fieldBackups[serverResponse.id]?.[fieldName];
                    if (backupValue !== undefined && backupValue !== null && backupValue !== '') {
                      console.warn(`[EditableEstimateLinesTable] Immediate sync - Restoring field ${fieldName} from backup for line ${serverResponse.id}`);
                      updatedLine[fieldName as keyof EstimateLine] = backupValue;
                    }
                  }
                }
              });
            }
            
            // Also preserve fields with localStorage backups (recent user edits)
            fieldsWithBackups.forEach(fieldName => {
              if (fieldName !== String(field)) { // Don't override the field we just synced
                const backupValue = loadFromLocalStorage(serverResponse.id, fieldName as keyof EstimateLine);
                if (backupValue !== undefined) {
                  console.log(`[EditableEstimateLinesTable] Immediate sync - Preserving field ${fieldName} from localStorage backup for line ${serverResponse.id}:`, backupValue);
                  updatedLine[fieldName as keyof EstimateLine] = backupValue;
                }
              }
            });
            
            return updatedLine;
          }
          return localLine;
        })
      );

      setSyncingLines(prev => {
        const updated = { ...prev };
        delete updated[line.id];
        return updated;
      });

      useSyncStatusStore.getState().removeOperation(operationId);
      
      // Remove mutation tracking and field protection after successful sync
      removeOngoingMutation(line.id, field);
      setTimeout(() => {
        markFieldAsNotEditing(line.id, field);
        markFieldAsNotActivelyEditing(line.id, field);
        clearFieldBackup(line.id, field);
        clearFromLocalStorage(line.id, field);
        console.log(`[EditableEstimateLinesTable] Removed protection for ${String(field)} after successful sync for line ${line.id}`);
      }, 100); // Short delay to ensure all operations complete
    } catch (error: any) {
      console.error(`[EditableEstimateLinesTable] Immediate sync error for ${field}:`, error);
      
      setSyncingLines(prev => {
        const updated = { ...prev };
        delete updated[line.id];
        return updated;
      });

      // Revert field value
      const serverLine = serverLines.find(l => l.id === line.id);
      if (serverLine && serverLine[field] !== undefined) {
        setLocalLines(currentLines =>
          currentLines.map(l => l.id === line.id ? { ...l, [field]: serverLine[field] } : l)
        );
      }

      const errorMessage = error?.message || 'Unknown error';
      toast.error(`Failed to update ${String(field)}: ${errorMessage}`);
      useSyncStatusStore.getState().setError(errorMessage);
      useSyncStatusStore.getState().removeOperation(operationId);
      
      // Remove mutation tracking and field protection after error
      removeOngoingMutation(line.id, field);
      setTimeout(() => {
        markFieldAsNotEditing(line.id, field);
        markFieldAsNotActivelyEditing(line.id, field);
        clearFieldBackup(line.id, field);
        console.log(`[EditableEstimateLinesTable] Removed protection for ${String(field)} after error for line ${line.id}`);
      }, 500); // Longer delay after error to allow for potential retry
      
      throw error;
    }
  };

  // Combined function for updating fields using batched approach with editing session awareness
  const handleUpdateLineField = (line: EstimateLine, field: keyof EstimateLine, value: any) => {
    // Only update if the value has changed
    if (line[field] === value) return;

    // Record the field edit for session tracking
    recordFieldEdit(line.id, field);

    const sessionState = getSessionState();
    const delayMultiplier = getDelayMultiplier();
    
    console.log(`[EditableEstimateLinesTable] Handling batched update for line ${line.id}, field ${String(field)}, value:`, value);
    console.log(`[EditableEstimateLinesTable] Editing session active: ${sessionState.isActive}, delay multiplier: ${delayMultiplier.toFixed(2)}x`);

    // Update local state immediately for responsive UI (bypass protection for user inputs)
    updateLocalLine(line.id, field, value, true);

    // Add change to batch - delay will be dynamically adjusted based on editing session
    // Only proceed if rowBatch is properly initialized
    if (rowBatch?.addChange) {
      rowBatch.addChange(line, field, value);
      console.log(`[EditableEstimateLinesTable] Added ${field} change to batch for line ${line.id}`);
    } else {
      console.warn('[EditableEstimateLinesTable] rowBatch not initialized, using immediate save');
      // Fallback: Save immediately if batch is not available
      syncFieldImmediately(line, field, value);
    }
  };

  // Delete a line
  const handleDeleteLine = (lineId: string) => {
    if (confirm("Are you sure you want to delete this line?")) {
      // Generate a unique operation ID
      const operationId = `delete-line-${lineId}-${Date.now()}`;

      // Track the start of this sync operation in the global store
      useSyncStatusStore.getState().addOperation(operationId);

      console.log(`[EditableEstimateLinesTable] Deleting line ${lineId}`);

      // Mark line as syncing (for internal tracking only)
      setSyncingLines(prev => ({ ...prev, [lineId]: true }));

      // Update local state immediately (remove the line)
      const lineToDelete = localLines.find(line => line.id === lineId);
      if (lineToDelete) {
        // Store the line for potential restoration
        const deletedLine = { ...lineToDelete };

        // Remove from local state
        setLocalLines(currentLines => currentLines.filter(line => line.id !== lineId));

        // Send delete request to server
        deleteLine.mutate({ id: lineId }, {
          onSuccess: () => {
            console.log("[EditableEstimateLinesTable] Line deleted successfully");

            // Clear syncing state
            setSyncingLines(prev => {
              const updated = { ...prev };
              delete updated[lineId];
              return updated;
            });

            // No need to refetch as we've already updated local state

            // Track the completion of this sync operation
            useSyncStatusStore.getState().removeOperation(operationId);
          },
          onError: (error) => {
            console.error("[EditableEstimateLinesTable] Error deleting line:", error);

            // Clear syncing state
            setSyncingLines(prev => {
              const updated = { ...prev };
              delete updated[lineId];
              return updated;
            });

            // Restore the line in local state
            setLocalLines(currentLines => [...currentLines, deletedLine]);

            // Enhanced error handling
            const errorMessage = error?.message || 'Unknown error';
            if (errorMessage.includes("not_found")) {
              toast.error("Line not found. It may have been deleted already.");
            } else if (errorMessage.includes("permission")) {
              toast.error("You don't have permission to delete this line.");
            } else {
              toast.error(`Failed to delete line: ${errorMessage}`);
            }

            // Track the error in the global store
            useSyncStatusStore.getState().setError(errorMessage);

            // Track the completion of this sync operation (even though it failed)
            useSyncStatusStore.getState().removeOperation(operationId);
          }
        });
      }
    }
  };

  // Helper function to mark a field as being edited
  const markFieldAsEditing = (lineId: string, field: keyof EstimateLine) => {
    setEditingFields(prev => {
      const lineFields = prev[lineId] || {};
      return {
        ...prev,
        [lineId]: {
          ...lineFields,
          [field as string]: true
        }
      };
    });
    
    // Record editing activity for session management
    recordFieldEdit(lineId, field);
    
    // Mark field as actively being edited for protection against server overwrites
    markFieldAsActivelyEditing(lineId, field);
    
    // Store the original value when starting to edit and create backup
    const line = localLines.find(l => l.id === lineId);
    if (line) {
      const currentValue = line[field];
      
      // Create backup of current value for additional protection
      backupFieldValue(lineId, field, currentValue);
      
      setOriginalValues(prev => {
        const lineValues = prev[lineId] || {};
        return {
          ...prev,
          [lineId]: {
            ...lineValues,
            [field as string]: line[field]
          }
        };
      });
    }
  };

  // Helper function to mark a field as no longer being edited
  const markFieldAsNotEditing = (lineId: string, field: keyof EstimateLine) => {
    setEditingFields(prev => {
      const lineFields = prev[lineId] || {};
      const updatedFields = { ...lineFields };
      delete updatedFields[field as string];
      return {
        ...prev,
        [lineId]: updatedFields
      };
    });
    
    // Remove active editing protection after an extended delay to ensure field stability
    setTimeout(() => {
      markFieldAsNotActivelyEditing(lineId, field);
      // Clear field backup after protection period
      clearFieldBackup(lineId, field);
    }, 2000); // 2000ms delay to allow multiple operations and provide stronger protection
    
    // Clear the original value since we're done editing
    setOriginalValues(prev => {
      const lineValues = prev[lineId] || {};
      const updatedValues = { ...lineValues };
      delete updatedValues[field as string];
      return {
        ...prev,
        [lineId]: updatedValues
      };
    });
  };

  // Helper function to mark a field as showing raw value
  const markFieldAsShowingRaw = (lineId: string, field: keyof EstimateLine) => {
    setShowingRawValues(prev => {
      const lineFields = prev[lineId] || {};
      return {
        ...prev,
        [lineId]: {
          ...lineFields,
          [field as string]: true
        }
      };
    });
  };

  // Helper function to mark a field as no longer showing raw value
  const markFieldAsNotShowingRaw = (lineId: string, field: keyof EstimateLine) => {
    setShowingRawValues(prev => {
      const lineFields = prev[lineId] || {};
      const updatedFields = { ...lineFields };
      delete updatedFields[field as string];
      return {
        ...prev,
        [lineId]: updatedFields
      };
    });
  };

  // Define the order of editable fields for keyboard navigation
  const EDITABLE_FIELDS: (keyof EstimateLine)[] = [
    'operation_code', 'description', 'part_type', 'part_number',
    'part_cost', 'quantity', 'strip_fit_hours', 'repair_hours',
    'paint_hours', 'sublet_cost'
  ];

  // Focus a specific cell
  const focusCell = (rowId: string, field: keyof EstimateLine) => {
    // Set focused cell
    setFocusedCell({ rowId, field });

    // Focus the actual DOM element (with a small delay to ensure the element exists)
    setTimeout(() => {
      const inputElement = document.querySelector(`input[name="${field}-${rowId}"]`) as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
        // Select all text for easier editing
        inputElement.select();
      } else {
        // Try to find and click the select trigger for dropdown fields
        const selectTrigger = document.querySelector(`[data-field="${field}-${rowId}"]`) as HTMLElement;
        if (selectTrigger) {
          selectTrigger.focus();
          selectTrigger.click();
        }
      }
    }, 10);
  };

  // Revert a field to its original value (for Escape key)
  const revertFieldValue = (lineId: string, field: keyof EstimateLine) => {
    const originalValue = originalValues[lineId]?.[field as string];
    if (originalValue !== undefined) {
      // Update local state to original value (bypass protection for user reverts)
      updateLocalLine(lineId, field, originalValue, true);
      
      // Update the input element directly
      const inputElement = document.querySelector(`input[name="${field}-${lineId}"]`) as HTMLInputElement;
      if (inputElement) {
        if (typeof originalValue === 'number') {
          inputElement.value = originalValue.toString();
          inputElement.dataset.rawValue = originalValue.toString();
        } else {
          inputElement.value = originalValue || '';
        }
      }
      
      // Clear the editing state and active editing protection
      markFieldAsNotEditing(lineId, field);
      markFieldAsNotShowingRaw(lineId, field);
      markFieldAsNotActivelyEditing(lineId, field);
      
      console.log(`[EditableEstimateLinesTable] Reverted ${field} for line ${lineId} to:`, originalValue);
    }
  };

  // Navigate to the next/previous cell horizontally
  const navigateHorizontally = (currentRowIndex: number, currentFieldIndex: number, forward: boolean) => {
    let nextFieldIndex = forward ? currentFieldIndex + 1 : currentFieldIndex - 1;

    // Handle wrapping around to previous/next row
    if (nextFieldIndex < 0) {
      // If at the first field, go to the last field of the previous row
      if (currentRowIndex > 0) {
        const prevRowIndex = currentRowIndex - 1;
        const prevRowId = localLines[prevRowIndex].id;
        const lastField = EDITABLE_FIELDS[EDITABLE_FIELDS.length - 1];
        focusCell(prevRowId, lastField);
      }
      return;
    }

    if (nextFieldIndex >= EDITABLE_FIELDS.length) {
      // If at the last field, go to the first field of the next row
      if (currentRowIndex < localLines.length - 1) {
        const nextRowIndex = currentRowIndex + 1;
        const nextRowId = localLines[nextRowIndex].id;
        const firstField = EDITABLE_FIELDS[0];
        focusCell(nextRowId, firstField);
      }
      return;
    }

    // Focus the next cell in the same row
    const nextField = EDITABLE_FIELDS[nextFieldIndex];
    const rowId = localLines[currentRowIndex].id;
    focusCell(rowId, nextField);
  };

  // Navigate to the next/previous row vertically
  const navigateVertically = (currentRowIndex: number, currentFieldIndex: number, forward: boolean) => {
    let nextRowIndex = forward ? currentRowIndex + 1 : currentRowIndex - 1;

    // Handle bounds checking
    if (nextRowIndex < 0 || nextRowIndex >= localLines.length) {
      return; // Don't navigate past the first/last row
    }

    // Focus the same field in the next/previous row
    const field = EDITABLE_FIELDS[currentFieldIndex];
    const rowId = localLines[nextRowIndex].id;
    focusCell(rowId, field);
  };

  // Check if cursor is at the start or end of input for arrow key navigation
  const shouldNavigateOnArrow = (element: HTMLElement, direction: 'left' | 'right'): boolean => {
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      const input = element as HTMLInputElement | HTMLTextAreaElement;
      if (direction === 'left') {
        return input.selectionStart === 0;
      } else {
        return input.selectionEnd === input.value.length;
      }
    }
    return true; // Always navigate for select elements
  };

  // Handle keyboard navigation
  const handleKeyDown = (
    e: React.KeyboardEvent,
    line: EstimateLine,
    field: keyof EstimateLine
  ) => {
    // Find the current row and field indices
    const rowIndex = localLines.findIndex(l => l.id === line.id);
    const fieldIndex = EDITABLE_FIELDS.indexOf(field);

    // Skip if we couldn't find the indices
    if (rowIndex === -1 || fieldIndex === -1) return;

    switch (e.key) {
      case 'Tab':
        // Prevent default tab behavior
        e.preventDefault();
        // Commit current value before navigating
        if (editingFields[line.id]?.[field as string]) {
          const inputElement = e.currentTarget as HTMLInputElement;
          const isNumberField = ['part_cost', 'quantity', 'strip_fit_hours', 'repair_hours', 'paint_hours', 'sublet_cost'].includes(field as string);
          if (isNumberField) {
            // Handle number fields
            const rawValue = inputElement.dataset.rawValue || inputElement.value;
            if (rawValue && rawValue.trim() !== '') {
              const parsedValue = parseNumberInput(rawValue);
              handleUpdateLineField(line, field, parsedValue);
            }
          } else {
            // Handle text fields
            handleUpdateLineField(line, field, inputElement.value);
          }
        }
        // Navigate to the next/previous cell
        navigateHorizontally(rowIndex, fieldIndex, !e.shiftKey);
        break;
      case 'ArrowRight':
        // Only navigate if at the end of the input or if it's a select
        if (field === 'operation_code' || field === 'part_type' ||
            shouldNavigateOnArrow(e.currentTarget as HTMLElement, 'right')) {
          e.preventDefault();
          navigateHorizontally(rowIndex, fieldIndex, true);
        }
        break;
      case 'ArrowLeft':
        // Only navigate if at the beginning of the input or if it's a select
        if (field === 'operation_code' || field === 'part_type' ||
            shouldNavigateOnArrow(e.currentTarget as HTMLElement, 'left')) {
          e.preventDefault();
          navigateHorizontally(rowIndex, fieldIndex, false);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        navigateVertically(rowIndex, fieldIndex, true);
        break;
      case 'ArrowUp':
        e.preventDefault();
        navigateVertically(rowIndex, fieldIndex, false);
        break;
      case 'Enter':
        e.preventDefault();
        // Commit current value before navigating
        if (editingFields[line.id]?.[field as string]) {
          const inputElement = e.currentTarget as HTMLInputElement;
          const isNumberField = ['part_cost', 'quantity', 'strip_fit_hours', 'repair_hours', 'paint_hours', 'sublet_cost'].includes(field as string);
          if (isNumberField) {
            // Handle number fields
            const rawValue = inputElement.dataset.rawValue || inputElement.value;
            if (rawValue && rawValue.trim() !== '') {
              const parsedValue = parseNumberInput(rawValue);
              handleUpdateLineField(line, field, parsedValue);
            }
          } else {
            // Handle text fields
            handleUpdateLineField(line, field, inputElement.value);
          }
        }
        // Move to the cell below
        navigateVertically(rowIndex, fieldIndex, true);
        break;
      case 'Escape':
        e.preventDefault();
        // Revert the current field to its original value
        revertFieldValue(line.id, field);
        break;
    }
  };

  // Parse number input handling both comma and period as decimal separators
  const parseNumberInput = (input: string): number => {
    if (!input || typeof input !== 'string') return 0;

    try {
      // Log the original input for debugging
      console.log(`[EditableEstimateLinesTable] Parsing number input: "${input}"`);

      // Replace commas with periods for parsing
      const normalized = input.replace(/,/g, '.');

      // Remove all non-numeric characters except the decimal point and minus sign
      const cleaned = normalized.replace(/[^0-9.\-]/g, '');

      // Ensure only one decimal point
      const parts = cleaned.split('.');
      const result = parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('') : '');

      // Parse the result
      const parsedValue = result ? parseFloat(result) : 0;

      // Check for valid number
      if (isNaN(parsedValue)) {
        console.warn(`[EditableEstimateLinesTable] Invalid number parsed from: "${input}"`);
        return 0;
      }

      // Log the parsed value for debugging
      console.log(`[EditableEstimateLinesTable] Parsed value: ${parsedValue}`);

      return parsedValue;
    } catch (error) {
      console.error(`[EditableEstimateLinesTable] Error parsing number input: "${input}"`, error);
      return 0;
    }
  };

  // Format number as plain decimal without locale formatting
  const formatNumber = (value: number | null | undefined, decimals = 2): string => {
    if (value === null || value === undefined) return "";

    // Always return plain number with decimal places, no locale formatting
    return value.toFixed(decimals);
  };

  // Render an editable cell - all cells are now directly editable
  const renderEditableCell = (
    line: EstimateLine,
    field: keyof EstimateLine,
    type: "text" | "number" | "select" = "text",
    options?: { value: string; label: string }[]
  ) => {
    // Safety check for line data
    if (!line || !line.id) {
      console.warn('[EditableEstimateLinesTable] Invalid line data in renderEditableCell:', line);
      return <div className="h-8 w-full bg-gray-100 rounded" />;
    }

    try {
    // Get the line from local state to ensure we're showing the most up-to-date value
    const localLine = localLines.find(l => l.id === line.id) || line;
    const value = localLine[field];
    const isLoading = syncingLines[line.id];

    // Check if field should be disabled (removed row activation requirement)
    const isDisabled = isLoading ||
      (field === "part_cost" && !canEditPartCost(localLine));

    // Check if this cell is the focused cell
    const isFocused = focusedCell?.rowId === line.id && focusedCell?.field === field;

    // For select fields (dropdowns)
    if (type === "select" && options) {
      // Get the short display version for the UI
      let displayOptions = options;
      let selectOptions = options;

      // Use short versions for display if available
      if (field === "operation_code" && options === OPERATION_CODES) {
        displayOptions = OPERATION_CODES_SHORT;
      } else if (field === "part_type" && options === PART_TYPE_OPTIONS) {
        displayOptions = PART_TYPE_OPTIONS_SHORT;
      }

      // Always show as a dropdown for better UX
      return (
        <Select
          value={value as string}
          onOpenChange={(open) => {
            if (open) {
              // Mark field as being edited when dropdown opens
              markFieldAsEditing(line.id, field);
              // Set as focused cell
              setFocusedCell({ rowId: line.id, field });
            } else {
              // DO NOT immediately remove editing protection when dropdown closes
              // Protection will be removed after sync completes or timeout expires
              console.log(`[EditableEstimateLinesTable] Dropdown closed for ${field}, keeping protection active`);
            }
          }}
          onValueChange={async (newValue) => {
            // Log the change for debugging
            console.log(`[EditableEstimateLinesTable] Dropdown value changed for ${field}:`, newValue);

            // Only update if the value has changed
            if (value !== newValue) {
              // Update local state immediately (bypass protection for user inputs)
              updateLocalLine(line.id, field, newValue, true);

              // Handle operation_code changes immediately as they may affect business logic
              if (field === 'operation_code') {
                try {
                  await syncFieldImmediately(line, field, newValue);
                } catch (error) {
                  // Error handling is already done in syncFieldImmediately
                }
              } else {
                // Use batched approach for other select fields
                // Only proceed if rowBatch is properly initialized
                if (rowBatch?.addChange) {
                  rowBatch.addChange(line, field, newValue);
                } else {
                  console.warn('[EditableEstimateLinesTable] rowBatch not initialized, using immediate sync');
                  try {
                    await syncFieldImmediately(line, field, newValue);
                  } catch (error) {
                    // Error handling is already done in syncFieldImmediately
                  }
                }
              }
            }
          }}
          disabled={isDisabled}
        >
          <SelectTrigger
            className={`h-8 w-full ${isLoading ? 'opacity-50' : ''} ${isFocused ? 'ring-2 ring-blue-500 ring-offset-1 bg-blue-50' : ''}`}
            data-field={`${field}-${line.id}`}
            onKeyDown={(e) => handleKeyDown(e, line, field)}
          >
            <SelectValue placeholder="Select">
              {displayOptions.find(opt => opt.value === value)?.label || "Select"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {selectOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // For number fields
    if (type === "number") {
      // Check if this field is showing raw value
      const isShowingRaw = showingRawValues[line.id]?.[field as string];

      // Get the raw value directly from the input element if it exists
      const inputElement = document.querySelector(`input[name="${field}-${line.id}"]`) as HTMLInputElement;
      const rawInputValue = inputElement?.dataset?.rawValue;

      // Determine display value based on different states
      let displayValue = "";

      if (isShowingRaw && rawInputValue) {
        // If we're editing and have a raw input value, show that directly
        displayValue = rawInputValue;
      } else if (isShowingRaw && typeof value === 'number') {
        // If we're editing but don't have a raw input value yet, show the unformatted number
        displayValue = value.toString();
      } else if (typeof value === 'number') {
        // Otherwise show the formatted value
        displayValue = formatNumber(value);
      } else {
        // Fallback for empty/null values
        displayValue = value || "";
      }

      return (
        <Input
          type="text" // Use text type to allow for better formatting control
          name={`${field}-${line.id}`} // Add name attribute for selection
          value={displayValue}
          onFocus={(e) => {
            // Mark field as being edited
            markFieldAsEditing(line.id, field);
            // Show raw value during editing
            markFieldAsShowingRaw(line.id, field);
            // Set as focused cell
            setFocusedCell({ rowId: line.id, field });

            // If it's a formatted number, convert to raw number for editing
            if (typeof value === 'number') {
              // Store the raw value in the dataset
              e.target.dataset.rawValue = value.toString();
              // Set the input value to the raw number
              e.target.value = value.toString();
            }

            // Select all text for easier editing
            e.target.select();
          }}
          onChange={(e) => {
            // Get the raw input value
            const rawValue = e.target.value;

            // Allow numeric input, decimal separators, and negative signs
            if (/^-?[0-9]*[.,]?[0-9]*$/.test(rawValue)) {
              // Store the raw string in a data attribute for reference
              e.target.dataset.rawValue = rawValue;

              // Only update local state if the value is not empty
              if (rawValue) {
                // Parse the number using our helper
                const parsedValue = parseNumberInput(rawValue);

                // Update local state with parsed value (bypass protection for user inputs)
                updateLocalLine(line.id, field, parsedValue, true);
              }
            }
          }}
          onBlur={(e) => {
            // Mark field as no longer being edited
            markFieldAsNotEditing(line.id, field);
            // Stop showing raw value
            markFieldAsNotShowingRaw(line.id, field);

            // Get the raw input value
            const rawValue = e.target.dataset.rawValue || e.target.value;

            // Only process if we have a value
            if (rawValue && rawValue.trim() !== '') {
              // Parse the number
              const parsedValue = parseNumberInput(rawValue);

              // Log the exact value being sent to the server
              console.log(`[EditableEstimateLinesTable] Sending value to server for ${field}:`, parsedValue);

              // Sync with server
              handleUpdateLineField(line, field, parsedValue);
            }
          }}
          onKeyDown={(e) => handleKeyDown(e, line, field)}
          className={`h-8 w-full text-right ${isLoading ? 'opacity-50' : ''} ${isFocused ? 'ring-2 ring-blue-500 ring-offset-1 bg-blue-50' : ''}`}
          disabled={isDisabled}
          // Remove increment/decrement arrows
          style={{ appearance: 'textfield' }}
        />
      );
    }

    // For text fields
    return (
      <Input
        type="text"
        name={`${field}-${line.id}`} // Add name attribute for selection
        value={value as string || ""}
        onFocus={(e) => {
          // Mark field as being edited
          markFieldAsEditing(line.id, field);
          // Set as focused cell
          setFocusedCell({ rowId: line.id, field });
          // Select all text for easier editing
          e.target.select();
        }}
        onChange={(e) => {
          // Update local state immediately for responsive feel (bypass protection for user inputs)
          updateLocalLine(line.id, field, e.target.value, true);
        }}
        onBlur={(e) => {
          // Mark field as no longer being edited
          markFieldAsNotEditing(line.id, field);

          // Sync with server when focus is lost
          handleUpdateLineField(line, field, e.target.value);
        }}
        onKeyDown={(e) => handleKeyDown(e, line, field)}
        className={`h-8 w-full ${isLoading ? 'opacity-50' : ''} ${isFocused ? 'ring-2 ring-blue-500 ring-offset-1 bg-blue-50' : ''}`}
        disabled={isDisabled}
      />
    );
    } catch (error) {
      console.error('[EditableEstimateLinesTable] Error rendering editable cell:', error, { line, field, type });
      return (
        <div className="h-8 w-full bg-red-100 border border-red-300 rounded flex items-center justify-center">
          <span className="text-xs text-red-600">Error</span>
        </div>
      );
    }
  };

  // We no longer need the renderNewLineCell function since we're creating lines directly in the database

  if (isLoading || !isInitialized) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <span>{isLoading ? 'Loading estimate lines...' : 'Initializing component...'}</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={handleAddLine} disabled={addLine.isPending || !isInitialized}>
            <Plus className="mr-2 h-4 w-4" />
            {addLine.isPending ? "Adding..." : "Add Line"}
          </Button>
          
          {/* Editing session status indicator */}
          {isEditingSessionActive() && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Active editing - sync paused</span>
              <span className="text-xs text-blue-600">({getDelayMultiplier().toFixed(1)}x delay)</span>
            </div>
          )}
        </div>
        
        {/* Keyboard navigation help */}
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Navigation:</span> Tab/Shift+Tab: Next/Previous | Enter: Down | Arrows: Navigate | Esc: Revert
        </div>
      </div>

      <div className="relative">
        {/* Visual feedback overlay during resize */}
        {isResizing && (
          <div className="absolute inset-0 bg-blue-500/10 pointer-events-none z-10 transition-opacity duration-150" />
        )}
        
        <Table className={isResizing ? 'resizing-table' : ''}>
          <TableHeader>
            <TableRow>
              {COLUMN_DEFINITIONS.map((column, index) => (
                <TableHead
                  key={column.key}
                  className="relative select-none"
                  style={{ 
                    width: getColumnWidth(column.key),
                    minWidth: getColumnWidth(column.key),
                    maxWidth: getColumnWidth(column.key),
                  }}
                >
                  <div className="flex items-center justify-between pr-2">
                    <span className="truncate">{column.label}</span>
                    
                    {/* Resize handle - only show if not the last column */}
                    {index < COLUMN_DEFINITIONS.length - 1 && (
                      <div
                        {...getResizeHandleProps(column.key)}
                        className={`
                          absolute right-0 top-0 bottom-0 w-1 
                          hover:bg-blue-500 hover:w-1.5 
                          transition-all duration-150 
                          cursor-col-resize 
                          group
                          ${resizingColumn === column.key ? 'bg-blue-500 w-1.5' : 'bg-transparent'}
                        `}
                        title={`Resize ${column.label} column (double-click to auto-size)`}
                      >
                        {/* Visual indicator on hover */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical className="h-3 w-3 text-blue-500 -translate-x-1/2" />
                        </div>
                      </div>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {!localLines || localLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMN_DEFINITIONS.length} className="text-center py-4">
                  No estimate lines added yet. Click "Add Line" to add a new line.
                </TableCell>
              </TableRow>
            ) : (
              localLines.filter(line => line && line.id).map((line) => {
                const isLoading = syncingLines[line.id];

                // Render a loading indicator if the line is being synced
                const renderSyncIndicator = () => {
                  if (isLoading) {
                    return <div className="ml-2 h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>;
                  }
                  return null;
                };

                // Create cells based on column definitions
                const cells = [
                  <TableCell key="sequence" style={{ width: getColumnWidth('sequence') }}>
                    {line.sequence_number}
                  </TableCell>,
                  <TableCell key="operation" style={{ width: getColumnWidth('operation') }}>
                    <div className="flex items-center">
                      {renderEditableCell(line, "operation_code", "select", OPERATION_CODES)}
                    </div>
                  </TableCell>,
                  <TableCell key="description" style={{ width: getColumnWidth('description') }}>
                    <div className="flex items-center">
                      {renderEditableCell(line, "description")}
                    </div>
                  </TableCell>,
                  <TableCell key="type" style={{ width: getColumnWidth('type') }}>
                    <div className="flex items-center">
                      {renderEditableCell(line, "part_type", "select", PART_TYPE_OPTIONS)}
                    </div>
                  </TableCell>,
                  <TableCell key="part_number" style={{ width: getColumnWidth('part_number') }}>
                    <div className="flex items-center">
                      {renderEditableCell(line, "part_number")}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          handleEditPartNumber(line);
                        }}
                        disabled={isLoading}
                        className="ml-1 h-6 w-6 flex-shrink-0"
                      >
                        <FileText className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>,
                  <TableCell key="part_cost" style={{ width: getColumnWidth('part_cost') }}>
                    <div className="flex items-center">
                      {canEditPartCost(line) ?
                        renderEditableCell(line, "part_cost", "number") :
                        <span className="text-muted-foreground text-sm">N/A</span>
                      }
                    </div>
                  </TableCell>,
                  <TableCell key="quantity" style={{ width: getColumnWidth('quantity') }}>
                    <div className="flex items-center">
                      {renderEditableCell(line, "quantity", "number")}
                    </div>
                  </TableCell>,
                  <TableCell key="strip_fit" style={{ width: getColumnWidth('strip_fit') }}>
                    <div className="flex items-center">
                      {renderEditableCell(line, "strip_fit_hours", "number")}
                    </div>
                  </TableCell>,
                  <TableCell key="labor" style={{ width: getColumnWidth('labor') }}>
                    <div className="flex items-center">
                      {renderEditableCell(line, "repair_hours", "number")}
                    </div>
                  </TableCell>,
                  <TableCell key="paint" style={{ width: getColumnWidth('paint') }}>
                    <div className="flex items-center">
                      {renderEditableCell(line, "paint_hours", "number")}
                    </div>
                  </TableCell>,
                  <TableCell key="specialist" style={{ width: getColumnWidth('specialist') }}>
                    <div className="flex items-center">
                      {renderEditableCell(line, "sublet_cost", "number")}
                    </div>
                  </TableCell>,
                  <TableCell key="status" style={{ width: getColumnWidth('status') }}>
                    <div className="flex items-center justify-between">
                      {isLoading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            handleDeleteLine(line.id);
                          }}
                          disabled={isLoading}
                          className="h-6 w-6"
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>,
                ];

                return (
                  <TableRow
                    key={line.id}
                    className={`${isLoading ? 'opacity-70' : ''}`}
                  >
                    {cells}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Column management controls */}
      <div className="mt-4 flex gap-2 text-sm text-muted-foreground">
        <Button
          variant="outline"
          size="sm"
          onClick={resetColumnWidths}
          disabled={isResizing}
        >
          Reset Column Widths
        </Button>
        <span className="flex items-center">
          Tip: Drag column dividers to resize, double-click to auto-size
        </span>
      </div>
    </div>
  );
}
