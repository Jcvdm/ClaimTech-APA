'use client';

import React, { useMemo } from 'react';
import { type EstimateLine } from '@/lib/api/domains/estimates/types';
import { type CellCoordinate } from '@/hooks/useKeyboardNavigation';
import { useEstimateLineContext } from './EstimateLineContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

interface EstimateLineTableProps {
  lines: EstimateLine[];
  isLoading: boolean;
  focusedCell: CellCoordinate | null;
  selectedRows: Set<string>;
  onSelectionChange: (selection: Set<string>) => void;
  maxRows?: number;
}

export function EstimateLineTable({
  lines,
  isLoading,
  focusedCell,
  selectedRows,
  onSelectionChange,
  maxRows = 1000
}: EstimateLineTableProps) {
  const { readonly, session, keyboardNav } = useEstimateLineContext();

  // Sort lines by sequence number
  const sortedLines = useMemo(() => {
    return [...lines].sort((a, b) => (a.sequence_number || 0) - (b.sequence_number || 0));
  }, [lines]);

  // Limit displayed rows if needed
  const displayedLines = useMemo(() => {
    return sortedLines.slice(0, maxRows);
  }, [sortedLines, maxRows]);

  const handleRowSelection = (lineId: string, checked: boolean) => {
    const newSelection = new Set(selectedRows);
    if (checked) {
      newSelection.add(lineId);
    } else {
      newSelection.delete(lineId);
    }
    onSelectionChange(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(displayedLines.map(line => line.id));
      onSelectionChange(allIds);
    } else {
      onSelectionChange(new Set());
    }
  };

  const allSelected = displayedLines.length > 0 && displayedLines.every(line => selectedRows.has(line.id));
  const someSelected = displayedLines.some(line => selectedRows.has(line.id));

  if (isLoading) {
    return (
      <div className="border rounded-lg">
        <div className="p-4">
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (displayedLines.length === 0) {
    return (
      <div className="border rounded-lg bg-gray-50">
        <div className="p-8 text-center">
          <div className="text-gray-500 mb-2">No estimate lines found</div>
          <div className="text-sm text-gray-400">
            Add lines to begin building your estimate
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 border-r p-2">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  onCheckedChange={handleSelectAll}
                  disabled={readonly}
                />
              </th>
              <th className="border-r p-2 text-left text-xs font-medium text-gray-500 uppercase w-16">Seq</th>
              <th className="border-r p-2 text-left text-xs font-medium text-gray-500 uppercase min-w-64">Description</th>
              <th className="border-r p-2 text-left text-xs font-medium text-gray-500 uppercase w-20">Op Code</th>
              <th className="border-r p-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Part Type</th>
              <th className="border-r p-2 text-left text-xs font-medium text-gray-500 uppercase w-32">Part Number</th>
              <th className="border-r p-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Part Cost</th>
              <th className="border-r p-2 text-left text-xs font-medium text-gray-500 uppercase w-20">Qty</th>
              <th className="border-r p-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Strip/Fit</th>
              <th className="border-r p-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Repair</th>
              <th className="border-r p-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Paint</th>
              <th className="border-r p-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Sublet</th>
              <th className="border-r p-2 text-left text-xs font-medium text-gray-500 uppercase w-20">Include</th>
              <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Total</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}>
                  <td colSpan={14} className="p-2">
                    <Skeleton className="h-8 w-full" />
                  </td>
                </tr>
              ))
            ) : displayedLines.length === 0 ? (
              <tr>
                <td colSpan={14} className="p-8 text-center text-gray-500">
                  No estimate lines found. Click "Add Line" to get started.
                </td>
              </tr>
            ) : (
              displayedLines.map((line, index) => {
              const isSelected = selectedRows.has(line.id);
              const isDirty = session.hasUnsavedChanges; // Simplified - could be made more specific per line
              const hasConflict = session.syncStatus === 'conflict';
              
              // Calculate line total
              const partTotal = (line.part_cost || 0) * (line.quantity || 1);
              const laborTotal = ((line.strip_fit_hours || 0) + (line.repair_hours || 0)) * 0; // TODO: get labor rate
              const paintTotal = (line.paint_hours || 0) * 0; // TODO: get paint rate
              const lineTotal = partTotal + laborTotal + paintTotal + (line.sublet_cost || 0);

              return (
                <tr 
                  key={line.id}
                  className={`
                    border-b hover:bg-gray-50 
                    ${isSelected ? 'bg-blue-50' : ''}
                    ${isDirty ? 'bg-yellow-50' : ''}
                    ${hasConflict ? 'bg-red-50' : ''}
                  `}
                  data-line-id={line.id}
                  tabIndex={focusedCell?.rowId === line.id ? 0 : -1}
                >
                  <td className="border-r p-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleRowSelection(line.id, checked as boolean)}
                      disabled={readonly}
                    />
                  </td>
                  
                  <td className="border-r p-2 text-sm">
                    {line.sequence_number || index + 1}
                  </td>
                  
                  <td className="border-r p-2 text-sm">
                    <div className="max-w-64 truncate" title={line.description || ''}>
                      {line.description || '—'}
                    </div>
                  </td>
                  
                  <td className="border-r p-2 text-sm font-mono">
                    {line.operation_code || '—'}
                  </td>
                  
                  <td className="border-r p-2 text-sm">
                    {line.part_type || '—'}
                  </td>
                  
                  <td className="border-r p-2 text-sm font-mono">
                    {line.part_number || '—'}
                  </td>
                  
                  <td className="border-r p-2 text-sm text-right">
                    {line.part_cost ? line.part_cost.toFixed(2) : '—'}
                  </td>
                  
                  <td className="border-r p-2 text-sm text-right">
                    {line.quantity || 1}
                  </td>
                  
                  <td className="border-r p-2 text-sm text-right">
                    {line.strip_fit_hours || '—'}
                  </td>
                  
                  <td className="border-r p-2 text-sm text-right">
                    {line.repair_hours || '—'}
                  </td>
                  
                  <td className="border-r p-2 text-sm text-right">
                    {line.paint_hours || '—'}
                  </td>
                  
                  <td className="border-r p-2 text-sm text-right">
                    {line.sublet_cost ? line.sublet_cost.toFixed(2) : '—'}
                  </td>
                  
                  <td className="border-r p-2 text-center">
                    <Checkbox
                      checked={line.is_included}
                      disabled={readonly}
                      className="mx-auto"
                    />
                  </td>
                  
                  <td className="p-2 text-sm text-right font-medium">
                    {lineTotal > 0 ? lineTotal.toFixed(2) : '—'}
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {sortedLines.length > maxRows && (
        <div className="border-t bg-yellow-50 p-2 text-center text-sm text-yellow-800">
          Showing {maxRows} of {sortedLines.length} lines. 
          <button className="ml-1 text-yellow-900 underline">
            Show all lines
          </button>
        </div>
      )}
    </div>
  );
}