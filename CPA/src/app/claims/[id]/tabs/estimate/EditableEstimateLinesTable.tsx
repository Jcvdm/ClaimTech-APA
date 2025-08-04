"use client";

import { useState, useEffect, useCallback, memo } from "react";
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
  type EstimateLineCreate,
  OperationCode,
  PartType
} from "@/lib/api/domains/estimates/types";
import { useEstimateLines, useAddEstimateLine, useUpdateEstimateLine, useDeleteEstimateLine } from "@/lib/api/domains/estimates/hooks";
import { useEstimateSession } from "@/hooks/useEstimateSession";
import { useColumnResize } from "@/hooks/useColumnResize";

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

  useEffect(() => {
    setLocalValue(value?.toString() || "");
  }, [value]);

  const handleBlur = useCallback(() => {
    onChange(localValue);
  }, [localValue, onChange]);

  return (
    <Input
      type={type}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
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
  
  const handleChange = (newValue: string) => {
    console.log('[OperationCodeSelect] onChange triggered with:', newValue);
    onChange(newValue);
  };
  
  return (
    <Select value={validValue} onValueChange={handleChange}>
      <SelectTrigger className={`h-8 ${isModified ? 'border-blue-500' : ''}`}>
        <SelectValue placeholder="Select operation">
          {validValue ? OPERATION_CODES_SHORT.find(op => op.value === validValue)?.label : "Select operation"}
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
  
  const handleChange = (newValue: string) => {
    console.log('[PartTypeSelect] onChange triggered with:', newValue);
    onChange(newValue);
  };
  
  return (
    <Select value={validValue} onValueChange={handleChange}>
      <SelectTrigger className={`h-8 ${isModified ? 'border-blue-500' : ''}`}>
        <SelectValue placeholder="Select type">
          {validValue ? PART_TYPE_OPTIONS_SHORT.find(type => type.value === validValue)?.label : "Select type"}
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
  isFieldModified
}: {
  line: EstimateLine;
  onFieldUpdate: (lineId: string, field: keyof EstimateLine, value: any) => void;
  onDeleteLine: (lineId: string) => void;
  isFieldModified: (lineId: string, field: keyof EstimateLine) => boolean;
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
          key={`op-${line.id}-${line.operation_code}`}
          value={line.operation_code}
          onChange={handleOperationCodeChange}
          isModified={isFieldModified(line.id, 'operation_code')}
        />
      </TableCell>
      <TableCell>
        <TableCellInput
          value={line.description}
          onChange={handleDescriptionChange}
          placeholder="Enter description"
          isModified={isFieldModified(line.id, 'description')}
        />
      </TableCell>
      <TableCell>
        <PartTypeSelect
          key={`pt-${line.id}-${line.part_type}`}
          value={line.part_type}
          onChange={handlePartTypeChange}
          isModified={isFieldModified(line.id, 'part_type')}
        />
      </TableCell>
      <TableCell>
        <TableCellInput
          value={line.part_number}
          onChange={handlePartNumberChange}
          placeholder="Part #"
          isModified={isFieldModified(line.id, 'part_number')}
        />
      </TableCell>
      <TableCell>
        <TableCellInput
          type="text"
          value={line.part_cost}
          onChange={handlePartCostChange}
          placeholder="0.00"
          isModified={isFieldModified(line.id, 'part_cost')}
        />
      </TableCell>
      <TableCell>
        <TableCellInput
          type="text"
          value={line.quantity}
          onChange={handleQuantityChange}
          placeholder="1"
          isModified={isFieldModified(line.id, 'quantity')}
        />
      </TableCell>
      <TableCell>
        <TableCellInput
          type="text"
          value={line.strip_fit_hours}
          onChange={handleStripFitHoursChange}
          placeholder="0.0"
          isModified={isFieldModified(line.id, 'strip_fit_hours')}
        />
      </TableCell>
      <TableCell>
        <TableCellInput
          type="text"
          value={line.repair_hours}
          onChange={handleRepairHoursChange}
          placeholder="0.0"
          isModified={isFieldModified(line.id, 'repair_hours')}
        />
      </TableCell>
      <TableCell>
        <TableCellInput
          type="text"
          value={line.paint_hours}
          onChange={handlePaintHoursChange}
          placeholder="0.0"
          isModified={isFieldModified(line.id, 'paint_hours')}
        />
      </TableCell>
      <TableCell>
        <TableCellInput
          type="text"
          value={line.sublet_cost}
          onChange={handleSubletCostChange}
          placeholder="0.00"
          isModified={isFieldModified(line.id, 'sublet_cost')}
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

export function EditableEstimateLinesTable({ estimate, onLinesChange }: EditableEstimateLinesTableProps) {
  console.log("[EditableEstimateLinesTable] Rendering with estimate:", estimate);

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

  // Fetch estimate lines
  const {
    data: serverLines = [],
    isLoading,
    isError,
    error,
    refetch
  } = useEstimateLines(estimate.id);

  // Use the new session-based state management
  const {
    displayLines,
    hasUnsavedChanges,
    syncStatus,
    updateField,
    syncNow,
    discardChanges,
    isFieldModified,
    getOriginalValue
  } = useEstimateSession({
    estimateId: estimate.id,
    serverLines,
    onSyncSuccess: () => refetch(),
    autoSyncInterval: 30000 // Auto-sync every 30 seconds
  });

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

  // Mutations
  const addLine = useAddEstimateLine();
  const updateLine = useUpdateEstimateLine();
  const deleteLine = useDeleteEstimateLine();

  // Simple debounced sync (2 seconds)
  const [syncTimer, setSyncTimer] = useState<NodeJS.Timeout | null>(null);

  const debouncedSync = useCallback(() => {
    if (syncTimer) clearTimeout(syncTimer);
    
    const timer = setTimeout(async () => {
      if (hasUnsavedChanges && syncStatus === 'idle') {
        await syncNow();
      }
    }, 2000); // Simple 2-second delay

    setSyncTimer(timer);
  }, [hasUnsavedChanges, syncStatus, syncNow, syncTimer]);

  // Handle field update
  const handleFieldUpdate = useCallback((lineId: string, field: keyof EstimateLine, value: any) => {
    console.log(`[EditableEstimateLinesTable] Updating ${String(field)} for line ${lineId}:`, value);
    
    // Update in session store
    updateField(lineId, field, value);
    
    // For dropdown changes, sync immediately instead of debounced
    if (field === 'operation_code' || field === 'part_type') {
      console.log(`[EditableEstimateLinesTable] Immediate sync for dropdown field: ${String(field)}`);
      syncNow();
    } else {
      // Trigger debounced sync for other fields
      debouncedSync();
    }
  }, [updateField, debouncedSync, syncNow]);

  // Add new line with optimistic updates
  const handleAddLine = useCallback(async () => {
    const tempId = `temp-${Date.now()}`;
    
    try {
      // Create optimistic new line
      const newLine: EstimateLineCreate = {
        estimate_id: estimate.id,
        sequence_number: displayLines.length + 1,
        description: "",
        operation_code: OperationCode.REPAIR,
        quantity: 1,
        is_included: true,
      };

      // Show immediate feedback
      toast.success("Adding new line...");

      // Use optimistic update - don't wait for response
      addLine.mutate(newLine, {
        onSuccess: (data) => {
          // Only refetch to get the actual ID and any server-computed fields
          refetch();
          toast.success("New line added successfully");
        },
        onError: (error) => {
          console.error("[EditableEstimateLinesTable] Error adding line:", error);
          toast.error("Failed to add new line");
          // Refetch to revert optimistic update
          refetch();
        }
      });
    } catch (error) {
      console.error("[EditableEstimateLinesTable] Error adding line:", error);
      toast.error("Failed to add new line");
    }
  }, [estimate.id, displayLines.length, addLine, refetch]);

  // Delete line
  const handleDeleteLine = useCallback(async (lineId: string) => {
    if (!confirm("Are you sure you want to delete this line?")) return;

    try {
      await deleteLine.mutateAsync({ id: lineId });
      toast.success("Line deleted");
      refetch();
    } catch (error) {
      console.error("[EditableEstimateLinesTable] Error deleting line:", error);
      toast.error("Failed to delete line");
    }
  }, [deleteLine, refetch]);

  // Notify parent of line changes
  useEffect(() => {
    if (onLinesChange) {
      console.log("[EditableEstimateLinesTable] Notifying parent of lines change:", displayLines.length);
      onLinesChange(displayLines);
    }
  }, [displayLines, onLinesChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimer) clearTimeout(syncTimer);
    };
  }, [syncTimer]);

  if (isError) {
    console.error("[EditableEstimateLinesTable] Error:", error);
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-red-600 mb-2">Error loading estimate lines</div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with sync status */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Estimate Lines</h3>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Unsaved Changes
            </Badge>
          )}
          {syncStatus === 'syncing' && (
            <Badge variant="default" className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Saving...
            </Badge>
          )}
          {syncStatus === 'error' && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <X className="h-3 w-3" />
              Sync Error
            </Badge>
          )}
          {hasUnsavedChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={discardChanges}
            >
              Discard Changes
            </Button>
          )}
          {hasUnsavedChanges && syncStatus === 'idle' && (
            <Button
              variant="default"
              size="sm"
              onClick={syncNow}
            >
              <Save className="h-4 w-4 mr-1" />
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
            {isLoading ? (
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
                  isFieldModified={isFieldModified}
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