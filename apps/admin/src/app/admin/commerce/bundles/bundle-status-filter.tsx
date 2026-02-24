'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectOption } from '@cgk-platform/ui'
import { Filter } from 'lucide-react'

const BUNDLE_STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
] as const

export function BundleStatusFilter({
  currentStatus,
}: {
  currentStatus: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    const params = new URLSearchParams(searchParams.toString())

    if (value) {
      params.set('status', value)
    } else {
      params.delete('status')
    }

    // Reset to first page when filter changes
    params.delete('page')

    const qs = params.toString()
    router.push(qs ? `/admin/commerce/bundles?${qs}` : '/admin/commerce/bundles')
  }

  return (
    <div className="flex items-center gap-2">
      <Filter className="h-4 w-4 text-muted-foreground" />
      <Select
        value={currentStatus}
        onChange={handleStatusChange}
        className="w-40"
        aria-label="Filter by status"
      >
        {BUNDLE_STATUSES.map((opt) => (
          <SelectOption key={opt.value} value={opt.value}>
            {opt.label}
          </SelectOption>
        ))}
      </Select>
    </div>
  )
}
