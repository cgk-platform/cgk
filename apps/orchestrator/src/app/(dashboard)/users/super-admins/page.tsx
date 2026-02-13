'use client'

import { Badge, Button, Card, CardContent, CardHeader, Input } from '@cgk-platform/ui'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { SuperAdminBadge, UserAvatar } from '../../../../components/users'

interface SuperAdminEntry {
  userId: string
  email: string
  name: string | null
  grantedAt: string
  grantedBy: string | null
  grantedByEmail: string | null
  notes: string | null
  permissions: {
    canAccessAllTenants: boolean
    canImpersonate: boolean
    canManageSuperAdmins: boolean
  }
  mfaEnabled: boolean
  lastAccessAt: string | null
  isActive: boolean
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
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
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
  })
}

/**
 * Super Admin Registry page
 */
export default function SuperAdminsPage(): React.JSX.Element {
  const [superAdmins, setSuperAdmins] = useState<SuperAdminEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchEmail, setSearchEmail] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const fetchSuperAdmins = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/platform/users/super-admins')

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch super admins')
      }

      const data = await response.json()
      setSuperAdmins(data.superAdmins)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSuperAdmins()
  }, [fetchSuperAdmins])

  const handleAddSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError(null)
    setAddLoading(true)

    try {
      const response = await fetch('/api/platform/users/super-admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: searchEmail.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add super admin')
      }

      setSearchEmail('')
      setShowAddForm(false)
      await fetchSuperAdmins()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add super admin')
    } finally {
      setAddLoading(false)
    }
  }

  const handleRevoke = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke super admin access from ${email}?`)) {
      return
    }

    try {
      const response = await fetch('/api/platform/users/super-admins', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          isActive: false,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to revoke access')
      }

      await fetchSuperAdmins()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to revoke access')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading super admins...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Super Admin Registry</h1>
          <p className="text-muted-foreground">
            Manage users with platform-level access
          </p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancel' : 'Add Super Admin'}
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader className="border-b">
            <h2 className="text-lg font-semibold">Grant Super Admin Access</h2>
          </CardHeader>
          <CardContent className="p-4">
            <form onSubmit={handleAddSuperAdmin} className="flex gap-4">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="Enter user email address..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  User must already have an account on the platform
                </p>
              </div>
              <Button type="submit" disabled={addLoading || !searchEmail.trim()}>
                {addLoading ? 'Adding...' : 'Grant Access'}
              </Button>
            </form>
            {addError && (
              <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                {addError}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-center text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="border-b">
          <h2 className="text-lg font-semibold">Active Super Admins</h2>
          <p className="text-sm text-muted-foreground">
            {superAdmins.filter((sa) => sa.isActive).length} super admin
            {superAdmins.filter((sa) => sa.isActive).length !== 1 ? 's' : ''}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {superAdmins.filter((sa) => sa.isActive).length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No super admins found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Permissions
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Granted
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Last Active
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      MFA
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {superAdmins
                    .filter((sa) => sa.isActive)
                    .map((admin) => (
                      <tr key={admin.userId} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              name={admin.name}
                              avatarUrl={null}
                              size="sm"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/users/${admin.userId}`}
                                  className="font-medium hover:underline"
                                >
                                  {admin.name || 'Unnamed User'}
                                </Link>
                                <SuperAdminBadge />
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {admin.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {admin.permissions.canAccessAllTenants && (
                              <Badge variant="outline" className="text-xs">
                                All Tenants
                              </Badge>
                            )}
                            {admin.permissions.canImpersonate && (
                              <Badge variant="outline" className="text-xs">
                                Impersonate
                              </Badge>
                            )}
                            {admin.permissions.canManageSuperAdmins && (
                              <Badge variant="default" className="text-xs">
                                Manage Admins
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            {formatDate(admin.grantedAt)}
                          </div>
                          {admin.grantedByEmail && (
                            <div className="text-xs text-muted-foreground">
                              by {admin.grantedByEmail}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatRelativeTime(admin.lastAccessAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={admin.mfaEnabled ? 'success' : 'warning'}>
                            {admin.mfaEnabled ? 'Enabled' : 'Not Set'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevoke(admin.userId, admin.email)}
                          >
                            Revoke
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
