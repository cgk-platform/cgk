'use client'

import { Badge, Button, Card, CardContent } from '@cgk-platform/ui'
import { Plus, Search, BarChart3, MessageSquare, Eye, MoreHorizontal, Copy, Archive, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'

import { Pagination } from '@/components/commerce/pagination'
import { formatDate } from '@/lib/format'
import type { Survey, SurveyStatus } from '@/lib/surveys'

const STATUS_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Paused', value: 'paused' },
  { label: 'Archived', value: 'archived' },
]

const STATUS_COLORS: Record<SurveyStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  archived: 'bg-red-100 text-red-700',
}

export default function SurveysPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
  })
  const [search, setSearch] = useState('')

  const status = searchParams.get('status') || 'all'
  const page = parseInt(searchParams.get('page') || '1', 10)

  const fetchSurveys = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        status,
        ...(search && { search }),
      })

      const response = await fetch(`/api/admin/surveys?${params}`)
      const data = await response.json()

      if (response.ok) {
        setSurveys(data.surveys)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch surveys:', error)
    } finally {
      setLoading(false)
    }
  }, [page, status, search])

  useEffect(() => {
    fetchSurveys()
  }, [fetchSurveys])

  const handleDuplicate = async (surveyId: string) => {
    const slug = `survey-copy-${Date.now()}`
    try {
      const response = await fetch(`/api/admin/surveys/${surveyId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/admin/surveys/${data.survey.id}`)
      }
    } catch (error) {
      console.error('Failed to duplicate survey:', error)
    }
  }

  const handleArchive = async (surveyId: string) => {
    try {
      await fetch(`/api/admin/surveys/${surveyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      })
      fetchSurveys()
    } catch (error) {
      console.error('Failed to archive survey:', error)
    }
  }

  const handleDelete = async (surveyId: string) => {
    if (!confirm('Are you sure you want to delete this survey? This cannot be undone.')) return

    try {
      await fetch(`/api/admin/surveys/${surveyId}`, { method: 'DELETE' })
      fetchSurveys()
    } catch (error) {
      console.error('Failed to delete survey:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Surveys</h1>
          <p className="text-muted-foreground">Create and manage post-purchase surveys</p>
        </div>
        <Link href="/admin/surveys/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Survey
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={`/admin/surveys?status=${tab.value}`}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                status === tab.value
                  ? 'bg-background font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search surveys..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchSurveys()}
            className="w-full rounded-md border bg-background px-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {loading ? (
        <SurveysSkeleton />
      ) : surveys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No surveys found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {status === 'all'
                ? 'Create your first survey to start collecting customer feedback.'
                : `No ${status} surveys found. Try a different filter.`}
            </p>
            <Link href="/admin/surveys/new" className="mt-4">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Survey
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {surveys.map((survey) => (
              <SurveyCard
                key={survey.id}
                survey={survey}
                onDuplicate={() => handleDuplicate(survey.id)}
                onArchive={() => handleArchive(survey.id)}
                onDelete={() => handleDelete(survey.id)}
              />
            ))}
          </div>

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalCount={pagination.totalCount}
            limit={pagination.limit}
            basePath="/admin/surveys"
            currentFilters={{ status }}
          />
        </>
      )}
    </div>
  )
}

function SurveyCard({
  survey,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  survey: Survey
  onDuplicate: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  const [showActions, setShowActions] = useState(false)

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <Link
                href={`/admin/surveys/${survey.id}`}
                className="text-lg font-medium hover:text-primary hover:underline"
              >
                {survey.name}
              </Link>
              <Badge className={STATUS_COLORS[survey.status]}>
                {survey.status.charAt(0).toUpperCase() + survey.status.slice(1)}
              </Badge>
            </div>

            <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
              {survey.title}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" />
                <span>{survey.response_count || 0} responses</span>
              </div>
              {survey.completion_rate !== undefined && (
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4" />
                  <span>{survey.completion_rate.toFixed(1)}% completion</span>
                </div>
              )}
              <span>Created {formatDate(survey.created_at)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/admin/surveys/${survey.id}/analytics`}>
              <Button variant="ghost" size="sm">
                <BarChart3 className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/admin/surveys/${survey.id}/responses`}>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>

            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowActions(!showActions)}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>

              {showActions && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowActions(false)}
                  />
                  <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-md border bg-popover p-1 shadow-md">
                    <button
                      onClick={() => {
                        onDuplicate()
                        setShowActions(false)
                      }}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <Copy className="h-4 w-4" />
                      Duplicate
                    </button>
                    {survey.status !== 'archived' && (
                      <button
                        onClick={() => {
                          onArchive()
                          setShowActions(false)
                        }}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                      >
                        <Archive className="h-4 w-4" />
                        Archive
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onDelete()
                        setShowActions(false)
                      }}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SurveysSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="h-5 w-48 animate-pulse rounded bg-muted" />
                <div className="h-5 w-16 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-64 animate-pulse rounded bg-muted" />
              <div className="flex gap-4">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
