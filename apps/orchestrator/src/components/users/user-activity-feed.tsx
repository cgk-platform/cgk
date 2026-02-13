'use client'

import { Button, cn } from '@cgk-platform/ui'
import { useCallback, useEffect, useState } from 'react'

interface UserActivityEntry {
  id: string
  userId: string
  tenantId: string | null
  tenantName: string | null
  action: string
  resourceType: string | null
  resourceId: string | null
  metadata: Record<string, unknown>
  ipAddress: string | null
  createdAt: string
}

interface UserActivityFeedProps {
  userId: string
  className?: string
  /** Initial limit of entries to show */
  initialLimit?: number
}

/**
 * Format relative time from a date string
 */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Get human-readable action description
 */
function getActionDescription(action: string): string {
  const actionMap: Record<string, string> = {
    'user.login': 'Logged in',
    'user.logout': 'Logged out',
    'user.password_reset': 'Reset password',
    'user.mfa_enabled': 'Enabled MFA',
    'tenant.switched': 'Switched tenant',
    'tenant.joined': 'Joined tenant',
    'tenant.left': 'Left tenant',
    'team.member_invited': 'Invited team member',
    'team.member_removed': 'Removed team member',
    'role.changed': 'Role changed',
    'super_admin.granted': 'Granted super admin access',
    'super_admin.revoked': 'Super admin access revoked',
    'user.disabled': 'Account disabled',
    'user.enabled': 'Account re-enabled',
    'user.impersonated': 'Impersonated by super admin',
  }

  return actionMap[action] || action.replace(/[._]/g, ' ')
}

/**
 * Get icon for action type
 */
function getActionIcon(action: string): React.ReactNode {
  if (action.startsWith('user.login') || action.startsWith('user.logout')) {
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
        />
      </svg>
    )
  }

  if (action.includes('tenant')) {
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    )
  }

  if (action.includes('super_admin')) {
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    )
  }

  if (action.includes('team') || action.includes('member')) {
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    )
  }

  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

/**
 * Activity feed component showing user actions
 */
export function UserActivityFeed({
  userId,
  className,
  initialLimit = 10,
}: UserActivityFeedProps) {
  const [activities, setActivities] = useState<UserActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchActivities = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: initialLimit.toString(),
      })

      const response = await fetch(`/api/platform/users/${userId}/activity?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch activity')
      }

      const data = await response.json()

      if (append) {
        setActivities((prev) => [...prev, ...data.activity])
      } else {
        setActivities(data.activity)
      }

      setHasMore(data.activity.length === initialLimit)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [userId, initialLimit])

  useEffect(() => {
    fetchActivities(1)
  }, [fetchActivities])

  const loadMore = useCallback(() => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchActivities(nextPage, true)
  }, [page, fetchActivities])

  if (error) {
    return (
      <div className={cn('rounded-lg border p-4 text-center text-sm text-red-600', className)}>
        {error}
      </div>
    )
  }

  if (loading && activities.length === 0) {
    return (
      <div className={cn('rounded-lg border p-6 text-center text-muted-foreground', className)}>
        Loading activity...
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className={cn('rounded-lg border p-6 text-center text-muted-foreground', className)}>
        No activity recorded for this user.
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border', className)}>
      <div className="max-h-[400px] overflow-y-auto">
        <ul className="divide-y divide-border">
          {activities.map((activity) => (
            <li key={activity.id} className="flex items-start gap-3 p-4 hover:bg-muted/50">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                {getActionIcon(activity.action)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {getActionDescription(activity.action)}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeTime(activity.createdAt)}
                  </span>
                </div>
                {activity.tenantName && (
                  <div className="mt-0.5 text-sm text-muted-foreground">
                    in {activity.tenantName}
                  </div>
                )}
                {activity.ipAddress && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    IP: {activity.ipAddress}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {hasMore && (
        <div className="border-t p-3 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  )
}
