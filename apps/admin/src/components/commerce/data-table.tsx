import { cn } from '@cgk-platform/ui'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import Link from 'next/link'

import { buildFilterUrl } from '@/lib/search-params'

export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  className?: string
  render: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  keyFn: (row: T) => string
  basePath: string
  currentFilters: Record<string, string | number | undefined>
  currentSort?: string
  currentDir?: 'asc' | 'desc'
}

export function DataTable<T>({
  columns,
  rows,
  keyFn,
  basePath,
  currentFilters,
  currentSort,
  currentDir = 'desc',
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left font-medium text-muted-foreground',
                  col.className,
                )}
              >
                {col.sortable ? (
                  <SortLink
                    label={col.header}
                    columnKey={col.key}
                    basePath={basePath}
                    currentFilters={currentFilters}
                    currentSort={currentSort}
                    currentDir={currentDir}
                  />
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-muted-foreground"
              >
                No results found
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={keyFn(row)} className="hover:bg-muted/50">
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3', col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function SortLink({
  label,
  columnKey,
  basePath,
  currentFilters,
  currentSort,
  currentDir,
}: {
  label: string
  columnKey: string
  basePath: string
  currentFilters: Record<string, string | number | undefined>
  currentSort?: string
  currentDir?: 'asc' | 'desc'
}) {
  const isActive = currentSort === columnKey
  const nextDir = isActive && currentDir === 'desc' ? 'asc' : 'desc'
  const href = buildFilterUrl(basePath, {
    ...currentFilters,
    sort: columnKey,
    dir: nextDir,
    page: undefined,
  })

  return (
    <Link href={href} className="inline-flex items-center gap-1 hover:text-foreground">
      {label}
      {isActive ? (
        currentDir === 'asc' ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </Link>
  )
}
