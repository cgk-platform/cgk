'use client'

import { Card, CardContent, CardHeader, Badge } from '@cgk/ui'
import { cn } from '@cgk/ui'

import { UserAvatar } from './user-avatar'
import { UserStatusBadge, SuperAdminBadge } from './user-status-badge'

type UserStatus = 'active' | 'disabled' | 'pending_verification' | 'invited'

interface UserDetailCardProps {
  user: {
    id: string
    email: string
    name: string | null
    avatarUrl: string | null
    status: UserStatus
    role: string
    emailVerified: boolean
    lastLoginAt: string | null
    createdAt: string
    disabledAt: string | null
    disabledBy: string | null
    disabledReason: string | null
    isSuperAdmin: boolean
    superAdminGrantedAt: string | null
    superAdminGrantedBy: string | null
    tenantCount: number
  }
  className?: string
}

/**
 * Format a date for display
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never'

  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format relative time from a date string
 */
function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'

  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`

  return date.toLocaleDateString()
}

/**
 * Detail card for user information
 */
export function UserDetailCard({ user, className }: UserDetailCardProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="border-b">
        <div className="flex items-start gap-4">
          <UserAvatar
            name={user.name}
            avatarUrl={user.avatarUrl}
            size="xl"
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">
                {user.name || 'Unnamed User'}
              </h1>
              <UserStatusBadge status={user.status} />
              {user.isSuperAdmin && <SuperAdminBadge />}
            </div>
            <p className="mt-1 text-lg text-muted-foreground">{user.email}</p>
            {!user.emailVerified && (
              <Badge variant="warning" className="mt-2">
                Email not verified
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 p-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Account Created
          </h3>
          <p className="text-sm">{formatDate(user.createdAt)}</p>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Last Active
          </h3>
          <p className="text-sm">{formatRelativeTime(user.lastLoginAt)}</p>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Tenant Memberships
          </h3>
          <p className="text-sm">
            {user.tenantCount === 0
              ? 'No tenant memberships'
              : user.tenantCount === 1
                ? '1 tenant'
                : `${user.tenantCount} tenants`}
          </p>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Global Role
          </h3>
          <Badge variant="secondary">
            {user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ')}
          </Badge>
        </div>

        {user.isSuperAdmin && user.superAdminGrantedAt && (
          <>
            <div className="sm:col-span-2">
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                Super Admin Access
              </h3>
              <p className="text-sm">
                Granted {formatDate(user.superAdminGrantedAt)}
              </p>
            </div>
          </>
        )}

        {user.status === 'disabled' && user.disabledAt && (
          <div className="rounded-lg bg-red-50 p-4 dark:bg-red-950 sm:col-span-2">
            <h3 className="mb-2 text-sm font-medium text-red-800 dark:text-red-200">
              Account Disabled
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">
              Disabled {formatDate(user.disabledAt)}
            </p>
            {user.disabledReason && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                Reason: {user.disabledReason}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
