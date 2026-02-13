import * as React from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown, ArrowUpDown } from 'lucide-react'

import { cn } from '../utils/cn'

/**
 * Base Table Components
 * Composable table primitives for building data tables
 */

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  )
)
Table.displayName = 'Table'

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('[&_tr]:border-b', className)} {...props} />
))
TableHeader.displayName = 'TableHeader'

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
))
TableBody.displayName = 'TableBody'

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', className)}
    {...props}
  />
))
TableFooter.displayName = 'TableFooter'

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
        className
      )}
      {...props}
    />
  )
)
TableRow.displayName = 'TableRow'

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
      className
    )}
    {...props}
  />
))
TableHead.displayName = 'TableHead'

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)}
    {...props}
  />
))
TableCell.displayName = 'TableCell'

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn('mt-4 text-sm text-muted-foreground', className)} {...props} />
))
TableCaption.displayName = 'TableCaption'

/**
 * Sortable Column Header
 * Reusable header cell with sort indicator
 */
export type SortDirection = 'asc' | 'desc' | null

interface SortableHeaderProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sorted?: SortDirection
  onSort?: () => void
  sortable?: boolean
}

const SortableHeader = React.forwardRef<HTMLTableCellElement, SortableHeaderProps>(
  ({ className, children, sorted, onSort, sortable = true, ...props }, ref) => {
    if (!sortable) {
      return (
        <TableHead ref={ref} className={className} {...props}>
          {children}
        </TableHead>
      )
    }

    return (
      <TableHead ref={ref} className={cn('cursor-pointer select-none', className)} {...props}>
        <button
          type="button"
          onClick={onSort}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {children}
          <span className="ml-1">
            {sorted === 'asc' ? (
              <ChevronUp className="h-4 w-4" />
            ) : sorted === 'desc' ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            )}
          </span>
        </button>
      </TableHead>
    )
  }
)
SortableHeader.displayName = 'SortableHeader'

/**
 * Empty State
 * Display when table has no data
 */
interface TableEmptyProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title?: string
  description?: string
  action?: React.ReactNode
}

function TableEmpty({
  icon,
  title = 'No results',
  description,
  action,
  className,
  ...props
}: TableEmptyProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center py-12 text-center', className)}
      {...props}
    >
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/**
 * Pagination Component
 * Simple pagination controls for tables
 */
interface TablePaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  page: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
}

function TablePagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
  ...props
}: TablePaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize)
  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, totalItems)

  return (
    <div
      className={cn('flex items-center justify-between px-2 py-4', className)}
      {...props}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          Showing {startItem} to {endItem} of {totalItems} results
        </span>
        {onPageSizeChange && (
          <>
            <span className="mx-2">|</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          Previous
        </button>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number
            if (totalPages <= 5) {
              pageNum = i + 1
            } else if (page <= 3) {
              pageNum = i + 1
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i
            } else {
              pageNum = page - 2 + i
            }

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors',
                  pageNum === page
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {pageNum}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}

/**
 * Column Visibility Toggle
 * Dropdown for showing/hiding columns
 */
interface ColumnVisibilityProps {
  columns: Array<{ id: string; label: string; visible: boolean }>
  onToggle: (id: string) => void
}

function ColumnVisibility({ columns, onToggle }: ColumnVisibilityProps) {
  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Columns:</span>
      {columns.map((col) => (
        <button
          key={col.id}
          type="button"
          onClick={() => onToggle(col.id)}
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
            col.visible
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          {col.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Checkbox Cell
 * Standardized checkbox for selection in tables
 */
interface TableCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  indeterminate?: boolean
}

const TableCheckbox = React.forwardRef<HTMLInputElement, TableCheckboxProps>(
  ({ className, indeterminate, ...props }, ref) => {
    const internalRef = React.useRef<HTMLInputElement>(null)
    const resolvedRef = (ref || internalRef) as React.RefObject<HTMLInputElement>

    React.useEffect(() => {
      if (resolvedRef.current) {
        resolvedRef.current.indeterminate = indeterminate ?? false
      }
    }, [resolvedRef, indeterminate])

    return (
      <input
        type="checkbox"
        ref={resolvedRef}
        className={cn(
          'h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    )
  }
)
TableCheckbox.displayName = 'TableCheckbox'

/**
 * Bulk Action Bar
 * Floating bar for bulk actions on selected rows
 */
interface BulkActionBarProps extends React.HTMLAttributes<HTMLDivElement> {
  selectedCount: number
  onClearSelection?: () => void
  children: React.ReactNode
}

function BulkActionBar({
  selectedCount,
  onClearSelection,
  children,
  className,
  ...props
}: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-3 rounded-lg border border-border bg-background/95 backdrop-blur-sm',
        'px-4 py-2.5 shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-normal',
        className
      )}
      {...props}
    >
      <span className="text-sm font-medium">
        {selectedCount} selected
      </span>
      <div className="h-4 w-px bg-border" />
      <div className="flex items-center gap-2">
        {children}
      </div>
      {onClearSelection && (
        <>
          <div className="h-4 w-px bg-border" />
          <button
            type="button"
            onClick={onClearSelection}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        </>
      )}
    </div>
  )
}

/**
 * Table Toolbar
 * Container for table filters, search, and actions
 */
interface TableToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

function TableToolbar({ children, className, ...props }: TableToolbarProps) {
  return (
    <div
      className={cn('flex items-center justify-between gap-4 pb-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  SortableHeader,
  TableEmpty,
  TablePagination,
  ColumnVisibility,
  TableCheckbox,
  BulkActionBar,
  TableToolbar,
}

export type {
  SortableHeaderProps,
  TableEmptyProps,
  TablePaginationProps,
  ColumnVisibilityProps,
  TableCheckboxProps,
  BulkActionBarProps,
  TableToolbarProps,
}
