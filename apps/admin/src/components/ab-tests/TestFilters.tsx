'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Search, X } from 'lucide-react'

import { Button, Input, cn } from '@cgk/ui'

interface TestFiltersProps {
  status?: string
  testType?: string
  search?: string
}

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'running', label: 'Running' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
]

const testTypeOptions = [
  { value: '', label: 'All Types' },
  { value: 'landing_page', label: 'Landing Page' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'email', label: 'Email' },
  { value: 'checkout', label: 'Checkout' },
  { value: 'pricing', label: 'Pricing' },
]

export function ABTestFilters({ status, testType, search }: TestFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page') // Reset to first page
      router.push(`/admin/ab-tests?${params.toString()}`)
    },
    [router, searchParams]
  )

  const clearFilters = useCallback(() => {
    router.push('/admin/ab-tests')
  }, [router])

  const hasFilters = status || testType || search

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search tests..."
            defaultValue={search}
            onChange={(e) => {
              const value = e.target.value
              const timeoutId = setTimeout(() => updateFilter('search', value), 300)
              return () => clearTimeout(timeoutId)
            }}
            className="pl-9 text-sm"
          />
        </div>

        {/* Status Filter */}
        <select
          value={status || ''}
          onChange={(e) => updateFilter('status', e.target.value)}
          className={cn(
            'h-9 rounded-md border border-input bg-background px-3 py-1 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2',
            'transition-colors'
          )}
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Test Type Filter */}
        <select
          value={testType || ''}
          onChange={(e) => updateFilter('testType', e.target.value)}
          className={cn(
            'h-9 rounded-md border border-input bg-background px-3 py-1 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2',
            'transition-colors'
          )}
        >
          {testTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Clear Filters */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
