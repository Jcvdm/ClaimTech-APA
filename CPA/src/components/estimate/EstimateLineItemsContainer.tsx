'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { type Estimate, type EstimateLine } from '@/lib/api/domains/estimates/types';
import { useEstimateLines } from '@/lib/api/domains/estimates/hooks';
import { useEstimateSession } from '@/hooks/useEstimateSession';
import { useKeyboardNavigation, type CellCoordinate } from '@/hooks/useKeyboardNavigation';

// Components
import { EstimateLineHeader } from './EstimateLineHeader';
import { EstimateLineToolbar } from './EstimateLineToolbar';
import { EstimateLineTable } from './EstimateLineTable';
import { EditableEstimateLinesTable } from '../../app/claims/[id]/tabs/estimate/EditableEstimateLinesTable';
import { EstimateLineStatusBar } from './EstimateLineStatusBar';
import { EstimateLineValidationPanel } from './EstimateLineValidationPanel';

// Context
import { EstimateLineProvider } from './EstimateLineContext';

interface EstimateLineItemsContainerProps {
  estimate: Estimate;
  readonly?: boolean;
  maxRows?: number;
  enableBulkActions?: boolean;
  enableKeyboardNavigation?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  onLinesChange?: (lines: EstimateLine[]) => void;
}

export function EstimateLineItemsContainer({
  estimate,
  readonly = false,
  maxRows = 1000,
  enableBulkActions = true,
  enableKeyboardNavigation = true,
  onSelectionChange,
  onLinesChange
}: EstimateLineItemsContainerProps) {
  // Fetch estimate lines
  const {
    data: lines = [],
    isLoading,
    isError,
    error,
    refetch
  } = useEstimateLines(estimate.id);

  // Selection state
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [focusedCell, setFocusedCell] = useState<CellCoordinate | null>(null);

  // Session-based state management
  const session = useEstimateSession({
    estimateId: estimate.id,
    serverLines: lines,
    onSyncSuccess: () => refetch(),
    autoSyncInterval: 30000
  });

  // Handle unsaved changes on page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (session.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [session.hasUnsavedChanges]);

  // Keyboard navigation
  const keyboardNav = useKeyboardNavigation({
    enabled: enableKeyboardNavigation && !readonly,
    lines,
    onCellFocus: setFocusedCell,
    onRowSelect: useCallback((rowId: string, selected: boolean) => {
      setSelectedRows(prev => {
        const newSelection = new Set(prev);
        if (selected) {
          newSelection.add(rowId);
        } else {
          newSelection.delete(rowId);
        }
        return newSelection;
      });
    }, []),
    onAddLine: useCallback(() => {
      // Handle add line
      console.log('Add new line');
    }, []),
    onDeleteLines: useCallback(async (lineIds: string[]) => {
      // Handle delete lines
      console.log('Delete lines:', lineIds);
    }, []),
    onSaveAll: session.syncNow,
  });

  // Handle selection changes
  const handleSelectionChange = useCallback((selection: Set<string>) => {
    setSelectedRows(selection);
    onSelectionChange?.(Array.from(selection));
  }, [onSelectionChange]);

  // Handle add line
  const handleAddLine = useCallback(() => {
    // Implementation for adding a new line
    console.log('Adding new line to estimate:', estimate.id);
  }, [estimate.id]);

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    if (selectedRows.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedRows.size} line(s)?`
    );

    if (confirmed) {
      // Implementation for bulk delete
      console.log('Bulk deleting lines:', Array.from(selectedRows));
      setSelectedRows(new Set());
    }
  }, [selectedRows]);

  // Error state
  if (isError) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-600 mb-2">Error loading estimate lines</div>
        <div className="text-sm text-gray-600 mb-4">
          {error?.message || 'An unexpected error occurred'}
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <EstimateLineProvider
      value={{
        estimate,
        lines,
        session,
        keyboardNav,
        readonly,
        selectedRows,
        focusedCell,
        isLoading,
      }}
    >
      <div 
        className="estimate-lines-container bg-white rounded-lg shadow-sm border"
        {...keyboardNav.containerProps}
      >
        <EstimateLineHeader estimate={estimate} />
        
{/* Only show toolbar for read-only mode or when using the old table */}
        {readonly && (
          <EstimateLineToolbar
            onAddLine={handleAddLine}
            selectedCount={selectedRows.size}
            onBulkDelete={handleBulkDelete}
            enableBulkActions={enableBulkActions && !readonly}
            readonly={readonly}
          />
        )}
        
        {/* Desktop Table View - Using Editable Table */}
        <div className="hidden md:block">
          {readonly ? (
            <EstimateLineTable
              lines={lines}
              isLoading={isLoading}
              focusedCell={focusedCell}
              selectedRows={selectedRows}
              onSelectionChange={handleSelectionChange}
              maxRows={maxRows}
            />
          ) : (
            <EditableEstimateLinesTable
              estimate={estimate}
              onLinesChange={onLinesChange}
            />
          )}
        </div>
        
        {/* Mobile Card View - Using Editable Table for mobile too */}
        <div className="md:hidden">
          {readonly ? (
            <div className="p-4">
              <div className="text-sm text-gray-600 mb-4">
                {lines.length} estimate line{lines.length !== 1 ? 's' : ''}
                {selectedRows.size > 0 && ` • ${selectedRows.size} selected`}
              </div>
              
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : lines.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="mb-2">No estimate lines found</div>
                  {!readonly && (
                    <button
                      onClick={handleAddLine}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Add First Line
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {lines.map((line) => (
                    <div 
                      key={line.id}
                      className={`
                        p-4 border rounded-lg transition-all
                        ${selectedRows.has(line.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                        ${!line.is_included ? 'opacity-60' : ''}
                      `}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {line.description || 'No description'}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            {line.sequence_number && (
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                #{line.sequence_number}
                              </span>
                            )}
                            {line.operation_code && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {line.operation_code}
                              </span>
                            )}
                            {!line.is_included && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                Excluded
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <input
                          type="checkbox"
                          checked={selectedRows.has(line.id)}
                          onChange={(e) => handleSelectionChange(
                            selectedRows.has(line.id) 
                              ? new Set([...selectedRows].filter(id => id !== line.id))
                              : new Set([...selectedRows, line.id])
                          )}
                          className="ml-3 mt-1"
                          disabled={readonly}
                        />
                      </div>
                      
                      {/* Mobile-optimized line details */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {line.part_number && (
                          <div>
                            <span className="text-gray-500">Part:</span>
                            <div className="font-mono">{line.part_number}</div>
                          </div>
                        )}
                        
                        {line.part_cost && (
                          <div>
                            <span className="text-gray-500">Cost:</span>
                            <div className="font-medium">
                              ${line.part_cost.toFixed(2)}
                              {line.quantity && line.quantity > 1 && (
                                <span className="text-gray-500"> × {line.quantity}</span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {((line.strip_fit_hours || 0) + (line.repair_hours || 0) + (line.paint_hours || 0)) > 0 && (
                          <div className="col-span-2">
                            <span className="text-gray-500">Hours:</span>
                            <div className="flex space-x-3 mt-1">
                              {line.strip_fit_hours > 0 && (
                                <span>S/F: {line.strip_fit_hours}h</span>
                              )}
                              {line.repair_hours > 0 && (
                                <span>Repair: {line.repair_hours}h</span>
                              )}
                              {line.paint_hours > 0 && (
                                <span>Paint: {line.paint_hours}h</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4">
              {/* Mobile-optimized editable table */}
              <EditableEstimateLinesTable
                estimate={estimate}
                onLinesChange={onLinesChange}
              />
            </div>
          )}
        </div>
        
{/* Only show status bar and validation panel for read-only mode */}
        {readonly && (
          <>
            <EstimateLineStatusBar session={session} />
            <EstimateLineValidationPanel />
          </>
        )}
      </div>
    </EstimateLineProvider>
  );
}