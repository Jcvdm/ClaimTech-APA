"use client";

import { useState, useEffect, useCallback, useMemo, memo, useRef } from "react";
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
import { Plus, Save, X, Trash, Edit, RefreshCw, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  type Estimate,
  type EstimateLine,
  OperationCode,
  PartType
} from "@/lib/api/domains/estimates/types";
import { useEstimateSession } from "@/hooks/useEstimateSession";
import { useEstimateSessionStore } from "@/stores/estimateSessionStore";
import { useColumnResize } from "@/hooks/useColumnResize";
import { useDeleteEstimateLine } from "@/lib/api/domains/estimates/hooks";

interface EditableEstimateLinesTableProps {
  estimate: Estimate;
  claimId: string;
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

const PART_TYPE_OPTIONS_SHORT = [
  { value: PartType.DEALER, label: "D" },
  { value: PartType.ALTERNATIVE, label: "ALT" },
  { value: PartType.USED, label: "U" },
  { value: PartType.OTHER, label: "O" },
];

// Memoized table cell input component for performance
const TableCellInput = memo(({ 
  value, 
  onChange, 
  type = "text",
  placeholder,
  isModified = false,
  ...props 
}: {
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  isModified?: boolean;
  [key: string]: any;
}) => {
  const [localValue, setLocalValue] = useState(value?.toString() || "");
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (isMountedRef.current) {
      setLocalValue(value?.toString() || "");
    }
  }, [value]);

  const handleBlur = useCallback(() => {
    if (isMountedRef.current) {
      onChange(localValue);
    }
  }, [localValue, onChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isMountedRef.current) {
      setLocalValue(e.target.value);
    }
  }, []);

  return (
    <Input
      type={type}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={`h-8 ${isModified ? "border-blue-500" : ""}`}
      {...props}
    />
  );
});

TableCellInput.displayName = "TableCellInput";

// Memoized select dropdown component for operation codes
const OperationCodeSelect = memo(({
  value,
  onChange,
  isModified = false
}: {
  value: string;
  onChange: (value: string) => void;
  isModified?: boolean;
}) => {
  console.log('[OperationCodeSelect] Current value:', value, 'Type:', typeof value);
  
  // Ensure value is valid - be more permissive initially
  const validValue = value || '';
  
  // Cache the display label to prevent recalculation on every render
  const displayLabel = useMemo(() => {
    if (!validValue) return "Select operation";
    return OPERATION_CODES_SHORT.find(op => op.value === validValue)?.label || "Select operation";
  }, [validValue]);
  
  const handleChange = useCallback((newValue: string) => {
    console.log('[OperationCodeSelect] onChange triggered with:', newValue);
    onChange(newValue);
  }, [onChange]);
  
  return (
    <Select value={validValue} onValueChange={handleChange}>
      <SelectTrigger className={`h-8 ${isModified ? 'border-blue-500' : ''}`}>
        <SelectValue placeholder="Select operation">
          {displayLabel}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {OPERATION_CODES_SHORT.map((op) => (
          <SelectItem key={op.value} value={op.value}>
            {op.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

OperationCodeSelect.displayName = "OperationCodeSelect";

// Memoized select dropdown component for part types
const PartTypeSelect = memo(({
  value,
  onChange,
  isModified = false
}: {
  value: string | null;
  onChange: (value: string) => void;
  isModified?: boolean;
}) => {
  console.log('[PartTypeSelect] Current value:', value, 'Type:', typeof value);
  
  // Ensure value is valid - be more permissive initially
  const validValue = value || '';
  
  // Cache the display label to prevent recalculation on every render
  const displayLabel = useMemo(() => {
    if (!validValue) return "Select type";
    return PART_TYPE_OPTIONS_SHORT.find(type => type.value === validValue)?.label || "Select type";
  }, [validValue]);
  
  const handleChange = useCallback((newValue: string) => {
    console.log('[PartTypeSelect] onChange triggered with:', newValue);
    onChange(newValue);
  }, [onChange]);
  
  return (
    <Select value={validValue} onValueChange={handleChange}>
      <SelectTrigger className={`h-8 ${isModified ? 'border-blue-500' : ''}`}>
        <SelectValue placeholder="Select type">
          {displayLabel}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {PART_TYPE_OPTIONS_SHORT.map((type) => (
          <SelectItem key={type.value} value={type.value}>
            {type.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

PartTypeSelect.displayName = "PartTypeSelect";

// Memoized table row component for performance
const EstimateLineRow = memo(({
  line,
  onFieldUpdate,
  onDeleteLine,
  isLineModified
}: {
  line: EstimateLine;
  onFieldUpdate: (lineId: string, field: keyof EstimateLine, value: any) => void;
  onDeleteLine: (lineId: string) => void;
  isLineModified: (lineId: string) => boolean;
}) => {
  const handleOperationCodeChange = useCallback((value: string) => {
    console.log('[EstimateLineRow] Operation code change:', value, 'for line:', line.id);
    onFieldUpdate(line.id, 'operation_code', value);
  }, [line.id, onFieldUpdate]);

  const handlePartTypeChange = useCallback((value: string) => {
    console.log('[EstimateLineRow] Part type change:', value, 'for line:', line.id);
    onFieldUpdate(line.id, 'part_type', value || null);
  }, [line.id, onFieldUpdate]);

  const handleDescriptionChange = useCallback((value: string) => {
    onFieldUpdate(line.id, 'description', value);
  }, [line.id, onFieldUpdate]);

  const handlePartNumberChange = useCallback((value: string) => {
    onFieldUpdate(line.id, 'part_number', value || null);
  }, [line.id, onFieldUpdate]);

  const handlePartCostChange = useCallback((value: string) => {
    onFieldUpdate(line.id, 'part_cost', value ? parseFloat(value) : null);
  }, [line.id, onFieldUpdate]);

  const handleQuantityChange = useCallback((value: string) => {
    onFieldUpdate(line.id, 'quantity', value ? parseInt(value) : 1);
  }, [line.id, onFieldUpdate]);

  const handleStripFitHoursChange = useCallback((value: string) => {
    onFieldUpdate(line.id, 'strip_fit_hours', value ? parseFloat(value) : null);
  }, [line.id, onFieldUpdate]);

  const handleRepairHoursChange = useCallback((value: string) => {
    onFieldUpdate(line.id, 'repair_hours', value ? parseFloat(value) : null);
  }, [line.id, onFieldUpdate]);

  const handlePaintHoursChange = useCallback((value: string) => {
    onFieldUpdate(line.id, 'paint_hours', value ? parseFloat(value) : null);
  }, [line.id, onFieldUpdate]);

  const handleSubletCostChange = useCallback((value: string) => {
    onFieldUpdate(line.id, 'sublet_cost', value ? parseFloat(value) : null);
  }, [line.id, onFieldUpdate]);

  const handleDelete = useCallback(() => {
    onDeleteLine(line.id);
  }, [line.id, onDeleteLine]);

  return (
    <TableRow key={line.id}>
      <TableCell>{line.sequence_number}</TableCell>
      <TableCell>
        <OperationCodeSelect
          key={`op-${line.id}`}
          value={line.operation_code}
          onChange={handleOperationCodeChange}
          isModified={isLineModified(line.id)}
        />
      </TableCell>
      <TableCell>
        <TableCellInput
          value={line.description}
          onChange={handleDescriptionChange}
          placeholder="Enter description"
          isModified={isLineModified(line.id)}
        />
      </TableCell>
      <TableCell>
        <PartTypeSelect
          key={`pt-${line.id}`}
          value={line.part_type}
          onChange={handlePartTypeChange}
          isModified={isLineModified(line.id)}
        />
      </TableCell>
      <TableCell>
        <TableCellInput
          value={line.part_number}
          onChange={handlePartNumberChange}
          placeholder="Part #"
          isModified={isLineModified(line.id)}
        />
      </TableCell>
      <TableCell>
        <TableCellInput
          type="text"
          value={line.part_cost}
          onChange={handlePartCostChange}
          placeholder="0.00"
          isModified={isLineModified(line.id)}
        />
      </TableCell>
      <TableCell>
        <TableCellInput
          type="text"
          value={line.quantity}
          onChange={handleQuantityChange}
          placeholder="1"
          isModified={isLineModified(line.id)}
        />
      </TableCell>
      <TableCell>
        <TableCellInput
          type="text"
          value={line.strip_fit_hours}
          onChange={handleStripFitHoursChange}
          placeholder="0.0"
          isModified={isLineModified(line.id)}
        />
      </TableCell>
      <TableCell>
        <TableCellInput
          type="text"
          value={line.repair_hours}
          onChange={handleRepairHoursChange}
          placeholder="0.0"
          isModified={isLineModified(line.id)}
        />
      </TableCell>
      <TableCell>
        <TableCellInput
          type="text"
          value={line.paint_hours}
          onChange={handlePaintHoursChange}
          placeholder="0.0"
          isModified={isLineModified(line.id)}
        />
      </TableCell>
      <TableCell>
        <TableCellInput
          type="text"
          value={line.sublet_cost}
          onChange={handleSubletCostChange}
          placeholder="0.00"
          isModified={isLineModified(line.id)}
        />
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="h-8 w-8 p-0"
        >
          <Trash className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
});

EstimateLineRow.displayName = "EstimateLineRow";

// UUID validation helper
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export function EditableEstimateLinesTable({ estimate, claimId, onLinesChange }: EditableEstimateLinesTableProps) {
  console.log("[EditableEstimateLinesTable] Rendering with estimate:", estimate, "claimId:", claimId);

  // Early return if estimate is not provided or ID is invalid
  if (!estimate || !estimate.id || !isValidUUID(estimate.id)) {
    console.error("[EditableEstimateLinesTable] No valid estimate provided. Estimate:", estimate);
    return (
      <div className="p-4 text-center">
        <div className="text-gray-500">
          {!estimate ? "No estimate data available" : 
           !estimate.id ? "Estimate ID is missing" :
           "Loading estimate data..."}
        </div>
      </div>
    );
  }

  // Use DAL-powered session management - no more direct tRPC calls
  const session = useEstimateSession({
    estimateId: estimate.id,
    claimId: claimId
  });

  // Use delete mutation for real line deletions
  const deleteLineMutation = useDeleteEstimateLine();

  const {
    displayLines,
    hasUnsavedChanges,
    syncStatus,
    lastActivityTime,
    updateField,
    addOptimisticLine,
    replaceOptimisticLine,
    removeLine,
    syncNow,
    trackActivity,
    isLineModified,
    pendingChangesCount,
    isLoading,
    isLinesLoading
  } = session;

  // Removed problematic useEffect that was causing infinite loops
  // Parent components can access session data through other means if needed
  // The session object was changing on every render, causing circular dependencies

  // Combined loading state from DAL
  const isDataLoading = isLoading || isLinesLoading;

  // Column resizing functionality
  const {
    columnWidths,
    isResizing,
    getResizeHandleProps,
    getColumnWidth
  } = useColumnResize({
    storageKey: `estimate-columns-${estimate.id}`,
    defaultWidths: {
      sequence: 50,
      operation: 80,
      description: 200,
      partType: 80,
      partNumber: 120,
      partCost: 100,
      quantity: 60,
      stripFitHours: 80,
      repairHours: 80,
      paintHours: 80,
      subletCost: 100,
      actions: 60
    },
    minWidth: 50,
    maxWidth: 400
  });

  // DAL handles all mutations and background sync - no direct tRPC calls needed

  // Handle field update with immediate UI response
  const handleFieldUpdate = useCallback((lineId: string, field: keyof EstimateLine, value: any) => {
    console.log(`[EditableEstimateLinesTable] Updating ${String(field)} for line ${lineId}:`, value);
    
    // Track activity and update field immediately
    trackActivity();
    updateField(lineId, field, value);
    
    console.log(`[EditableEstimateLinesTable] Field updated optimistically - UI responsive, background sync will handle persistence`);
  }, [trackActivity, updateField]);

  // Add new line with optimistic updates handled entirely by DAL
  const handleAddLine = useCallback(() => {
    const tempId = `temp-${Date.now()}`;
    const nextSequence = displayLines.length + 1;
    
    console.log("[EditableEstimateLinesTable] Adding optimistic line with temp ID:", tempId);
    
    // Create optimistic line for immediate display
    const optimisticLine: EstimateLine = {
      id: tempId,
      estimate_id: estimate.id,
      damage_id: null,
      sequence_number: nextSequence,
      description: "",
      operation_code: OperationCode.REPAIR,
      part_type: null,
      part_number: null,
      part_cost: null,
      quantity: 1,
      strip_fit_hours: null,
      repair_hours: null,
      paint_hours: null,
      sublet_cost: null,
      is_included: true,
      line_notes: null,
      calculated_part_total: null,
      calculated_labor_total: null,
      calculated_paint_material_total: null,
      calculated_sublet_total: null,
      calculated_line_total: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Add to session store immediately for instant UI display
    trackActivity();
    addOptimisticLine(tempId, optimisticLine);
    
    // DAL background sync will handle server creation automatically
    toast.success("New line added");
    console.log("[EditableEstimateLinesTable] Optimistic line added - DAL will sync to server");
  }, [estimate.id, displayLines.length, trackActivity, addOptimisticLine]);

  // Delete line - handle both temp and real IDs
  const handleDeleteLine = useCallback(async (lineId: string) => {
    if (!confirm("Are you sure you want to delete this line?")) return;

    console.log("[EditableEstimateLinesTable] Deleting line:", lineId);
    
    // Check if it's a real UUID or temp ID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lineId);
    
    if (isUUID) {
      // For real IDs, call server deletion and remove from UI
      try {
        trackActivity();
        removeLine(lineId); // Remove from UI immediately for responsiveness
        await deleteLineMutation.mutateAsync({ id: lineId });
        console.log("[EditableEstimateLinesTable] Line deleted from server:", lineId);
      } catch (error) {
        console.error("[EditableEstimateLinesTable] Failed to delete line from server:", error);
        toast.error("Failed to delete line from server");
        // Re-add line to UI if server deletion failed
        // Note: This would require fetching the line data again
      }
    } else {
      // For temp IDs, just remove from local store
      trackActivity();
      removeLine(lineId);
      toast.success("Line deleted");
      console.log("[EditableEstimateLinesTable] Temp line removed from UI:", lineId);
    }
  }, [trackActivity, removeLine, deleteLineMutation]);

  // Removed problematic useEffect that was causing infinite loop
  // Parent can access lines through props/state without needing notification
  // This was triggering on every displayLines change and creating circular updates

  // DAL handles all error states through the session hook

  return (
    <div className="space-y-4">
      {/* Header with sync status */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Estimate Lines</h3>
        <div className="flex items-center gap-2">
          {/* DAL-powered status indicators */}
          {hasUnsavedChanges && syncStatus === 'idle' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Will auto-save in background
            </Badge>
          )}
          {syncStatus === 'syncing' && (
            <Badge variant="default" className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Saving changes...
            </Badge>
          )}
          {syncStatus === 'error' && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <X className="h-3 w-3" />
              Save failed - retry
            </Badge>
          )}
          {!hasUnsavedChanges && syncStatus === 'idle' && (
            <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800">
              ✓ All changes saved
            </Badge>
          )}
          
          {/* Action buttons */}
          {hasUnsavedChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('Are you sure you want to discard all unsaved changes?')) {
                  useEstimateSessionStore.getState().resetSession();
                  // DAL will reinitialize lines automatically
                  toast.info('Changes discarded');
                }
              }}
              className="text-xs"
            >
              Discard
            </Button>
          )}
          {hasUnsavedChanges && (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                trackActivity(); // Reset activity timer
                syncNow();
              }}
              disabled={syncStatus === 'syncing'}
              className="text-xs"
            >
              <Save className="h-3 w-3 mr-1" />
              Save Now
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="relative border-r"
                style={{ width: getColumnWidth('sequence') }}
              >
                Seq
                <div 
                  {...getResizeHandleProps('sequence')}
                  className="absolute right-0 top-0 w-1 h-full bg-transparent hover:bg-blue-400 cursor-col-resize"
                />
              </TableHead>
              <TableHead 
                className="relative border-r"
                style={{ width: getColumnWidth('operation') }}
              >
                Operation
                <div 
                  {...getResizeHandleProps('operation')}
                  className="absolute right-0 top-0 w-1 h-full bg-transparent hover:bg-blue-400 cursor-col-resize"
                />
              </TableHead>
              <TableHead 
                className="relative border-r"
                style={{ width: getColumnWidth('description') }}
              >
                Description
                <div 
                  {...getResizeHandleProps('description')}
                  className="absolute right-0 top-0 w-1 h-full bg-transparent hover:bg-blue-400 cursor-col-resize"
                />
              </TableHead>
              <TableHead 
                className="relative border-r"
                style={{ width: getColumnWidth('partType') }}
              >
                Type
                <div 
                  {...getResizeHandleProps('partType')}
                  className="absolute right-0 top-0 w-1 h-full bg-transparent hover:bg-blue-400 cursor-col-resize"
                />
              </TableHead>
              <TableHead 
                className="relative border-r"
                style={{ width: getColumnWidth('partNumber') }}
              >
                Part #
                <div 
                  {...getResizeHandleProps('partNumber')}
                  className="absolute right-0 top-0 w-1 h-full bg-transparent hover:bg-blue-400 cursor-col-resize"
                />
              </TableHead>
              <TableHead 
                className="relative border-r"
                style={{ width: getColumnWidth('partCost') }}
              >
                Part Cost
                <div 
                  {...getResizeHandleProps('partCost')}
                  className="absolute right-0 top-0 w-1 h-full bg-transparent hover:bg-blue-400 cursor-col-resize"
                />
              </TableHead>
              <TableHead 
                className="relative border-r"
                style={{ width: getColumnWidth('quantity') }}
              >
                Qty
                <div 
                  {...getResizeHandleProps('quantity')}
                  className="absolute right-0 top-0 w-1 h-full bg-transparent hover:bg-blue-400 cursor-col-resize"
                />
              </TableHead>
              <TableHead 
                className="relative border-r"
                style={{ width: getColumnWidth('stripFitHours') }}
              >
                S/A
                <div 
                  {...getResizeHandleProps('stripFitHours')}
                  className="absolute right-0 top-0 w-1 h-full bg-transparent hover:bg-blue-400 cursor-col-resize"
                />
              </TableHead>
              <TableHead 
                className="relative border-r"
                style={{ width: getColumnWidth('repairHours') }}
              >
                Labor
                <div 
                  {...getResizeHandleProps('repairHours')}
                  className="absolute right-0 top-0 w-1 h-full bg-transparent hover:bg-blue-400 cursor-col-resize"
                />
              </TableHead>
              <TableHead 
                className="relative border-r"
                style={{ width: getColumnWidth('paintHours') }}
              >
                Paint
                <div 
                  {...getResizeHandleProps('paintHours')}
                  className="absolute right-0 top-0 w-1 h-full bg-transparent hover:bg-blue-400 cursor-col-resize"
                />
              </TableHead>
              <TableHead 
                className="relative border-r"
                style={{ width: getColumnWidth('subletCost') }}
              >
                Specialist
                <div 
                  {...getResizeHandleProps('subletCost')}
                  className="absolute right-0 top-0 w-1 h-full bg-transparent hover:bg-blue-400 cursor-col-resize"
                />
              </TableHead>
              <TableHead 
                style={{ width: getColumnWidth('actions') }}
              >
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isDataLoading ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8">
                  Loading estimate lines...
                </TableCell>
              </TableRow>
            ) : displayLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8">
                  No estimate lines yet. Click "Add Line" to create one.
                </TableCell>
              </TableRow>
            ) : (
              displayLines.map((line) => (
                <EstimateLineRow
                  key={line.id}
                  line={line}
                  onFieldUpdate={handleFieldUpdate}
                  onDeleteLine={handleDeleteLine}
                  isLineModified={isLineModified}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Line Button */}
      <div className="flex justify-center">
        <Button onClick={handleAddLine} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Line
        </Button>
      </div>
    </div>
  );
}