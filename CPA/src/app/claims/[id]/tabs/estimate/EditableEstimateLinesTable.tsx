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
import { Plus, Save, X, Trash, Edit, FileText } from "lucide-react";
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

interface EditableEstimateLinesTableProps {
  estimate: Estimate;
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

export function EditableEstimateLinesTable({ estimate }: EditableEstimateLinesTableProps) {
  console.log("[EditableEstimateLinesTable] Rendering with estimate:", estimate);

  const {
    data: serverLines = [],
    isLoading,
    isError,
    error,
    refetch
  } = useEstimateLines(estimate.id);

  // Local state for immediate UI updates
  const [localLines, setLocalLines] = useState<EstimateLine[]>([]);

  // Track which lines are being synced with the server
  const [syncingLines, setSyncingLines] = useState<Record<string, boolean>>({});

  // Initialize local state from server data when it changes
  useEffect(() => {
    if (serverLines && !isLoading) {
      console.log("[EditableEstimateLinesTable] Updating local lines from server data");
      setLocalLines(serverLines);
    }
  }, [serverLines, isLoading]);

  console.log("[EditableEstimateLinesTable] Server lines data:", serverLines);
  console.log("[EditableEstimateLinesTable] Local lines data:", localLines);
  console.log("[EditableEstimateLinesTable] isLoading:", isLoading);
  console.log("[EditableEstimateLinesTable] isError:", isError);
  if (isError) {
    console.error("[EditableEstimateLinesTable] Error:", error);
  }

  // Force refetch when component mounts
  useEffect(() => {
    console.log("[EditableEstimateLinesTable] Component mounted, refetching lines");
    refetch();
  }, [estimate.id, refetch]);

  const addLine = useAddEstimateLine();
  const updateLine = useUpdateEstimateLine();
  const deleteLine = useDeleteEstimateLine();

  // Track which row is currently being edited
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  // Track which fields are currently being edited
  const [editingFields, setEditingFields] = useState<Record<string, Record<string, boolean>>>({});

  // Track which fields are showing raw values (unformatted)
  const [showingRawValues, setShowingRawValues] = useState<Record<string, Record<string, boolean>>>({});

  // Track the currently focused cell for keyboard navigation
  const [focusedCell, setFocusedCell] = useState<{
    rowId: string;
    field: keyof EstimateLine;
  } | null>(null);

  // Handle row click to activate editing for that row
  const handleRowClick = (lineId: string) => {
    // If clicking on the same row, do nothing
    if (activeRowId === lineId) return;

    // If there was a previously active row, save any pending changes
    if (activeRowId) {
      // Clear any editing fields for the previous row
      setEditingFields(prev => {
        const updated = { ...prev };
        delete updated[activeRowId];
        return updated;
      });

      // Clear any raw value display states
      setShowingRawValues(prev => {
        const updated = { ...prev };
        delete updated[activeRowId];
        return updated;
      });

      // Clear focused cell
      setFocusedCell(null);

      // No explicit save needed as changes are saved on blur
      setActiveRowId(null);

      // Small delay before activating the new row to ensure previous changes are saved
      setTimeout(() => {
        setActiveRowId(lineId);

        // Focus the first editable field in the row
        if (EDITABLE_FIELDS.length > 0) {
          focusCell(lineId, EDITABLE_FIELDS[0]);
        }
      }, 50);
    } else {
      setActiveRowId(lineId);

      // Focus the first editable field in the row
      if (EDITABLE_FIELDS.length > 0) {
        focusCell(lineId, EDITABLE_FIELDS[0]);
      }
    }
  };

  // Add click outside handler to save changes when clicking outside the table
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside the table
      const table = document.querySelector('table');
      if (table && !table.contains(event.target as Node) && activeRowId) {
        // Clear any editing fields
        setEditingFields({});
        // Clear any raw value display states
        setShowingRawValues({});
        // Clear focused cell
        setFocusedCell(null);
        setActiveRowId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeRowId]);

  // Get the next sequence number for a new line
  const getNextSequenceNumber = () => {
    if (localLines.length === 0) return 1;
    return Math.max(...localLines.map(line => line.sequence_number)) + 1;
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

  // Immediately create a new line when "Add Line" is clicked
  const handleAddLine = () => {
    // Generate a unique operation ID
    const operationId = `add-line-${Date.now()}`;

    // Track the start of this sync operation in the global store
    useSyncStatusStore.getState().addOperation(operationId);

    console.log("[EditableEstimateLinesTable] Adding new line for estimate:", estimate.id);

    const nextSequenceNumber = getNextSequenceNumber();
    console.log("[EditableEstimateLinesTable] Next sequence number:", nextSequenceNumber);

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

    // Create a temporary line for local state
    const tempId = `temp-${Date.now()}`;
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

    // Add to local state immediately
    setLocalLines(currentLines => [...currentLines, tempLine]);

    // Send to server
    addLine.mutate(newLine, {
      onSuccess: (createdLine) => {
        console.log("[EditableEstimateLinesTable] Line created successfully:", createdLine);

        // Clear syncing state
        setSyncingLines(prev => {
          const updated = { ...prev };
          delete updated.new;
          return updated;
        });

        // Replace temp line with real line in local state
        setLocalLines(currentLines =>
          currentLines.map(line =>
            line.id === tempId ? createdLine : line
          )
        );

        // Automatically put the new line in edit mode
        setActiveRowId(createdLine.id);

        // Track the completion of this sync operation
        useSyncStatusStore.getState().removeOperation(operationId);
      },
      onError: (error) => {
        console.error("[EditableEstimateLinesTable] Error creating line:", error);

        // Clear syncing state
        setSyncingLines(prev => {
          const updated = { ...prev };
          delete updated.new;
          return updated;
        });

        // Remove temp line from local state
        setLocalLines(currentLines =>
          currentLines.filter(line => line.id !== tempId)
        );

        // Enhanced error handling for validation errors
        if (error.message.includes("too_small") || error.message.includes("required")) {
          // This is likely a validation error
          try {
            const validationErrors = JSON.parse(error.message);
            const errorMessages = validationErrors.map((err: any) =>
              `${err.path.join('.')}: ${err.message}`
            ).join(', ');

            toast.error(`Validation error: ${errorMessages}`);
          } catch (e) {
            // If we can't parse the error message, just show the original error
            toast.error(`Failed to create line: ${error.message}`);
          }
        } else {
          // For other types of errors
          toast.error(`Failed to create line: ${error.message}`);
        }

        // Track the error in the global store
        useSyncStatusStore.getState().setError(error.message);

        // Track the completion of this sync operation (even though it failed)
        useSyncStatusStore.getState().removeOperation(operationId);
      }
    });
  };

  // Function to update local state immediately
  const updateLocalLine = (lineId: string, field: keyof EstimateLine, value: any) => {
    console.log(`[EditableEstimateLinesTable] Updating local line ${lineId}, field ${String(field)}, value:`, value);

    setLocalLines(currentLines =>
      currentLines.map(line =>
        line.id === lineId ? { ...line, [field]: value } : line
      )
    );
  };

  // Function to sync with server
  const syncLineWithServer = (line: EstimateLine, field: keyof EstimateLine, value: any) => {
    // Generate a unique operation ID
    const operationId = `sync-${line.id}-${field}-${Date.now()}`;

    // Track the start of this sync operation in the global store
    useSyncStatusStore.getState().addOperation(operationId);

    // Mark line as syncing (for internal tracking only)
    setSyncingLines(prev => ({ ...prev, [line.id]: true }));

    console.log(`[EditableEstimateLinesTable] Syncing line ${line.id}, field ${String(field)}, value:`, value);

    // Get the current local state of the line before sending the update
    const currentLocalLine = localLines.find(l => l.id === line.id);
    if (!currentLocalLine) {
      console.error(`[EditableEstimateLinesTable] Cannot find local line with id ${line.id}`);
      // Track the completion of this sync operation (even though it failed)
      useSyncStatusStore.getState().removeOperation(operationId);
      return;
    }

    // Prepare update data - only send the specific field being updated
    const updatedLine: EstimateLineUpdate = {
      id: line.id,
      estimate_id: line.estimate_id,
      [field]: value
    };

    // Send update to server
    updateLine.mutate(updatedLine, {
      onSuccess: (serverResponse) => {
        console.log("[EditableEstimateLinesTable] Line updated successfully:", serverResponse);

        // Clear syncing state
        setSyncingLines(prev => {
          const updated = { ...prev };
          delete updated[line.id];
          return updated;
        });

        // IMPORTANT: We only update the specific field that was changed
        // This preserves all other local changes that haven't been synced yet
        setLocalLines(currentLines =>
          currentLines.map(localLine => {
            if (localLine.id === serverResponse.id) {
              // Create a new line object with the current local state
              const newLine = { ...localLine };

              // Only update the specific field that was just synced
              // This is the key change to prevent data loss between fields
              newLine[field] = serverResponse[field];

              return newLine;
            }
            return localLine;
          })
        );

        // Track the completion of this sync operation
        useSyncStatusStore.getState().removeOperation(operationId);
      },
      onError: (error) => {
        console.error("[EditableEstimateLinesTable] Error updating line:", error);

        // Clear syncing state
        setSyncingLines(prev => {
          const updated = { ...prev };
          delete updated[line.id];
          return updated;
        });

        // Revert local state to server state for this field
        const serverLine = serverLines.find(l => l.id === line.id);
        if (serverLine) {
          setLocalLines(currentLines =>
            currentLines.map(l =>
              l.id === line.id ? { ...l, [field]: serverLine[field] } : l
            )
          );
        }

        // Enhanced error handling for validation errors
        if (error.message.includes("too_small") || error.message.includes("required")) {
          // This is likely a validation error
          try {
            const validationErrors = JSON.parse(error.message);
            const errorMessages = validationErrors.map((err: any) =>
              `${err.path.join('.')}: ${err.message}`
            ).join(', ');

            toast.error(`Validation error: ${errorMessages}`);
          } catch (e) {
            // If we can't parse the error message, just show the original error
            toast.error(`Failed to update line: ${error.message}`);
          }
        } else {
          // For other types of errors
          toast.error(`Failed to update line: ${error.message}`);
        }

        // Track the error in the global store
        useSyncStatusStore.getState().setError(error.message);

        // Track the completion of this sync operation (even though it failed)
        useSyncStatusStore.getState().removeOperation(operationId);
      }
    });
  };

  // Combined function for updating fields
  const handleUpdateLineField = (line: EstimateLine, field: keyof EstimateLine, value: any) => {
    // Only update if the value has changed
    if (line[field] === value) return;

    console.log(`[EditableEstimateLinesTable] Handling update for line ${line.id}, field ${String(field)}, value:`, value);

    // Update local state immediately
    updateLocalLine(line.id, field, value);

    // Sync with server in the background
    syncLineWithServer(line, field, value);
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
            if (error.message.includes("not_found")) {
              toast.error("Line not found. It may have been deleted already.");
            } else if (error.message.includes("permission")) {
              toast.error("You don't have permission to delete this line.");
            } else {
              toast.error(`Failed to delete line: ${error.message}`);
            }

            // Track the error in the global store
            useSyncStatusStore.getState().setError(error.message);

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
    // Set active row
    setActiveRowId(rowId);

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
          selectTrigger.click();
        }
      }
    }, 10);
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
        // Navigate to the next/previous cell
        navigateHorizontally(rowIndex, fieldIndex, !e.shiftKey);
        break;
      case 'ArrowRight':
        // Only navigate if at the end of the input or if it's a select
        if (field === 'operation_code' || field === 'part_type' ||
            (e.currentTarget as HTMLInputElement).selectionStart === (e.currentTarget as HTMLInputElement).value.length) {
          e.preventDefault();
          navigateHorizontally(rowIndex, fieldIndex, true);
        }
        break;
      case 'ArrowLeft':
        // Only navigate if at the beginning of the input or if it's a select
        if (field === 'operation_code' || field === 'part_type' ||
            (e.currentTarget as HTMLInputElement).selectionStart === 0) {
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
        // Move to the cell below
        navigateVertically(rowIndex, fieldIndex, true);
        break;
    }
  };

  // Parse number input handling both comma and period as decimal separators
  const parseNumberInput = (input: string): number => {
    if (!input) return 0;

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

    // Log the parsed value for debugging
    console.log(`[EditableEstimateLinesTable] Parsed value: ${parsedValue}`);

    return parsedValue;
  };

  // Format number with proper decimal places
  const formatNumber = (value: number | null | undefined, decimals = 2, useLocale = true): string => {
    if (value === null || value === undefined) return "";

    if (useLocale) {
      // Use browser's locale for formatting
      return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
    } else {
      // Format without locale for internal use
      return value.toFixed(decimals);
    }
  };

  // Render an editable cell - all cells are now directly editable
  const renderEditableCell = (
    line: EstimateLine,
    field: keyof EstimateLine,
    type: "text" | "number" | "select" = "text",
    options?: { value: string; label: string }[]
  ) => {
    // Get the line from local state to ensure we're showing the most up-to-date value
    const localLine = localLines.find(l => l.id === line.id) || line;
    const value = localLine[field];
    const isLoading = syncingLines[line.id];
    const isActive = activeRowId === line.id;

    // Check if field should be disabled
    const isDisabled = isLoading ||
      !isActive || // Disable if row is not active
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
              // Mark field as no longer being edited when dropdown closes
              markFieldAsNotEditing(line.id, field);
            }
          }}
          onValueChange={(newValue) => {
            // Log the change for debugging
            console.log(`[EditableEstimateLinesTable] Dropdown value changed for ${field}:`, newValue);

            // Only update if the value has changed
            if (value !== newValue) {
              // Update local state immediately
              updateLocalLine(line.id, field, newValue);

              // Sync with server in the background
              // We're calling syncLineWithServer directly instead of handleUpdateLineField
              // to ensure we only update this specific field
              syncLineWithServer(line, field, newValue);
            }
          }}
          disabled={isDisabled}
        >
          <SelectTrigger
            className={`h-8 w-full ${isLoading ? 'opacity-50' : ''} ${isFocused ? 'ring-2 ring-primary' : ''}`}
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

                // Update local state with parsed value
                updateLocalLine(line.id, field, parsedValue);
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
              handleUpdateLineField(line.id, field, parsedValue);
            }
          }}
          onKeyDown={(e) => handleKeyDown(e, line, field)}
          className={`h-8 w-full text-right ${isLoading ? 'opacity-50' : ''} ${isFocused ? 'ring-2 ring-primary' : ''}`}
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
          // Update local state immediately for responsive feel
          updateLocalLine(line.id, field, e.target.value);
        }}
        onBlur={(e) => {
          // Mark field as no longer being edited
          markFieldAsNotEditing(line.id, field);

          // Sync with server when focus is lost
          handleUpdateLineField(line, field, e.target.value);
        }}
        onKeyDown={(e) => handleKeyDown(e, line, field)}
        className={`h-8 w-full ${isLoading ? 'opacity-50' : ''} ${isFocused ? 'ring-2 ring-primary' : ''}`}
        disabled={isDisabled}
      />
    );
  };

  // We no longer need the renderNewLineCell function since we're creating lines directly in the database

  if (isLoading) {
    return <div>Loading estimate lines...</div>;
  }

  return (
    <div>
      <div className="mb-4">
        <Button onClick={handleAddLine} disabled={addLine.isPending}>
          <Plus className="mr-2 h-4 w-4" />
          {addLine.isPending ? "Adding..." : "Add Line"}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Seq</TableHead>
            <TableHead className="w-28">Operation</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-16">Type</TableHead>
            <TableHead className="w-24">Part #</TableHead>
            <TableHead className="w-24">Part Cost</TableHead>
            <TableHead className="w-16">Qty</TableHead>
            <TableHead className="w-20">S/A</TableHead>
            <TableHead className="w-20">Labor</TableHead>
            <TableHead className="w-20">Paint</TableHead>
            <TableHead className="w-24">Specialist</TableHead>
            <TableHead className="w-16">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {localLines.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className="text-center py-4">
                No estimate lines added yet. Click "Add Line" to add a new line.
              </TableCell>
            </TableRow>
          ) : (
            localLines.map((line) => {
              const isLoading = syncingLines[line.id];

              // Render a loading indicator if the line is being synced
              const renderSyncIndicator = () => {
                if (isLoading) {
                  return <div className="ml-2 h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>;
                }
                return null;
              };

              return (
                <TableRow
                  key={line.id}
                  className={`${isLoading ? 'opacity-70' : ''} ${activeRowId === line.id ? 'bg-muted/50' : ''} cursor-pointer`}
                  onClick={() => handleRowClick(line.id)}
                >
                  <TableCell>{line.sequence_number}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {renderEditableCell(line, "operation_code", "select", OPERATION_CODES)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {renderEditableCell(line, "description")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {renderEditableCell(line, "part_type", "select", PART_TYPE_OPTIONS)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {renderEditableCell(line, "part_number")}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click
                          handleEditPartNumber(line);
                        }}
                        disabled={isLoading || activeRowId !== line.id}
                        className="ml-1 h-6 w-6"
                      >
                        <FileText className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {canEditPartCost(line) ?
                        renderEditableCell(line, "part_cost", "number") :
                        <span className="text-muted-foreground text-sm">N/A</span>
                      }
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {renderEditableCell(line, "quantity", "number")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {renderEditableCell(line, "strip_fit_hours", "number")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {renderEditableCell(line, "repair_hours", "number")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {renderEditableCell(line, "paint_hours", "number")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {renderEditableCell(line, "sublet_cost", "number")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-between">
                      {isLoading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click
                            handleDeleteLine(line.id);
                          }}
                          disabled={isLoading}
                          className="h-6 w-6"
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
