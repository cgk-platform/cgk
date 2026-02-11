'use client'

import { Badge, Button, Card, CardContent, Input, Select, SelectOption, Spinner } from '@cgk/ui'
import { useCallback, useEffect, useState } from 'react'

import type { FeatureFlag, FlagStatus, FlagType } from '@cgk/feature-flags'

interface FlagListProps {
  onSelectFlag: (flag: FeatureFlag) => void
  selectedFlagKey?: string
}

interface FlagsResponse {
  flags: FeatureFlag[]
  categories: string[]
  total: number
  page: number
  hasMore: boolean
}

const FLAG_TYPE_LABELS: Record<FlagType, string> = {
  boolean: 'Boolean',
  percentage: 'Percentage',
  tenant_list: 'Tenant List',
  user_list: 'User List',
  schedule: 'Schedule',
  variant: 'Variant',
}

const FLAG_STATUS_COLORS: Record<FlagStatus, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  disabled: 'destructive',
  archived: 'secondary',
}

export function FlagList({ onSelectFlag, selectedFlagKey }: FlagListProps) {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchFlags = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryFilter) params.set('category', categoryFilter)
      if (typeFilter) params.set('type', typeFilter)
      if (statusFilter) params.set('status', statusFilter)

      const response = await fetch(`/api/platform/flags?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch flags')
      }

      const data = (await response.json()) as FlagsResponse
      setFlags(data.flags)
      setCategories(data.categories)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [search, categoryFilter, typeFilter, statusFilter])

  useEffect(() => {
    fetchFlags()
  }, [fetchFlags])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={fetchFlags} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-4 gap-4">
        <Input
          placeholder="Search flags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <SelectOption value="">All Categories</SelectOption>
          {categories.map((cat) => (
            <SelectOption key={cat} value={cat}>
              {cat}
            </SelectOption>
          ))}
        </Select>
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <SelectOption value="">All Types</SelectOption>
          <SelectOption value="boolean">Boolean</SelectOption>
          <SelectOption value="percentage">Percentage</SelectOption>
          <SelectOption value="tenant_list">Tenant List</SelectOption>
          <SelectOption value="user_list">User List</SelectOption>
          <SelectOption value="schedule">Schedule</SelectOption>
          <SelectOption value="variant">Variant</SelectOption>
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <SelectOption value="">All Statuses</SelectOption>
          <SelectOption value="active">Active</SelectOption>
          <SelectOption value="disabled">Disabled</SelectOption>
          <SelectOption value="archived">Archived</SelectOption>
        </Select>
      </div>

      {/* Flag List */}
      <div className="space-y-2">
        {flags.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No flags found
            </CardContent>
          </Card>
        ) : (
          flags.map((flag) => (
            <button
              key={flag.id}
              type="button"
              onClick={() => onSelectFlag(flag)}
              className={`w-full text-left p-4 rounded-lg border transition-colors hover:bg-muted/50 ${
                selectedFlagKey === flag.key
                  ? 'border-primary bg-muted/30'
                  : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{flag.key}</span>
                    <Badge variant={FLAG_STATUS_COLORS[flag.status]}>
                      {flag.status}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium mt-1">{flag.name}</p>
                  {flag.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {flag.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{FLAG_TYPE_LABELS[flag.type]}</Badge>
                  {flag.category && (
                    <Badge variant="outline">{flag.category}</Badge>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
