'use client'

import { Badge, Card, CardContent, cn } from '@cgk-platform/ui'
import { CheckCircle, Clock, ExternalLink, Mail, User } from 'lucide-react'
import Link from 'next/link'

import type { SurveyResponse } from '@/lib/surveys'

interface RecentResponsesListProps {
  responses: SurveyResponse[]
  surveyId?: string
}

export function RecentResponsesList({ responses, surveyId }: RecentResponsesListProps) {
  if (responses.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-[300px] items-center justify-center p-6">
          <div className="text-center text-muted-foreground">
            <Mail className="mx-auto mb-3 h-12 w-12 opacity-20" />
            <p className="text-sm">No responses yet</p>
            <p className="mt-1 text-xs">
              Responses will appear here as customers complete surveys
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-base font-semibold">Recent Responses</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Latest survey submissions
            </p>
          </div>
          {surveyId && (
            <Link
              href={`/admin/surveys/${surveyId}/responses`}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View all
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>

        <div className="divide-y">
          {responses.map((response) => (
            <ResponseRow key={response.id} response={response} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ResponseRow({ response }: { response: SurveyResponse }) {
  const completedAt = response.completed_at
    ? new Date(response.completed_at)
    : null
  const createdAt = new Date(response.created_at)

  return (
    <Link
      href={`/admin/surveys/responses/${response.id}`}
      className="block px-6 py-4 transition-colors hover:bg-muted/30"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {/* Avatar placeholder */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {response.customer_email || 'Anonymous'}
              </span>
              {response.is_complete ? (
                <Badge variant="success" className="text-xs">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Complete
                </Badge>
              ) : (
                <Badge variant="warning" className="text-xs">
                  <Clock className="mr-1 h-3 w-3" />
                  In Progress
                </Badge>
              )}
            </div>

            {response.attribution_source && (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Discovered via:</span>
                <span className="rounded bg-primary/10 px-2 py-0.5 text-sm font-medium text-primary">
                  {formatSourceLabel(response.attribution_source)}
                </span>
              </div>
            )}

            {response.nps_score !== null && (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">NPS:</span>
                <NpsScoreBadge score={response.nps_score} />
              </div>
            )}

            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              {response.order_id && (
                <>
                  <span>Order #{response.order_id}</span>
                  <span>&bull;</span>
                </>
              )}
              <span>{formatRelativeTime(createdAt)}</span>
              {completedAt && (
                <>
                  <span>&bull;</span>
                  <span>
                    Completed in {formatDuration(completedAt.getTime() - createdAt.getTime())}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <ExternalLink className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  )
}

function NpsScoreBadge({ score }: { score: number }) {
  let color = 'bg-red-100 text-red-700'
  let label = 'Detractor'

  if (score >= 9) {
    color = 'bg-emerald-100 text-emerald-700'
    label = 'Promoter'
  } else if (score >= 7) {
    color = 'bg-amber-100 text-amber-700'
    label = 'Passive'
  }

  return (
    <span className={cn('rounded px-2 py-0.5 text-sm font-medium', color)}>
      {score} ({label})
    </span>
  )
}

function formatSourceLabel(source: string): string {
  return source
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  return `${Math.floor(seconds / 3600)}h`
}

export function RecentResponsesSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b px-6 py-4">
          <div className="h-5 w-36 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="divide-y">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-3 px-6 py-4">
              <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-40 animate-pulse rounded bg-muted" />
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
