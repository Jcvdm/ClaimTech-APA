"use client";

// src/features/claims/components/ClaimList/ExpandableRow.tsx
import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/trpc/react';
import { type ClaimWithRelations } from '@/lib/api/domains/claims';
import { usePrefetchClaim } from '@/lib/api/domains/claims/usePrefetchClaim';
import { SummaryContent } from './SummaryContent';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { flexRender, type Cell } from "@tanstack/react-table";

// Add debounce utility function
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return function(this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

// Add a new useStableCallback function to prevent unnecessarily recreating debounced functions
function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = React.useRef(callback);

  // Update the ref each render so we always have the latest callback
  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Return a stable function that uses the ref
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useCallback(
    ((...args: any[]) => callbackRef.current(...args)) as T,
    [] // Empty dependency array ensures the function reference is stable
  );
}

interface ExpandableRowProps {
  claim: ClaimWithRelations;
  cells: Cell<any, unknown>[]; // Use proper Cell type from TanStack Table
  columnsCount: number; // Added total columns count
  isExpanded: boolean;
  onToggle: () => void;
}

export function ExpandableRow({
  claim,
  cells,
  columnsCount,
  isExpanded,
  onToggle
}: ExpandableRowProps) {
  // Use the new prefetching hook
  const { handleRowHover, handleOpenClaimHover } = usePrefetchClaim();

  // Fetch summary data when expanded
  const { data: summary, isLoading, isError } = api.claim.getSummary.useQuery(
    { id: claim.id },
    {
      enabled: isExpanded,
      staleTime: 5 * 60 * 1000,
      refetchOnMount: false,
    }
  );

  // Create stable callback functions that use the claim ID
  const handleThisRowHover = React.useCallback(() => {
    handleRowHover(claim.id);
  }, [claim.id, handleRowHover]);

  const handleThisDetailsHover = React.useCallback(() => {
    handleOpenClaimHover(claim.id);
  }, [claim.id, handleOpenClaimHover]);

  // Render the main row
  if (!isExpanded) {
    return (
      <TableRow
        className=""
        data-state="collapsed"
        onMouseEnter={handleThisRowHover}
      >
        <TableCell className="w-10">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onToggle}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </TableCell>
        {React.useMemo(() => cells.map((cell, index) => {
          // Add defensive checks
          if (!cell) return <TableCell key={`empty-cell-${index}`}></TableCell>;

          try {
            return (
              <TableCell key={cell.id || `cell-${index}`}>
                {cell.column?.columnDef?.cell
                  ? flexRender(cell.column.columnDef.cell, cell.getContext())
                  : null}
              </TableCell>
            );
          } catch (error) {
            console.error("Error rendering cell:", error);
            return <TableCell key={`error-cell-${cell?.id || index}`}>Error</TableCell>;
          }
        }), [cells])}
      </TableRow>
    );
  }

  // Render both rows when expanded
  return (
    <React.Fragment>
      <TableRow
        className="bg-muted/50"
        data-state="expanded"
        onMouseEnter={handleThisRowHover}
      >
        <TableCell className="w-10">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onToggle}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </TableCell>
        {React.useMemo(() => cells.map((cell, index) => {
          // Add defensive checks
          if (!cell) return <TableCell key={`empty-cell-${index}`}></TableCell>;

          try {
            return (
              <TableCell key={cell.id || `cell-${index}`}>
                {cell.column?.columnDef?.cell
                  ? flexRender(cell.column.columnDef.cell, cell.getContext())
                  : null}
              </TableCell>
            );
          } catch (error) {
            console.error("Error rendering cell:", error);
            return <TableCell key={`error-cell-${cell?.id || index}`}>Error</TableCell>;
          }
        }), [cells])}
      </TableRow>
      <TableRow className="bg-muted/30">
        <TableCell colSpan={columnsCount + 1} className="p-0">
          <div className="p-4 border-t">
            {/* PRIORITIZE showing summary if available, even if isLoading is briefly true */}
            {summary && Object.keys(summary).length > 0 ? (
              <div className="space-y-4">
                <SummaryContent summary={summary} />
                <div className="flex justify-end">
                  <Link href={`/claims/${claim.id}`} passHref>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-2"
                      onMouseEnter={handleThisDetailsHover}
                    >
                      Open Claim
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ) : isLoading ? ( // Show skeleton ONLY if summary is NOT available AND isLoading is true
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : isError ? ( // Show error if not loading and no summary
              <div className="text-destructive p-2">
                Error loading claim details
              </div>
            ) : ( // Fallback if no summary, not loading, and no error
              <div className="text-muted-foreground p-2">
                No details available
              </div>
            )}
          </div>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}
