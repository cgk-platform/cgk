'use client'

import { Button, Card, CardContent, CardHeader } from '@cgk/ui'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { UserAvatar } from '../../../../../components/users'

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

interface UserBasicInfo {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
}

/**
 * Format a date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
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
 * Full activity log page for a user
 */
export default function UserActivityPage(): React.JSX.Element {
  const params = useParams()
  const userId = params.id as string

  const [user, setUser] = useState<UserBasicInfo | null>(null)
  const [activities, setActivities] = useState<UserActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchUserAndActivity = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch user basic info and first page of activity in parallel
      const [userResponse, activityResponse] = await Promise.all([
        fetch(`/api/platform/users/${userId}`),
        fetch(`/api/platform/users/${userId}/activity?page=1&limit=50`),
      ])

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user')
      }

      if (!activityResponse.ok) {
        throw new Error('Failed to fetch activity')
      }

      const userData = await userResponse.json()
      const activityData = await activityResponse.json()

      setUser(userData.user)
      setActivities(activityData.activity)
      setHasMore(activityData.activity.length === 50)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchUserAndActivity()
  }, [fetchUserAndActivity])

  const loadMore = async () => {
    setLoadingMore(true)

    try {
      const nextPage = page + 1
      const response = await fetch(
        `/api/platform/users/${userId}/activity?page=${nextPage}&limit=50`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch more activity')
      }

      const data = await response.json()
      setActivities((prev) => [...prev, ...data.activity])
      setPage(nextPage)
      setHasMore(data.activity.length === 50)
    } catch (err) {
      console.error('Failed to load more:', err)
    } finally {
      setLoadingMore(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading activity...</p>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-red-600">{error || 'User not found'}</p>
        <Link href="/users">
          <Button variant="outline">Back to Users</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/users/${userId}`}>
          <Button variant="ghost" size="sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="mr-1 h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
                clipRule="evenodd"
              />
            </svg>
            Back to User
          </Button>
        </Link>
      </div>

      {/* User Info */}
      <div className="flex items-center gap-4">
        <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
        <div>
          <h1 className="text-2xl font-bold">{user.name || 'Unnamed User'}</h1>
          <p className="text-muted-foreground">Activity Log</p>
        </div>
      </div>

      {/* Activity Table */}
      <Card>
        <CardHeader className="border-b">
          <h2 className="text-lg font-semibold">All Activity</h2>
          <p className="text-sm text-muted-foreground">
            Complete history of user actions
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {activities.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No activity recorded for this user.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Tenant
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      IP Address
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-muted/50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {formatDate(activity.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">
                          {getActionDescription(activity.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {activity.tenantName || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {activity.ipAddress || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {activity.resourceType && activity.resourceId
                          ? `${activity.resourceType}: ${activity.resourceId}`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {hasMore && (
            <div className="border-t p-4 text-center">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
