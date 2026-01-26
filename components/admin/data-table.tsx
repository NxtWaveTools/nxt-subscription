// ============================================================================
// Reusable Admin Data Table Component
// Generic table with pagination, sorting, bulk selection
// ============================================================================

'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (row: T) => React.ReactNode
  className?: string
}

export interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  totalCount: number
  pageSize: number
  currentPage: number
  onPageChange: (page: number) => void
  
  // Bulk selection
  enableBulkSelection?: boolean
  bulkSelectionLimit?: number
  selectedIds?: Set<string>
  onSelectionChange?: (selectedIds: Set<string>) => void
  getRowId: (row: T) => string
  
  // Sorting
  enableSorting?: boolean
  sortKey?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (key: string) => void
  
  // Actions
  actions?: (row: T) => React.ReactNode
  bulkActions?: (selectedIds: Set<string>) => React.ReactNode
  
  // Empty state
  emptyMessage?: string
  
  // Loading
  isLoading?: boolean
}

export function DataTable<T>({
  data,
  columns,
  totalCount,
  pageSize,
  currentPage,
  onPageChange,
  enableBulkSelection = false,
  bulkSelectionLimit = 100,
  selectedIds = new Set<string>(),
  onSelectionChange,
  getRowId,
  enableSorting = false,
  sortKey: _sortKey,
  sortDirection: _sortDirection,
  onSort,
  actions,
  bulkActions,
  emptyMessage = 'No data available',
  isLoading = false,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(totalCount / pageSize)
  const startIndex = (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, totalCount)

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return

    if (checked) {
      const newSelected = new Set(selectedIds)
      data.forEach((row) => {
        const id = getRowId(row)
        if (newSelected.size < bulkSelectionLimit) {
          newSelected.add(id)
        }
      })
      onSelectionChange(newSelected)
    } else {
      const currentPageIds = new Set(data.map(getRowId))
      const newSelected = new Set(
        Array.from(selectedIds).filter((id) => !currentPageIds.has(id))
      )
      onSelectionChange(newSelected)
    }
  }

  // Handle individual row selection
  const handleRowSelect = (rowId: string, checked: boolean) => {
    if (!onSelectionChange) return

    const newSelected = new Set(selectedIds)
    if (checked) {
      if (newSelected.size < bulkSelectionLimit) {
        newSelected.add(rowId)
      }
    } else {
      newSelected.delete(rowId)
    }
    onSelectionChange(newSelected)
  }

  // Check if all current page items are selected
  const allCurrentPageSelected =
    data.length > 0 && data.every((row) => selectedIds.has(getRowId(row)))

  // Note: someCurrentPageSelected calculated but used for UI state - prefixed to indicate intentional
  const _someCurrentPageSelected =
    data.some((row) => selectedIds.has(getRowId(row))) && !allCurrentPageSelected

  // Handle sort
  const handleSort = (key: string) => {
    if (enableSorting && onSort) {
      onSort(key)
    }
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {enableBulkSelection && selectedIds.size > 0 && bulkActions && (
        <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedIds.size} selected</Badge>
            {selectedIds.size >= bulkSelectionLimit && (
              <Badge variant="outline" className="text-xs">
                Max {bulkSelectionLimit} items
              </Badge>
            )}
          </div>
          <div className="flex gap-2">{bulkActions(selectedIds)}</div>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {enableBulkSelection && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allCurrentPageSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                    disabled={isLoading}
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.sortable && enableSorting ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8 data-[state=open]:bg-accent"
                      onClick={() => handleSort(column.key)}
                    >
                      {column.label}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    column.label
                  )}
                </TableHead>
              ))}
              {actions && <TableHead className="w-20">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={
                    columns.length + (enableBulkSelection ? 1 : 0) + (actions ? 1 : 0)
                  }
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={
                    columns.length + (enableBulkSelection ? 1 : 0) + (actions ? 1 : 0)
                  }
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => {
                const rowId = getRowId(row)
                const isSelected = selectedIds.has(rowId)

                return (
                  <TableRow key={rowId} data-state={isSelected ? 'selected' : undefined}>
                    {enableBulkSelection && (
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleRowSelect(rowId, checked as boolean)
                          }
                          aria-label={`Select row ${rowId}`}
                          disabled={
                            !isSelected && selectedIds.size >= bulkSelectionLimit
                          }
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell key={column.key} className={column.className}>
                        {column.render
                          ? column.render(row)
                          : String((row as Record<string, unknown>)[column.key] ?? '')}
                      </TableCell>
                    ))}
                    {actions && <TableCell>{actions(row)}</TableCell>}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex} to {endIndex} of {totalCount} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1 || isLoading}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages || isLoading}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
