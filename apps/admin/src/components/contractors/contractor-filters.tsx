'use client'

import { Button, Checkbox, Label, RadixSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@cgk-platform/ui'
import { Filter, X } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState, useTransition } from 'react'

import { CONTRACTOR_STATUS_LABELS, type ContractorStatus } from '@/lib/contractors/types'

interface ContractorFiltersProps {
  availableTags: string[]
}

const STATUS_OPTIONS: ContractorStatus[] = ['active', 'pending', 'suspended', 'inactive']

export function ContractorFilters({ availableTags }: ContractorFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)

  // Parse current filter values
  const currentStatus = useMemo(() => searchParams.get('status')?.split(',').filter(Boolean) || [], [searchParams])
  const currentTags = searchParams.get('tags')?.split(',').filter(Boolean) || []
  const hasPaymentMethod = searchParams.get('hasPaymentMethod')
  const hasW9 = searchParams.get('hasW9')

  const hasActiveFilters =
    currentStatus.length > 0 ||
    currentTags.length > 0 ||
    hasPaymentMethod !== null ||
    hasW9 !== null

  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString())

        // Remove page when filters change
        params.delete('page')

        for (const [key, value] of Object.entries(updates)) {
          if (value === null || value === '') {
            params.delete(key)
          } else {
            params.set(key, value)
          }
        }

        const qs = params.toString()
        router.replace(qs ? `${pathname}?${qs}` : pathname)
      })
    },
    [pathname, router, searchParams],
  )

  const toggleStatus = useCallback(
    (status: ContractorStatus) => {
      const newStatus = currentStatus.includes(status)
        ? currentStatus.filter((s) => s !== status)
        : [...currentStatus, status]
      updateFilters({ status: newStatus.length > 0 ? newStatus.join(',') : null })
    },
    [currentStatus, updateFilters],
  )

  const setTag = useCallback(
    (tag: string | null) => {
      if (tag === null || tag === '') {
        updateFilters({ tags: null })
      } else {
        updateFilters({ tags: tag })
      }
    },
    [updateFilters],
  )

  const toggleBooleanFilter = useCallback(
    (key: 'hasPaymentMethod' | 'hasW9', currentValue: string | null) => {
      let newValue: string | null
      if (currentValue === null) {
        newValue = 'true'
      } else if (currentValue === 'true') {
        newValue = 'false'
      } else {
        newValue = null
      }
      updateFilters({ [key]: newValue })
    },
    [updateFilters],
  )

  const clearAllFilters = useCallback(() => {
    updateFilters({
      status: null,
      tags: null,
      hasPaymentMethod: null,
      hasW9: null,
    })
  }, [updateFilters])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className={hasActiveFilters ? 'border-primary' : ''}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
              {currentStatus.length + currentTags.length + (hasPaymentMethod !== null ? 1 : 0) + (hasW9 !== null ? 1 : 0)}
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            <X className="mr-1 h-3 w-3" />
            Clear all
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="rounded-lg border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Status multi-select */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <div className="space-y-1">
                {STATUS_OPTIONS.map((status) => (
                  <label
                    key={status}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={currentStatus.includes(status)}
                      onCheckedChange={() => toggleStatus(status)}
                      disabled={isPending}
                    />
                    {CONTRACTOR_STATUS_LABELS[status]}
                  </label>
                ))}
              </div>
            </div>

            {/* Tags filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tags</Label>
              <RadixSelect
                value={currentTags[0] || ''}
                onValueChange={(v) => setTag(v || null)}
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select tag..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All tags</SelectItem>
                  {availableTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </RadixSelect>
            </div>

            {/* Payment method toggle */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Payment Method</Label>
              <div className="flex gap-1">
                <Button
                  variant={hasPaymentMethod === 'true' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleBooleanFilter('hasPaymentMethod', hasPaymentMethod)}
                  disabled={isPending}
                  className="flex-1"
                >
                  {hasPaymentMethod === 'true'
                    ? 'Has method'
                    : hasPaymentMethod === 'false'
                      ? 'No method'
                      : 'Any'}
                </Button>
              </div>
            </div>

            {/* W-9 toggle */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">W-9 Status</Label>
              <div className="flex gap-1">
                <Button
                  variant={hasW9 === 'true' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleBooleanFilter('hasW9', hasW9)}
                  disabled={isPending}
                  className="flex-1"
                >
                  {hasW9 === 'true' ? 'Has W-9' : hasW9 === 'false' ? 'No W-9' : 'Any'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
