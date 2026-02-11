'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  MoreHorizontal,
  Play,
  Pause,
  StopCircle,
  Archive,
  Trash2,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react'

import { Badge, Button, Card, CardContent, cn } from '@cgk/ui'

import type { ABTest, TestStatus, TestType } from '@/lib/ab-tests/types'
import { Pagination } from '@/components/commerce/pagination'

interface TestListProps {
  tests: ABTest[]
  total: number
  page: number
  limit: number
  currentFilters: Record<string, string | undefined>
  currentSort?: string
  currentDir?: 'asc' | 'desc'
}

export function ABTestList({
  tests,
  total,
  page,
  limit,
  currentFilters,
  currentSort,
  currentDir = 'desc',
}: TestListProps) {
  const router = useRouter()
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set())

  const totalPages = Math.ceil(total / limit)

  const toggleSelect = (testId: string) => {
    const newSelected = new Set(selectedTests)
    if (newSelected.has(testId)) {
      newSelected.delete(testId)
    } else {
      newSelected.add(testId)
    }
    setSelectedTests(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedTests.size === tests.length) {
      setSelectedTests(new Set())
    } else {
      setSelectedTests(new Set(tests.map((t) => t.id)))
    }
  }

  const handleSort = (column: string) => {
    const params = new URLSearchParams()
    Object.entries(currentFilters).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })

    if (currentSort === column) {
      params.set('dir', currentDir === 'desc' ? 'asc' : 'desc')
    } else {
      params.set('sort', column)
      params.set('dir', 'desc')
    }

    router.push(`/admin/ab-tests?${params.toString()}`)
  }

  if (tests.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 rounded-full bg-slate-100 p-4">
            <FlaskIcon className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mb-1 font-semibold text-slate-900">No tests found</h3>
          <p className="mb-4 text-sm text-slate-500">
            Create your first A/B test to start experimenting
          </p>
          <Button asChild>
            <Link href="/admin/ab-tests/new">Create Test</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedTests.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2">
          <span className="text-sm font-medium text-cyan-800">
            {selectedTests.size} selected
          </span>
          <Button variant="outline" size="sm">
            <Archive className="mr-1 h-4 w-4" />
            Archive
          </Button>
          <Button variant="destructive" size="sm">
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedTests.size === tests.length}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
              </th>
              <SortHeader
                label="NAME"
                column="name"
                currentSort={currentSort}
                currentDir={currentDir}
                onSort={handleSort}
              />
              <SortHeader
                label="TYPE"
                column="test_type"
                currentSort={currentSort}
                currentDir={currentDir}
                onSort={handleSort}
              />
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                STATUS
              </th>
              <SortHeader
                label="VISITORS"
                column="visitors"
                currentSort={currentSort}
                currentDir={currentDir}
                onSort={handleSort}
                className="text-right"
              />
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                LIFT
              </th>
              <SortHeader
                label="CREATED"
                column="created_at"
                currentSort={currentSort}
                currentDir={currentDir}
                onSort={handleSort}
              />
              <th className="w-16 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tests.map((test) => (
              <TestRow
                key={test.id}
                test={test}
                isSelected={selectedTests.has(test.id)}
                onToggleSelect={() => toggleSelect(test.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          basePath="/admin/ab-tests"
          currentFilters={currentFilters}
        />
      )}
    </div>
  )
}

interface SortHeaderProps {
  label: string
  column: string
  currentSort?: string
  currentDir?: 'asc' | 'desc'
  onSort: (column: string) => void
  className?: string
}

function SortHeader({
  label,
  column,
  currentSort,
  currentDir,
  onSort,
  className,
}: SortHeaderProps) {
  const isActive = currentSort === column

  return (
    <th className={cn('px-4 py-3', className)}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-900"
      >
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
      </button>
    </th>
  )
}

interface TestRowProps {
  test: ABTest
  isSelected: boolean
  onToggleSelect: () => void
}

function TestRow({ test, isSelected, onToggleSelect }: TestRowProps) {
  const [showActions, setShowActions] = useState(false)

  return (
    <tr
      className={cn(
        'group transition-colors',
        isSelected ? 'bg-cyan-50' : 'hover:bg-slate-50'
      )}
    >
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
        />
      </td>
      <td className="px-4 py-3">
        <Link
          href={`/admin/ab-tests/${test.id}`}
          className="font-medium text-slate-900 hover:text-cyan-600"
        >
          {test.name}
        </Link>
        {test.description && (
          <p className="mt-0.5 truncate text-xs text-slate-500 max-w-xs">
            {test.description}
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        <TestTypeBadge type={test.testType} />
      </td>
      <td className="px-4 py-3">
        <TestStatusBadge status={test.status} />
      </td>
      <td className="px-4 py-3 text-right font-mono text-slate-900">
        {/* This would come from aggregated data */}
        --
      </td>
      <td className="px-4 py-3 text-right">
        {test.winnerVariantId ? (
          <span className="font-mono text-emerald-600">+12.3%</span>
        ) : (
          <span className="text-slate-400">--</span>
        )}
      </td>
      <td className="px-4 py-3 text-slate-500">
        {formatDate(test.createdAt)}
      </td>
      <td className="relative px-4 py-3">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowActions(!showActions)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          {showActions && (
            <ActionMenu
              test={test}
              onClose={() => setShowActions(false)}
            />
          )}
        </div>
      </td>
    </tr>
  )
}

function TestStatusBadge({ status }: { status: TestStatus }) {
  const config: Record<TestStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    draft: { label: 'Draft', variant: 'outline' },
    running: { label: 'Running', variant: 'default' },
    paused: { label: 'Paused', variant: 'secondary' },
    completed: { label: 'Completed', variant: 'outline' },
  }

  const { label, variant } = config[status]

  return (
    <Badge
      variant={variant}
      className={cn(
        status === 'running' && 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
        status === 'paused' && 'bg-amber-100 text-amber-700 hover:bg-amber-100'
      )}
    >
      {status === 'running' && (
        <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
      )}
      {label}
    </Badge>
  )
}

function TestTypeBadge({ type }: { type: TestType }) {
  const labels: Record<TestType, string> = {
    landing_page: 'Landing Page',
    shipping: 'Shipping',
    email: 'Email',
    checkout: 'Checkout',
    pricing: 'Pricing',
  }

  return (
    <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
      {labels[type]}
    </span>
  )
}

function ActionMenu({ test, onClose }: { test: ABTest; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
        <Link
          href={`/admin/ab-tests/${test.id}`}
          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
        >
          <ExternalLink className="h-4 w-4" />
          View Details
        </Link>
        {test.status === 'draft' && (
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <Play className="h-4 w-4" />
            Start Test
          </button>
        )}
        {test.status === 'running' && (
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <Pause className="h-4 w-4" />
            Pause Test
          </button>
        )}
        {test.status === 'paused' && (
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <Play className="h-4 w-4" />
            Resume Test
          </button>
        )}
        {(test.status === 'running' || test.status === 'paused') && (
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <StopCircle className="h-4 w-4" />
            End Test
          </button>
        )}
        <hr className="my-1 border-slate-100" />
        <button
          type="button"
          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
    </>
  )
}

function FlaskIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 3h6" />
      <path d="M10 9V3" />
      <path d="M14 9V3" />
      <path d="M6 21c-.5-1.5-1-4.5 1-7l3-4V3h4v6l3 4c2 2.5 1.5 5.5 1 7H6Z" />
    </svg>
  )
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function TestListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="animate-pulse">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex gap-8">
            <div className="h-4 w-8 rounded bg-slate-200" />
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="h-4 w-16 rounded bg-slate-200" />
            <div className="h-4 w-16 rounded bg-slate-200" />
            <div className="h-4 w-20 rounded bg-slate-200" />
          </div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border-b border-slate-100 px-4 py-4">
            <div className="flex items-center gap-8">
              <div className="h-4 w-4 rounded bg-slate-200" />
              <div className="h-4 w-40 rounded bg-slate-200" />
              <div className="h-4 w-20 rounded bg-slate-200" />
              <div className="h-4 w-16 rounded bg-slate-200" />
              <div className="h-4 w-16 rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
