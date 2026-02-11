'use client'

import { Button, Card, CardContent, CardHeader } from '@cgk/ui'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { UserAvatar } from './user-avatar'
import { UserSearchBar } from './user-search-bar'
import { SuperAdminBadge, UserStatusBadge } from './user-status-badge'

type UserStatus = 'active' | 'disabled' | 'pending_verification' | 'invited' | 'all'

interface PlatformUser {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  status: UserStatus
  role: string
  emailVerified: boolean
  lastLoginAt: string | null
  createdAt: string
  tenantCount: number
  isSuperAdmin: boolean
}

interface PaginatedResponse {
  users: PlatformUser[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface Filters {
  status: UserStatus
  isSuperAdmin: 'all' | 'yes' | 'no'
  search: string
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
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString()
}

/**
 * Platform-wide user list component for super admins
 */
export function PlatformUserList() {
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    isSuperAdmin: 'all',
    search: '',
  })

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      })

      if (filters.status !== 'all') {
        params.set('status', filters.status)
      }

      if (filters.isSuperAdmin !== 'all') {
        params.set('isSuperAdmin', filters.isSuperAdmin === 'yes' ? 'true' : 'false')
      }

      if (filters.search) {
        params.set('search', filters.search)
      }

      const response = await fetch(`/api/platform/users?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const data: PaginatedResponse = await response.json()
      setUsers(data.users)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSearchChange = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }))
    setPage(1)
  }, [])

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({ ...prev, status: e.target.value as UserStatus }))
    setPage(1)
  }, [])

  const handleSuperAdminChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({
      ...prev,
      isSuperAdmin: e.target.value as 'all' | 'yes' | 'no',
    }))
    setPage(1)
  }, [])

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Platform Users</h2>
            <p className="text-sm text-muted-foreground">
              {total} users across all tenants
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <UserSearchBar
            value={filters.search}
            onChange={handleSearchChange}
            isLoading={loading}
            className="flex-1"
          />

          <div className="flex gap-2">
            <select
              value={filters.status}
              onChange={handleStatusChange}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="pending_verification">Pending</option>
              <option value="invited">Invited</option>
            </select>

            <select
              value={filters.isSuperAdmin}
              onChange={handleSuperAdminChange}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Users</option>
              <option value="yes">Super Admins</option>
              <option value="no">Regular Users</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {error && (
          <div className="p-4 text-center text-sm text-red-600">{error}</div>
        )}

        {!error && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Tenants
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Last Active
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={user.name}
                            avatarUrl={user.avatarUrl}
                            size="sm"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {user.name || 'Unnamed User'}
                              </span>
                              {user.isSuperAdmin && <SuperAdminBadge />}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <UserStatusBadge status={user.status as Exclude<UserStatus, 'all'>} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">
                          {user.tenantCount === 0
                            ? 'No tenants'
                            : user.tenantCount === 1
                              ? '1 tenant'
                              : `${user.tenantCount} tenants`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">
                          {formatRelativeTime(user.lastLoginAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/users/${user.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
