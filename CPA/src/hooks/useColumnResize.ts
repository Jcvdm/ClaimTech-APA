import { useState, useEffect, useCallback, useRef } from 'react';

export interface ColumnWidths {
  [columnKey: string]: number;
}

export interface UseColumnResizeOptions {
  /** Unique key for localStorage persistence */
  storageKey: string;
  /** Default column widths */
  defaultWidths: ColumnWidths;
  /** Minimum width for any column */
  minWidth?: number;
  /** Maximum width for any column */
  maxWidth?: number;
  /** Callback when column widths change */
  onWidthChange?: (widths: ColumnWidths) => void;
}

export interface UseColumnResizeReturn {
  /** Current column widths */
  columnWidths: ColumnWidths;
  /** Whether a column is currently being resized */
  isResizing: boolean;
  /** The column currently being resized */
  resizingColumn: string | null;
  /** Props to spread on resize handles */
  getResizeHandleProps: (columnKey: string) => {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onDoubleClick: (e: React.MouseEvent) => void;
    style: React.CSSProperties;
    className: string;
  };
  /** Get width for a specific column */
  getColumnWidth: (columnKey: string) => number;
  /** Manually set width for a column */
  setColumnWidth: (columnKey: string, width: number) => void;
  /** Reset all columns to default widths */
  resetColumnWidths: () => void;
  /** Auto-size a column based on content */
  autoSizeColumn: (columnKey: string, tableElement?: HTMLElement) => void;
}

export function useColumnResize({
  storageKey,
  defaultWidths,
  minWidth = 80,
  maxWidth = 500,
  onWidthChange,
}: UseColumnResizeOptions): UseColumnResizeReturn {
  // Load initial widths from localStorage or use defaults
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new columns
        return { ...defaultWidths, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load column widths from localStorage:', error);
    }
    return defaultWidths;
  });

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  
  // Refs for resize handling
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  // Save to localStorage whenever widths change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(columnWidths));
      onWidthChange?.(columnWidths);
    } catch (error) {
      console.warn('Failed to save column widths to localStorage:', error);
    }
  }, [columnWidths, storageKey, onWidthChange]);

  // Constrain width to min/max bounds
  const constrainWidth = useCallback((width: number): number => {
    return Math.max(minWidth, Math.min(maxWidth, width));
  }, [minWidth, maxWidth]);

  // Get width for a specific column
  const getColumnWidth = useCallback((columnKey: string): number => {
    return columnWidths[columnKey] || defaultWidths[columnKey] || minWidth;
  }, [columnWidths, defaultWidths, minWidth]);

  // Set width for a specific column
  const setColumnWidth = useCallback((columnKey: string, width: number) => {
    const constrainedWidth = constrainWidth(width);
    setColumnWidths(prev => ({
      ...prev,
      [columnKey]: constrainedWidth,
    }));
  }, [constrainWidth]);

  // Reset all columns to default widths
  const resetColumnWidths = useCallback(() => {
    setColumnWidths(defaultWidths);
  }, [defaultWidths]);

  // Auto-size a column based on content
  const autoSizeColumn = useCallback((columnKey: string, tableElement?: HTMLElement) => {
    if (!tableElement) {
      // If no table element provided, try to find it
      tableElement = document.querySelector('table') as HTMLElement;
    }
    
    if (!tableElement) {
      console.warn('No table element found for auto-sizing');
      return;
    }

    // Find all cells in this column
    const columnIndex = Object.keys(columnWidths).indexOf(columnKey);
    if (columnIndex === -1) return;

    const cells = tableElement.querySelectorAll(`tr > :nth-child(${columnIndex + 1})`);
    let maxWidth = minWidth;

    // Create a temporary element to measure text width
    const measureElement = document.createElement('div');
    measureElement.style.position = 'absolute';
    measureElement.style.visibility = 'hidden';
    measureElement.style.whiteSpace = 'nowrap';
    measureElement.style.fontSize = '14px'; // Match table font size
    measureElement.style.fontFamily = getComputedStyle(tableElement).fontFamily;
    document.body.appendChild(measureElement);

    try {
      cells.forEach((cell) => {
        const text = cell.textContent || '';
        measureElement.textContent = text;
        const textWidth = measureElement.offsetWidth + 32; // Add padding
        maxWidth = Math.max(maxWidth, textWidth);
      });
    } finally {
      document.body.removeChild(measureElement);
    }

    setColumnWidth(columnKey, maxWidth);
  }, [columnWidths, minWidth, setColumnWidth]);

  // Handle mouse move during resize
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !resizingColumn) return;

    e.preventDefault();
    
    const deltaX = e.clientX - resizeStartX.current;
    const newWidth = resizeStartWidth.current + deltaX;
    const constrainedWidth = constrainWidth(newWidth);
    
    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn]: constrainedWidth,
    }));
  }, [resizingColumn, constrainWidth]);

  // Handle touch move during resize
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || !resizingColumn) return;

    e.preventDefault();
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - resizeStartX.current;
    const newWidth = resizeStartWidth.current + deltaX;
    const constrainedWidth = constrainWidth(newWidth);
    
    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn]: constrainedWidth,
    }));
  }, [resizingColumn, constrainWidth]);

  // Handle end of resize
  const handleResizeEnd = useCallback(() => {
    if (!isDragging.current) return;

    isDragging.current = false;
    setIsResizing(false);
    setResizingColumn(null);
    
    // Reset cursor
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleResizeEnd);
  }, [handleMouseMove, handleTouchMove]);

  // Add event listeners when starting resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleResizeEnd);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleResizeEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleResizeEnd);
      };
    }
  }, [isResizing, handleMouseMove, handleResizeEnd, handleTouchMove]);

  // Get props for resize handles
  const getResizeHandleProps = useCallback((columnKey: string) => {
    const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      isDragging.current = true;
      setIsResizing(true);
      setResizingColumn(columnKey);
      
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = getColumnWidth(columnKey);
      
      // Set cursor for the entire document
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    const handleTouchStart = (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const touch = e.touches[0];
      
      isDragging.current = true;
      setIsResizing(true);
      setResizingColumn(columnKey);
      
      resizeStartX.current = touch.clientX;
      resizeStartWidth.current = getColumnWidth(columnKey);
      
      // Set cursor for the entire document
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      autoSizeColumn(columnKey);
    };

    return {
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
      onDoubleClick: handleDoubleClick,
      style: {
        cursor: 'col-resize',
        userSelect: 'none' as const,
      },
      className: 'column-resize-handle',
    };
  }, [getColumnWidth, autoSizeColumn]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isDragging.current) {
        handleResizeEnd();
      }
    };
  }, [handleResizeEnd]);

  return {
    columnWidths,
    isResizing,
    resizingColumn,
    getResizeHandleProps,
    getColumnWidth,
    setColumnWidth,
    resetColumnWidths,
    autoSizeColumn,
  };
}