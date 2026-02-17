'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, StatusBadge } from '@cgk-platform/ui'
import { Clock, FolderKanban, DollarSign, Loader2 } from 'lucide-react'
import Link from 'next/link'

import type { ContractorProject } from '@/lib/types'
import { getStatusLabel } from '@/lib/types'

interface RecentActivityProps {
  recentProjects?: ContractorProject[]
}

/**
 * Format relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format cents to currency string
 */
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

/**
 * Get icon for project status
 */
function getStatusIcon(status: string): React.ReactNode {
  if (status.includes('payout') || status === 'withdrawal_requested') {
    return <DollarSign className="h-4 w-4 text-success" />
  }
  return <FolderKanban className="h-4 w-4 text-primary" />
}

/**
 * Recent activity section for contractor dashboard
 */
export function RecentActivity({
  recentProjects: initialProjects,
}: RecentActivityProps): React.JSX.Element {
  const [recentProjects, setRecentProjects] = useState<ContractorProject[]>(initialProjects ?? [])
  const [isLoading, setIsLoading] = useState(!initialProjects)

  useEffect(() => {
    if (initialProjects) return

    async function fetchRecentProjects() {
      try {
        const response = await fetch('/api/contractor/projects?limit=5')
        if (!response.ok) throw new Error('Failed to fetch projects')
        const data = await response.json()
        setRecentProjects(data.projects ?? [])
      } catch {
        // Silent fail - show empty state
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecentProjects()
  }, [initialProjects])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (recentProjects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-sm text-muted-foreground">
              No recent activity yet.
            </p>
            <Link
              href="/projects"
              className="mt-2 text-sm font-medium text-primary hover:underline"
            >
              View all projects
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <Link
            href="/projects"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentProjects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
            >
              <div className="mt-0.5 rounded-lg bg-muted p-2">
                {getStatusIcon(project.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{project.title}</span>
                  <StatusBadge status={project.status}>
                    {getStatusLabel(project.status)}
                  </StatusBadge>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatRelativeTime(project.updatedAt)}</span>
                  {project.rateCents && (
                    <span className="font-medium text-foreground">
                      {formatCurrency(project.rateCents)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
