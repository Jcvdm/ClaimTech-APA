"use client";

// src/features/claims/components/ClaimList/ExpandableRow.tsx
import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/trpc/react';
import {
  type ClaimWithRelations,
  type ClaimSummary,
  QUERY_KEYS,
  CACHE_TIMES
} from '@/lib/api/domains/claims';
import { claimsApi } from '@/lib/api/domains/claims';
import { usePrefetchOnHover } from '@/lib/api/domains/claims/claimCache';
import { SummaryContent } from './SummaryContent';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { flexRender, type Cell } from "@tanstack/react-table";
import { useQueryClient } from '@tanstack/react-query';

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
  // Use the prefetch on hover hook (this returns no-op functions that won't cause errors)
  const { handleRowHover, handleDetailsHover: handleOpenClaimHover } = usePrefetchOnHover();

  // Get the query client directly using the useQueryClient hook
  const queryClient = useQueryClient();

  // Check if summary data is already in the cache using predefined query keys
  let cachedSummary: ClaimSummary | undefined;

  try {
    // Use the predefined query keys from constants
    const clientQueryKey = QUERY_KEYS.getSummaryKey(claim.id);
    cachedSummary = queryClient.getQueryData(clientQueryKey);

    if (cachedSummary) {
      console.log(`[ExpandableRow] Found cached data for claim ${claim.id} with client query key`);
    } else {
      // If not found with client key, try the tRPC format
      const trpcQueryKey = QUERY_KEYS.TRPC.SUMMARY(claim.id);
      cachedSummary = queryClient.getQueryData(trpcQueryKey);

      if (cachedSummary) {
        console.log(`[ExpandableRow] Found cached data for claim ${claim.id} with tRPC query key`);
      }
    }
  } catch (error) {
    console.error(`[ExpandableRow] Error checking cache for claim ${claim.id}:`, error);
  }

  // Log whether we're using cached data
  React.useEffect(() => {
    if (isExpanded) {
      console.log(`[ExpandableRow] Claim ${claim.id} expanded, cached summary: ${!!cachedSummary}`);

      if (cachedSummary) {
        console.log(`[ExpandableRow] Using cached summary data for claim ${claim.id}`);
      } else {
        console.log(`[ExpandableRow] No cached summary found for claim ${claim.id}, will fetch from API`);

        // Log available cache keys for debugging
        const allQueries = queryClient.getQueryCache().getAll();
        const claimQueries = allQueries.filter(q =>
          JSON.stringify(q.queryKey).includes('claim') &&
          JSON.stringify(q.queryKey).includes(claim.id)
        );

        if (claimQueries.length > 0) {
          console.log(`[ExpandableRow] Found ${claimQueries.length} related queries for claim ${claim.id}:`,
            claimQueries.map(q => ({ key: q.queryKey, dataExists: !!q.state.data }))
          );
        }
      }
    }
  }, [isExpanded, claim.id, cachedSummary, queryClient]);



  // Use state to manage data loading with server-side fetching approach
  const [summary, setSummary] = React.useState<ClaimSummary | undefined>(cachedSummary);
  const [isLoading, setIsLoading] = React.useState(!cachedSummary && isExpanded);
  const [isError, setIsError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  // Fetch data when expanded
  React.useEffect(() => {
    // If not expanded, do nothing
    if (!isExpanded) return;

    // If we already have data (from cache or previous fetch), use it
    if (summary) {
      console.log(`[ExpandableRow] Using existing data for claim ${claim.id}`);
      return;
    }

    // Otherwise, fetch the data using the direct fetch function
    setIsLoading(true);
    setIsError(false);
    setError(null);

    console.log(`[ExpandableRow] Fetching summary for claim ${claim.id} using direct fetch`);

    // Use the fetchClaimSummary function from claimsApi
    claimsApi.queries.fetchClaimSummary(claim.id)
      .then(data => {
        if (data) {
          console.log(`[ExpandableRow] Direct fetch succeeded for claim ${claim.id}`);
          setSummary(data);

          // Also store in cache for future use
          const clientQueryKey = QUERY_KEYS.getSummaryKey(claim.id);
          queryClient.setQueryData(clientQueryKey, data);
        } else {
          console.warn(`[ExpandableRow] Direct fetch returned null for claim ${claim.id}`);
          setIsError(true);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error(`[ExpandableRow] Direct fetch failed for claim ${claim.id}:`, err);
        setIsError(true);
        setError(err as Error);
        setIsLoading(false);
      });
  }, [isExpanded, claim.id, summary, queryClient]);

  // No need for fallback variables anymore since we're using a direct approach

  // Create stable callback functions that use the claim ID
  const handleThisRowHover = React.useCallback(() => {
    // Just pass the claim ID to the hover handler
    handleRowHover(claim.id);
  }, [claim.id, handleRowHover]);

  const handleThisDetailsHover = React.useCallback(() => {
    // Just pass the claim ID to the hover handler
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
            // Check if cell has all required properties
            if (!cell.column || !cell.column.columnDef) {
              console.warn(`Cell ${index} missing column or columnDef:`, cell);
              return <TableCell key={`incomplete-cell-${index}`}>{cell.getValue?.() || ''}</TableCell>;
            }

            // Check if getContext is a function
            if (typeof cell.getContext !== 'function') {
              console.warn(`Cell ${index} getContext is not a function:`, cell);
              return (
                <TableCell key={`no-context-cell-${index}`}>
                  {cell.getValue?.() || ''}
                </TableCell>
              );
            }

            // Get context safely
            let context;
            try {
              context = cell.getContext();
            } catch (contextError) {
              console.error(`Error getting context for cell ${index}:`, contextError);
              return <TableCell key={`context-error-cell-${index}`}>{cell.getValue?.() || ''}</TableCell>;
            }

            // Render with full context if available
            return (
              <TableCell key={cell.id || `cell-${index}`}>
                {cell.column.columnDef.cell
                  ? flexRender(cell.column.columnDef.cell, context)
                  : cell.getValue?.() || ''}
              </TableCell>
            );
          } catch (error) {
            console.error(`Error rendering cell ${index}:`, error);
            return <TableCell key={`error-cell-${index}`}>Error</TableCell>;
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
            // Check if cell has all required properties
            if (!cell.column || !cell.column.columnDef) {
              console.warn(`Cell ${index} missing column or columnDef:`, cell);
              return <TableCell key={`incomplete-cell-${index}`}>{cell.getValue?.() || ''}</TableCell>;
            }

            // Check if getContext is a function
            if (typeof cell.getContext !== 'function') {
              console.warn(`Cell ${index} getContext is not a function:`, cell);
              return (
                <TableCell key={`no-context-cell-${index}`}>
                  {cell.getValue?.() || ''}
                </TableCell>
              );
            }

            // Get context safely
            let context;
            try {
              context = cell.getContext();
            } catch (contextError) {
              console.error(`Error getting context for cell ${index}:`, contextError);
              return <TableCell key={`context-error-cell-${index}`}>{cell.getValue?.() || ''}</TableCell>;
            }

            // Render with full context if available
            return (
              <TableCell key={cell.id || `cell-${index}`}>
                {cell.column.columnDef.cell
                  ? flexRender(cell.column.columnDef.cell, context)
                  : cell.getValue?.() || ''}
              </TableCell>
            );
          } catch (error) {
            console.error(`Error rendering cell ${index}:`, error);
            return <TableCell key={`error-cell-${index}`}>Error</TableCell>;
          }
        }), [cells])}
      </TableRow>
      <TableRow className="bg-muted/30">
        <TableCell colSpan={columnsCount + 1} className="p-0">
          <div className="p-4 border-t">
            {/* Show a message if we're using cached data */}
            {cachedSummary && summary === cachedSummary && (
              <div className="mb-2 text-xs text-blue-600 bg-blue-50 p-1 rounded">
                Using cached data
              </div>
            )}

            {/* PRIORITIZE showing summary if available, even if loading is briefly true */}
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
                <div className="flex items-center">
                  <Skeleton className="h-4 w-1/3" />
                  <span className="ml-2 text-xs text-muted-foreground animate-pulse">
                    Loading...
                  </span>
                </div>
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : isError ? ( // Show error if not loading and no summary
              <div className="text-destructive p-2">
                <p>Error loading claim details</p>
                {error && (
                  <p className="text-xs mt-1">
                    {error.message || "Unknown error"}
                  </p>
                )}
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
