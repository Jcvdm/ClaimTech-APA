"use client";

// src/features/claims/components/ClaimList/index.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useClaimsList, type ClaimListParams } from '@/lib/api/domains/claims';
import { ExpandableRow } from './ExpandableRow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiStatus } from '@/lib/api/types';
// Client-side prefetching has been replaced with server-side prefetching
import { type Column } from '../../types/column';

interface ClaimListProps {
  columns?: Column[];
  initialParams?: Partial<ClaimListParams>;
  initialData?: any[]; // Add initialData prop for server-prefetched data
}

export function ClaimList({ columns = [], initialParams = {}, initialData }: ClaimListProps) {
  // State for search and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [params, setParams] = useState<ClaimListParams>({
    filter: initialParams.filter || 'active',
    page: initialParams.page || 1,
    limit: initialParams.limit || 20,
    search: initialParams.search || '',
    sortBy: initialParams.sortBy || 'created_at',
    sortOrder: initialParams.sortOrder || 'desc'
  });

  // Fetch claims data with initialData if provided
  const { data, status, error } = useClaimsList(params, {
    initialData: initialData ? {
      items: initialData,
      pagination: {
        total: initialData.length,
        pages: 1,
        current: 1,
        hasMore: false
      }
    } : undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes - match the existing prefetch config
  });

  // Client-side prefetching has been replaced with server-side prefetching

  // Expandable row state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Toggle row expansion
  const toggleExpansion = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Closing the row
        next.delete(id);
      } else {
        // Clear any other expanded rows (only one row can be expanded at a time)
        next.clear();
        next.add(id);

        // Server-side prefetching handles data loading now
        console.log(`[ExpandableRow] Expanding row for claim ${id}`);
      }
      return next;
    });
  }, []);

  // Check if a row is expanded
  const isExpanded = useCallback((id: string) => {
    return expandedRows.has(id);
  }, [expandedRows]);

  // Handle search
  const handleSearch = () => {
    setParams(prev => ({ ...prev, search: searchTerm, page: 1 }));
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchTerm('');
    setParams(prev => ({ ...prev, search: '', page: 1 }));
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setParams(prev => ({ ...prev, page: newPage }));
  };

  // Server-side prefetching now handles data loading
  useEffect(() => {
    if (data?.items && data.items.length > 0) {
      console.log(`[ClaimList] Loaded ${data.items.length} claims (server-prefetched data available)`);
    }
  }, [data?.items]);

  // Render cell content
  const renderCell = useCallback((claim: any, column: Column) => {
    return column.cell(claim);
  }, []);

  // If loading, show skeleton UI
  if (status === ApiStatus.LOADING) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton key="search-skeleton" className="h-10 w-[250px]" />
          <Skeleton key="button-skeleton" className="h-10 w-[100px]" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead key="expansion-column" className="w-10"></TableHead>
                {columns.map((column) => (
                  <TableHead key={column.id} className={column.className}>
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-row-${i}`}>
                  <TableCell key={`skeleton-expand-${i}`} className="w-10">
                    <Skeleton className="h-6 w-6" />
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell key={`skeleton-${i}-${column.id}`} className={column.className}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // If error, show error message
  if (status === ApiStatus.ERROR) {
    return (
      <div className="rounded-md border border-destructive p-4 text-destructive">
        Error loading claims: {error?.message || 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search claims..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          {searchTerm && (
            <Button
              variant="ghost"
              onClick={handleClearSearch}
              className="absolute right-0.5 top-0.5 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button onClick={handleSearch} size="sm">
          Search
        </Button>
      </div>

      {/* Claims table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead key="expansion-column" className="w-10"></TableHead>
              {columns.map((column) => (
                <TableHead key={column.id} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items && data.items.length > 0 ?
              // Use a stable key for each row
              data.items.map((claim) => (
                <ExpandableRow
                  key={claim.id}
                  claim={claim}
                  columns={columns}
                  isExpanded={isExpanded(claim.id)}
                  onToggle={() => toggleExpansion(claim.id)}
                  renderCell={renderCell}
                />
              ))
            : (
              <TableRow key="empty-row">
                <TableCell colSpan={columns.length + 1} className="h-24 text-center">
                  No claims found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data?.pagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {data.items.length} of {data.pagination.total} claims
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(params.page - 1)}
              disabled={params.page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {params.page} of {data.pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(params.page + 1)}
              disabled={params.page >= data.pagination.pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
