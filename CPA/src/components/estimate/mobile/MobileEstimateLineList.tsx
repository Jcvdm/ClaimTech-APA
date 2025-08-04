'use client';

import React, { useMemo, useState } from 'react';
import { type EstimateLine } from '@/lib/api/domains/estimates/types';
import { MobileEstimateLineCard } from './MobileEstimateLineCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Filter, 
  Plus, 
  SortAsc, 
  SortDesc,
  Grid3X3,
  List
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';

interface MobileEstimateLineListProps {
  lines: EstimateLine[];
  isLoading: boolean;
  selectedRows: Set<string>;
  onSelectionChange: (lineId: string, selected: boolean) => void;
  onAddLine: () => void;
  onEditLine: (lineId: string) => void;
  onDeleteLine: (lineId: string) => void;
  onDuplicateLine: (lineId: string) => void;
  readonly?: boolean;
}

type SortField = 'sequence' | 'description' | 'cost' | 'hours';
type SortDirection = 'asc' | 'desc';

export function MobileEstimateLineList({
  lines,
  isLoading,
  selectedRows,
  onSelectionChange,
  onAddLine,
  onEditLine,
  onDeleteLine,
  onDuplicateLine,
  readonly = false
}: MobileEstimateLineListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('sequence');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [filterIncluded, setFilterIncluded] = useState<boolean | null>(null);
  const [filterOperationCode, setFilterOperationCode] = useState<string | null>(null);

  // Get unique operation codes for filtering
  const operationCodes = useMemo(() => {
    const codes = new Set(lines.map(line => line.operation_code).filter(Boolean));
    return Array.from(codes).sort();
  }, [lines]);

  // Filter and sort lines
  const filteredAndSortedLines = useMemo(() => {
    let filtered = lines;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(line =>
        line.description?.toLowerCase().includes(term) ||
        line.part_number?.toLowerCase().includes(term) ||
        line.operation_code?.toLowerCase().includes(term) ||
        line.part_type?.toLowerCase().includes(term)
      );
    }

    // Apply inclusion filter
    if (filterIncluded !== null) {
      filtered = filtered.filter(line => line.is_included === filterIncluded);
    }

    // Apply operation code filter
    if (filterOperationCode) {
      filtered = filtered.filter(line => line.operation_code === filterOperationCode);
    }

    // Sort lines
    return filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'sequence':
          aValue = a.sequence_number || 0;
          bValue = b.sequence_number || 0;
          break;
        case 'description':
          aValue = a.description || '';
          bValue = b.description || '';
          break;
        case 'cost':
          aValue = (a.part_cost || 0) + (a.sublet_cost || 0);
          bValue = (b.part_cost || 0) + (b.sublet_cost || 0);
          break;
        case 'hours':
          aValue = (a.strip_fit_hours || 0) + (a.repair_hours || 0) + (a.paint_hours || 0);
          bValue = (b.strip_fit_hours || 0) + (b.repair_hours || 0) + (b.paint_hours || 0);
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === 'asc' 
          ? aValue - bValue
          : bValue - aValue;
      }
    });
  }, [lines, searchTerm, sortField, sortDirection, filterIncluded, filterOperationCode]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterIncluded(null);
    setFilterOperationCode(null);
  };

  const activeFilterCount = [
    searchTerm,
    filterIncluded !== null,
    filterOperationCode
  ].filter(Boolean).length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="space-y-3">
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search lines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* Sort options */}
              <DropdownMenuItem onClick={() => handleSort('sequence')}>
                {sortField === 'sequence' && sortDirection === 'asc' ? <SortAsc className="h-4 w-4 mr-2" /> : <SortDesc className="h-4 w-4 mr-2" />}
                Sort by Sequence
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => handleSort('description')}>
                {sortField === 'description' && sortDirection === 'asc' ? <SortAsc className="h-4 w-4 mr-2" /> : <SortDesc className="h-4 w-4 mr-2" />}
                Sort by Description
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => handleSort('cost')}>
                {sortField === 'cost' && sortDirection === 'asc' ? <SortAsc className="h-4 w-4 mr-2" /> : <SortDesc className="h-4 w-4 mr-2" />}
                Sort by Cost
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => handleSort('hours')}>
                {sortField === 'hours' && sortDirection === 'asc' ? <SortAsc className="h-4 w-4 mr-2" /> : <SortDesc className="h-4 w-4 mr-2" />}
                Sort by Hours
              </DropdownMenuItem>
              
              {activeFilterCount > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={clearFilters}>
                    Clear Filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Advanced Filters (collapsible) */}
        {showFilters && (
          <div className="p-3 bg-gray-50 rounded-lg space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Include Status
              </label>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant={filterIncluded === null ? "default" : "outline"}
                  onClick={() => setFilterIncluded(null)}
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={filterIncluded === true ? "default" : "outline"}
                  onClick={() => setFilterIncluded(true)}
                >
                  Included
                </Button>
                <Button
                  size="sm"
                  variant={filterIncluded === false ? "default" : "outline"}
                  onClick={() => setFilterIncluded(false)}
                >
                  Excluded
                </Button>
              </div>
            </div>

            {operationCodes.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Operation Code
                </label>
                <div className="flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant={filterOperationCode === null ? "default" : "outline"}
                    onClick={() => setFilterOperationCode(null)}
                  >
                    All
                  </Button>
                  {operationCodes.map(code => (
                    <Button
                      key={code}
                      size="sm"
                      variant={filterOperationCode === code ? "default" : "outline"}
                      onClick={() => setFilterOperationCode(code)}
                      className="text-xs"
                    >
                      {code}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {filteredAndSortedLines.length} of {lines.length} lines
          {selectedRows.size > 0 && ` • ${selectedRows.size} selected`}
        </span>
        
        {!readonly && (
          <Button onClick={onAddLine} size="sm" className="flex items-center space-x-1">
            <Plus className="h-4 w-4" />
            <span>Add Line</span>
          </Button>
        )}
      </div>

      {/* Line cards */}
      {filteredAndSortedLines.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchTerm || activeFilterCount > 0 ? (
            <>
              <div className="mb-2">No lines match your filters</div>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </>
          ) : (
            <>
              <div className="mb-2">No estimate lines found</div>
              {!readonly && (
                <Button onClick={onAddLine}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Line
                </Button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndSortedLines.map((line) => (
            <MobileEstimateLineCard
              key={line.id}
              line={line}
              allLines={lines}
              isSelected={selectedRows.has(line.id)}
              onSelectionChange={(selected) => onSelectionChange(line.id, selected)}
              onEdit={() => onEditLine(line.id)}
              onDelete={() => onDeleteLine(line.id)}
              onDuplicate={() => onDuplicateLine(line.id)}
              readonly={readonly}
            />
          ))}
        </div>
      )}
    </div>
  );
}