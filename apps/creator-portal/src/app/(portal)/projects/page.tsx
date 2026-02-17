'use client'

import { useCallback, useEffect, useState } from 'react'

import { ProjectCard } from '@/components/projects/ProjectCard'
import { useBrand } from '@/lib/brand-context'
import type { Project, ProjectStatus } from '@/lib/projects'

interface ProjectsResponse {
  projects: Project[]
  total: number
  stats: {
    total: number
    draft: number
    submitted: number
    inReview: number
    revisionRequested: number
    approved: number
    completed: number
    totalEarningsCents: number
  }
  pagination: {
    limit: number
    offset: number
    hasMore: boolean
  }
  filter?: {
    brandId: string | null
    brandSlug: string | null
    isFiltered: boolean
  }
}

const STATUS_FILTERS: { value: ProjectStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Projects' },
  { value: 'draft', label: 'Drafts' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'in_review', label: 'In Review' },
  { value: 'revision_requested', label: 'Needs Revision' },
  { value: 'approved', label: 'Approved' },
  { value: 'completed', label: 'Completed' },
]

export default function ProjectsPage(): React.JSX.Element {
  const [data, setData] = useState<ProjectsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Get brand context - will trigger re-fetch when brand changes
  const { selectedBrand, isLoading: brandLoading } = useBrand()

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      if (searchQuery) {
        params.set('search', searchQuery)
      }

      const response = await fetch(`/api/creator/projects?${params.toString()}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch projects')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchQuery])

  // Re-fetch when brand changes or when filters change
  useEffect(() => {
    if (!brandLoading) {
      fetchProjects()
    }
  }, [fetchProjects, selectedBrand?.id, brandLoading])

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  // Determine header text based on brand filter
  const isFiltered = data?.filter?.isFiltered ?? false

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Projects</h1>
        <p className="text-muted-foreground">
          {isFiltered && selectedBrand
            ? `Projects for ${selectedBrand.name}`
            : 'Manage your content projects and deliverables'}
        </p>
      </div>

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Active Projects</div>
            <div className="mt-1 text-2xl font-bold">
              {data.stats.draft + data.stats.submitted + data.stats.inReview + data.stats.revisionRequested}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Needs Attention</div>
            <div className="mt-1 text-2xl font-bold text-orange-600">
              {data.stats.revisionRequested}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Completed</div>
            <div className="mt-1 text-2xl font-bold text-green-600">{data.stats.completed}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Total Earned</div>
            <div className="mt-1 text-2xl font-bold">
              {formatCurrency(data.stats.totalEarningsCents)}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Status filter */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === filter.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {filter.label}
              {data?.stats && filter.value !== 'all' && filter.value !== 'cancelled' && (
                <span className="ml-1.5 opacity-75">
                  {filter.value === 'in_review'
                    ? data.stats.inReview
                    : filter.value === 'revision_requested'
                      ? data.stats.revisionRequested
                      : data.stats[filter.value as keyof typeof data.stats]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-lg border bg-background pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary sm:w-64"
          />
        </div>
      </div>

      {/* Loading state */}
      {(loading || brandLoading) && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={fetchProjects}
            className="mt-2 text-sm font-medium text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Projects grid */}
      {!loading && !brandLoading && !error && data && (
        <>
          {data.projects.length === 0 ? (
            <div className="rounded-lg border bg-card p-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted-foreground"
                >
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">No projects found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {statusFilter !== 'all'
                  ? 'Try changing the filter or search query'
                  : isFiltered
                    ? `No projects found for ${selectedBrand?.name || 'this brand'}`
                    : 'Projects assigned to you will appear here'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}

          {/* Pagination info */}
          {data.total > data.projects.length && (
            <div className="text-center text-sm text-muted-foreground">
              Showing {data.projects.length} of {data.total} projects
            </div>
          )}
        </>
      )}
    </div>
  )
}
