'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EstimateLine } from '@/lib/api/domains/estimates/types';

export interface CellCoordinate {
  rowId: string;
  field: keyof EstimateLine;
}

interface KeyboardNavigationConfig {
  enabled: boolean;
  lines: EstimateLine[];
  onCellFocus: (coordinate: CellCoordinate) => void;
  onRowSelect: (rowId: string, selected: boolean) => void;
  onAddLine?: () => void;
  onDeleteLines?: (lineIds: string[]) => void;
  onSaveAll?: () => Promise<void>;
  onUndo?: () => void;
  onRedo?: () => void;
}

// Define editable fields in navigation order
export const EDITABLE_FIELDS: (keyof EstimateLine)[] = [
  'operation_code',
  'description',
  'part_type',
  'part_number',
  'part_cost',
  'quantity',
  'strip_fit_hours',
  'repair_hours',
  'paint_hours',
  'sublet_cost',
  'line_notes',
];

export function useKeyboardNavigation(config: KeyboardNavigationConfig) {
  const [focusedCell, setFocusedCell] = useState<CellCoordinate | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const { 
    enabled, 
    lines, 
    onCellFocus, 
    onRowSelect, 
    onAddLine, 
    onDeleteLines, 
    onSaveAll, 
    onUndo, 
    onRedo 
  } = config;

  // Get current indices for navigation
  const getCurrentIndices = useCallback((coordinate: CellCoordinate) => {
    const rowIndex = lines.findIndex(line => line.id === coordinate.rowId);
    const fieldIndex = EDITABLE_FIELDS.indexOf(coordinate.field);
    return { rowIndex, fieldIndex };
  }, [lines]);

  // Navigate horizontally (left/right, tab/shift-tab)
  const navigateHorizontal = useCallback((
    currentRowIndex: number, 
    currentFieldIndex: number, 
    forward: boolean
  ) => {
    if (currentRowIndex === -1) return;

    let newFieldIndex = forward ? currentFieldIndex + 1 : currentFieldIndex - 1;
    let newRowIndex = currentRowIndex;

    // Wrap to next/previous row if needed
    if (newFieldIndex >= EDITABLE_FIELDS.length) {
      newFieldIndex = 0;
      newRowIndex = Math.min(currentRowIndex + 1, lines.length - 1);
    } else if (newFieldIndex < 0) {
      newFieldIndex = EDITABLE_FIELDS.length - 1;
      newRowIndex = Math.max(currentRowIndex - 1, 0);
    }

    if (newRowIndex >= 0 && newRowIndex < lines.length) {
      const newCoordinate: CellCoordinate = {
        rowId: lines[newRowIndex].id,
        field: EDITABLE_FIELDS[newFieldIndex],
      };
      setFocusedCell(newCoordinate);
      onCellFocus(newCoordinate);
    }
  }, [lines, onCellFocus]);

  // Navigate vertically (up/down arrows, enter)
  const navigateVertical = useCallback((
    currentRowIndex: number, 
    currentFieldIndex: number, 
    down: boolean
  ) => {
    if (currentFieldIndex === -1) return;

    const newRowIndex = down 
      ? Math.min(currentRowIndex + 1, lines.length - 1)
      : Math.max(currentRowIndex - 1, 0);

    if (newRowIndex >= 0 && newRowIndex < lines.length && newRowIndex !== currentRowIndex) {
      const newCoordinate: CellCoordinate = {
        rowId: lines[newRowIndex].id,
        field: EDITABLE_FIELDS[currentFieldIndex],
      };
      setFocusedCell(newCoordinate);
      onCellFocus(newCoordinate);
    }
  }, [lines, onCellFocus]);

  // Check if navigation should occur on arrow keys (only when cursor is at edge)
  const shouldNavigateOnArrow = useCallback((element: HTMLElement): boolean => {
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      const input = element as HTMLInputElement | HTMLTextAreaElement;
      const isAtStart = input.selectionStart === 0;
      const isAtEnd = input.selectionEnd === input.value.length;
      return isAtStart || isAtEnd;
    }
    return true; // Navigate for other elements
  }, []);

  // Toggle row selection
  const toggleRowSelection = useCallback((rowId: string) => {
    setSelectedRows(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(rowId)) {
        newSelection.delete(rowId);
        onRowSelect(rowId, false);
      } else {
        newSelection.add(rowId);
        onRowSelect(rowId, true);
      }
      return newSelection;
    });
  }, [onRowSelect]);

  // Select all rows
  const selectAllRows = useCallback(() => {
    const allRowIds = new Set(lines.map(line => line.id));
    setSelectedRows(allRowIds);
    lines.forEach(line => onRowSelect(line.id, true));
  }, [lines, onRowSelect]);

  // Clear selection
  const clearSelection = useCallback(() => {
    selectedRows.forEach(rowId => onRowSelect(rowId, false));
    setSelectedRows(new Set());
  }, [selectedRows, onRowSelect]);

  // Delete selected rows
  const deleteSelectedRows = useCallback(async () => {
    if (selectedRows.size > 0 && onDeleteLines) {
      const confirmed = window.confirm(
        `Are you sure you want to delete ${selectedRows.size} line(s)?`
      );
      if (confirmed) {
        await onDeleteLines(Array.from(selectedRows));
        clearSelection();
      }
    }
  }, [selectedRows, onDeleteLines, clearSelection]);

  // Revert current edit
  const revertCurrentEdit = useCallback(() => {
    if (!focusedCell) return;
    
    // Find the currently focused input element
    const inputElement = document.querySelector(`input[name="${focusedCell.field}-${focusedCell.rowId}"]`) as HTMLInputElement;
    if (inputElement) {
      // Try to get the original value from data attribute or reset to empty
      const originalValue = inputElement.getAttribute('data-original-value');
      if (originalValue !== null) {
        inputElement.value = originalValue;
        // Clear the raw value if it exists
        delete inputElement.dataset.rawValue;
        // Trigger change event to update component state
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        // If no original value stored, clear the field
        inputElement.value = '';
        delete inputElement.dataset.rawValue;
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      console.log(`Reverted ${focusedCell.field} for row ${focusedCell.rowId} to: ${originalValue || ''}`);
    }
  }, [focusedCell]);

  // Main keyboard event handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!enabled || !focusedCell) return;

    const { rowIndex, fieldIndex } = getCurrentIndices(focusedCell);
    
    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        navigateHorizontal(rowIndex, fieldIndex, !e.shiftKey);
        break;
        
      case 'ArrowRight':
        if (shouldNavigateOnArrow(e.currentTarget as HTMLElement)) {
          e.preventDefault();
          navigateHorizontal(rowIndex, fieldIndex, true);
        }
        break;
        
      case 'ArrowLeft':
        if (shouldNavigateOnArrow(e.currentTarget as HTMLElement)) {
          e.preventDefault();
          navigateHorizontal(rowIndex, fieldIndex, false);
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        navigateVertical(rowIndex, fieldIndex, false);
        break;
        
      case 'ArrowDown':
      case 'Enter':
        e.preventDefault();
        navigateVertical(rowIndex, fieldIndex, true);
        break;
        
      case 'Escape':
        e.preventDefault();
        revertCurrentEdit();
        break;
        
      // Bulk operations
      case 'Delete':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          deleteSelectedRows();
        }
        break;
        
      case 'Insert':
        if (onAddLine) {
          e.preventDefault();
          onAddLine();
        }
        break;
        
      case 'z':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (e.shiftKey && onRedo) {
            onRedo();
          } else if (onUndo) {
            onUndo();
          }
        }
        break;
        
      case 'y':
        if ((e.ctrlKey || e.metaKey) && onRedo) {
          e.preventDefault();
          onRedo();
        }
        break;
        
      case 'a':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          selectAllRows();
        }
        break;
        
      case ' ':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          toggleRowSelection(focusedCell.rowId);
        }
        break;
        
      case 's':
        if ((e.ctrlKey || e.metaKey) && onSaveAll) {
          e.preventDefault();
          onSaveAll();
        }
        break;
    }
  }, [
    enabled, 
    focusedCell, 
    getCurrentIndices, 
    navigateHorizontal, 
    navigateVertical, 
    shouldNavigateOnArrow,
    revertCurrentEdit,
    deleteSelectedRows,
    selectAllRows,
    toggleRowSelection,
    onAddLine,
    onSaveAll,
    onUndo,
    onRedo,
  ]);

  // Focus first cell when lines change or navigation is enabled
  useEffect(() => {
    if (enabled && lines.length > 0 && !focusedCell) {
      const firstCoordinate: CellCoordinate = {
        rowId: lines[0].id,
        field: EDITABLE_FIELDS[0],
      };
      setFocusedCell(firstCoordinate);
      onCellFocus(firstCoordinate);
    }
  }, [enabled, lines, focusedCell, onCellFocus]);

  // Public API
  const focusCell = useCallback((coordinate: CellCoordinate) => {
    setFocusedCell(coordinate);
    onCellFocus(coordinate);
  }, [onCellFocus]);

  const focusNextField = useCallback(() => {
    if (focusedCell) {
      const { rowIndex, fieldIndex } = getCurrentIndices(focusedCell);
      navigateHorizontal(rowIndex, fieldIndex, true);
    }
  }, [focusedCell, getCurrentIndices, navigateHorizontal]);

  const focusPreviousField = useCallback(() => {
    if (focusedCell) {
      const { rowIndex, fieldIndex } = getCurrentIndices(focusedCell);
      navigateHorizontal(rowIndex, fieldIndex, false);
    }
  }, [focusedCell, getCurrentIndices, navigateHorizontal]);

  const focusNextRow = useCallback(() => {
    if (focusedCell) {
      const { rowIndex, fieldIndex } = getCurrentIndices(focusedCell);
      navigateVertical(rowIndex, fieldIndex, true);
    }
  }, [focusedCell, getCurrentIndices, navigateVertical]);

  const focusPreviousRow = useCallback(() => {
    if (focusedCell) {
      const { rowIndex, fieldIndex } = getCurrentIndices(focusedCell);
      navigateVertical(rowIndex, fieldIndex, false);
    }
  }, [focusedCell, getCurrentIndices, navigateVertical]);

  return {
    // State
    focusedCell,
    selectedRows,
    
    // Event handlers
    handleKeyDown,
    
    // Navigation API
    focusCell,
    focusNextField,
    focusPreviousField,
    focusNextRow,
    focusPreviousRow,
    
    // Selection API
    toggleRowSelection,
    selectAllRows,
    clearSelection,
    
    // Container props
    containerProps: {
      onKeyDown: handleKeyDown,
      tabIndex: -1,
      role: 'grid',
      'aria-label': 'Estimate lines table',
    },
    
    // Utilities
    isRowSelected: (rowId: string) => selectedRows.has(rowId),
    isCellFocused: (rowId: string, field: keyof EstimateLine) =>
      focusedCell?.rowId === rowId && focusedCell?.field === field,
    getSelectedCount: () => selectedRows.size,
  };
}

// Hook for keyboard shortcuts help
export function useKeyboardShortcuts() {
  const [isVisible, setIsVisible] = useState(false);

  const shortcuts = [
    { key: 'Tab / Shift+Tab', action: 'Navigate between cells' },
    { key: 'Arrow Keys', action: 'Navigate cells (when at input edge)' },
    { key: 'Enter', action: 'Move to cell below' },
    { key: 'Escape', action: 'Cancel current edit' },
    { key: 'Ctrl+A', action: 'Select all rows' },
    { key: 'Ctrl+Space', action: 'Toggle row selection' },
    { key: 'Ctrl+Delete', action: 'Delete selected rows' },
    { key: 'Insert', action: 'Add new line' },
    { key: 'Ctrl+Z', action: 'Undo last change' },
    { key: 'Ctrl+Shift+Z / Ctrl+Y', action: 'Redo last change' },
    { key: 'Ctrl+S', action: 'Save all pending changes' },
  ];

  const toggleVisibility = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  const hideShortcuts = useCallback(() => {
    setIsVisible(false);
  }, []);

  const showShortcuts = useCallback(() => {
    setIsVisible(true);
  }, []);

  return {
    shortcuts,
    isVisible,
    toggleVisibility,
    hideShortcuts,
    showShortcuts,
  };
}