"use client"

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
  ExpandedState,
  getExpandedRowModel,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import React from "react"
import { Search, X, Filter } from "lucide-react"
import { ExpandableRow } from "@/features/claims/components/ClaimList/ExpandableRow"
import { type ClaimWithRelations } from "@/app/claims/columns"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  defaultFilterColumn?: string
  excludeFilterColumns?: string[]
  enableExpanding?: boolean
}

interface DataTableFilterProps<TData> {
  table: any
  defaultFilterColumn?: string
  excludeFilterColumns?: string[]
}

function DataTableFilter<TData>({
  table,
  defaultFilterColumn = "",
  excludeFilterColumns = ["select", "actions"]
}: DataTableFilterProps<TData>) {
  const [selectedColumn, setSelectedColumn] = React.useState<string>(defaultFilterColumn || "")
  const [filterValue, setFilterValue] = React.useState<string>("")

  // Get filterable columns (exclude specified columns)
  const filterableColumns = table.getAllColumns().filter(
    (column: any) => !excludeFilterColumns.includes(column.id)
  )

  // Set initial selected column if not set and columns are available
  React.useEffect(() => {
    if (!selectedColumn && filterableColumns.length > 0) {
      setSelectedColumn(filterableColumns[0].id)
    }
  }, [filterableColumns, selectedColumn])

  // Apply filter when value changes
  React.useEffect(() => {
    if (selectedColumn) {
      table.getColumn(selectedColumn)?.setFilterValue(filterValue)
    }
  }, [filterValue, selectedColumn, table])

  // Clear the current filter
  const handleClearFilter = () => {
    setFilterValue("")
    if (selectedColumn) {
      table.getColumn(selectedColumn)?.setFilterValue("")
    }
  }

  // Change the selected column
  const handleColumnChange = (columnId: string) => {
    // Clear previous column filter
    if (selectedColumn) {
      table.getColumn(selectedColumn)?.setFilterValue("")
    }
    setSelectedColumn(columnId)
    setFilterValue("") // Reset filter value when changing column
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 w-[150px] justify-between">
              <span>{table.getColumn(selectedColumn)?.columnDef.header || "Field"}</span>
              <Filter className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {filterableColumns.map((column: any) => (
              <DropdownMenuItem
                key={column.id}
                onClick={() => handleColumnChange(column.id)}
                className={selectedColumn === column.id ? "bg-accent" : ""}
              >
                {column.columnDef.header}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative w-full">
          <Input
            placeholder={`Filter by ${table.getColumn(selectedColumn)?.columnDef.header || "field"}...`}
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="h-9 w-[200px] pl-8"
          />
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          {filterValue && (
            <Button
              variant="ghost"
              onClick={handleClearFilter}
              className="absolute right-0.5 top-0.5 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function DataTable<TData, TValue>({
  columns,
  data,
  defaultFilterColumn,
  excludeFilterColumns = ["select", "actions"],
  enableExpanding = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [expanded, setExpanded] = React.useState<ExpandedState>({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onExpandedChange: setExpanded,
    state: {
      sorting,
      columnFilters,
      expanded,
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between py-4">
        <DataTableFilter
          table={table}
          defaultFilterColumn={defaultFilterColumn}
          excludeFilterColumns={excludeFilterColumns}
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              enableExpanding ? (
                // Combine validation and mapping into a single IIFE
                (() => {
                  // Validate data
                  if (!Array.isArray(data)) {
                    console.error("DataTable received non-array data:", data);
                    return <TableRow><TableCell colSpan={columns.length}>Error: Invalid data format</TableCell></TableRow>;
                  }

                  // Log the first item for debugging
                  if (data.length > 0) {
                    console.log("First data item:", data[0]);
                  }

                  // Return the mapped rows
                  return table.getRowModel().rows.map((row) => {
                    const claim = row.original as ClaimWithRelations;
                    const isExpanded = row.getIsExpanded();
                    const cells = row.getVisibleCells();

                    // Add debugging
                    console.log(`Row ${row.id} cells:`, cells);
                    if (cells.length > 0) {
                      console.log(`First cell structure:`, {
                        id: cells[0].id,
                        column: {
                          id: cells[0].column.id,
                          columnDef: cells[0].column.columnDef,
                        },
                        getContext: typeof cells[0].getContext === 'function' ? 'function' : 'not a function'
                      });
                    }

                    return (
                      <ExpandableRow
                        key={row.id}
                        claim={claim}
                        cells={cells}
                        columnsCount={columns.length}
                        isExpanded={isExpanded}
                        onToggle={() => row.toggleExpanded()}
                      />
                    );
                  });
                })()
              ) : (
                // Use standard rows for non-expandable tables
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
