'use client'

import { Button } from '@cgk/ui'
import { BarChart3, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState, useTransition } from 'react'

import {
  TemplateCategoryCard,
  TemplateCategoryCardSkeleton,
  TemplateFilter,
  TemplateRow,
  TemplateSearch,
  type TemplateInfo,
  type TemplateStatusFilter,
} from '@/components/templates'

interface TemplateCategory {
  name: string
  slug: string
  editorPath: string
  description: string
  templates: TemplateInfo[]
}

interface TemplateLibraryData {
  categories: TemplateCategory[]
  totals: {
    total: number
    custom: number
    default: number
  }
}

interface SearchResult {
  templates: TemplateInfo[]
  isSearchResult: true
}

export function TemplateLibraryContent() {
  const [data, setData] = useState<TemplateLibraryData | null>(null)
  const [searchResults, setSearchResults] = useState<TemplateInfo[] | null>(null)
  const [status, setStatus] = useState<TemplateStatusFilter>('all')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const fetchLibrary = useCallback(
    async (statusFilter: TemplateStatusFilter, search?: string) => {
      try {
        const params = new URLSearchParams()
        if (statusFilter !== 'all') {
          params.set('status', statusFilter)
        }
        if (search) {
          params.set('search', search)
        }

        const url = `/api/admin/templates${params.toString() ? `?${params}` : ''}`
        const response = await fetch(url)

        if (!response.ok) {
          throw new Error('Failed to fetch templates')
        }

        const result = await response.json()

        if ('isSearchResult' in result) {
          setSearchResults((result as SearchResult).templates)
          setData(null)
        } else {
          setData(result as TemplateLibraryData)
          setSearchResults(null)
        }
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
    },
    []
  )

  // Initial load
  useEffect(() => {
    startTransition(() => {
      fetchLibrary(status)
    })
  }, [fetchLibrary, status])

  const handleSearch = useCallback(
    (query: string) => {
      startTransition(() => {
        fetchLibrary(status, query)
      })
    },
    [fetchLibrary, status]
  )

  const handleStatusChange = useCallback(
    (newStatus: TemplateStatusFilter) => {
      setStatus(newStatus)
      setSearchResults(null)
    },
    []
  )

  const handleRefresh = useCallback(() => {
    startTransition(() => {
      fetchLibrary(status)
    })
  }, [fetchLibrary, status])

  if (error) {
    return (
      <div className="rounded-lg border bg-destructive/10 p-6 text-center">
        <p className="text-destructive">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="mt-4"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex-1 max-w-md">
          <TemplateSearch onSearch={handleSearch} />
        </div>
        <div className="flex items-center gap-3">
          <TemplateFilter
            status={status}
            onStatusChange={handleStatusChange}
            totals={data?.totals}
          />
          <Link href="/admin/templates/analytics">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Search results */}
      {searchResults !== null && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Search Results ({searchResults.length})
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchResults(null)
                handleSearch('')
              }}
            >
              Clear search
            </Button>
          </div>
          {searchResults.length === 0 ? (
            <div className="rounded-lg border bg-muted/50 p-8 text-center">
              <p className="text-muted-foreground">No templates found</p>
            </div>
          ) : (
            <div className="rounded-lg border divide-y">
              {searchResults.map((template) => (
                <TemplateRow
                  key={`${template.notificationType}:${template.templateKey}`}
                  template={template}
                  editorPath="/admin/settings/email/templates"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category list */}
      {searchResults === null && data && (
        <div className="space-y-4">
          {data.categories.length === 0 ? (
            <div className="rounded-lg border bg-muted/50 p-8 text-center">
              <p className="text-muted-foreground">No templates found</p>
            </div>
          ) : (
            data.categories.map((category) => (
              <TemplateCategoryCard key={category.slug} category={category} />
            ))
          )}
        </div>
      )}

      {/* Loading state */}
      {isPending && !data && !searchResults && <TemplateLibrarySkeleton />}
    </div>
  )
}

export function TemplateLibrarySkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="h-10 w-full max-w-md bg-muted rounded-md animate-pulse" />
        <div className="flex items-center gap-3">
          <div className="h-10 w-48 bg-muted rounded-md animate-pulse" />
          <div className="h-10 w-24 bg-muted rounded-md animate-pulse" />
        </div>
      </div>

      {/* Category skeletons */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <TemplateCategoryCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
