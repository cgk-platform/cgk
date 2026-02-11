'use client'

import { Button, Card, CardContent, CardHeader } from '@cgk/ui'
import { Eye } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { ImpersonateDialog } from '../../../../components/impersonation'
import {
  DisableUserModal,
  UserActivityFeed,
  UserDetailCard,
  UserMembershipsTable,
} from '../../../../components/users'

interface UserMembership {
  tenantId: string
  tenantName: string
  tenantSlug: string
  tenantLogoUrl: string | null
  role: string
  joinedAt: string
  isActive: boolean
}

interface UserWithMemberships {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  status: 'active' | 'disabled' | 'pending_verification' | 'invited'
  role: string
  emailVerified: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  disabledAt: string | null
  disabledBy: string | null
  disabledReason: string | null
  tenantCount: number
  isSuperAdmin: boolean
  superAdminGrantedBy: string | null
  superAdminGrantedAt: string | null
  memberships: UserMembership[]
}

/**
 * User detail page for super admins
 */
export default function UserDetailPage(): React.JSX.Element {
  const params = useParams()
  const userId = params.id as string

  const [user, setUser] = useState<UserWithMemberships | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDisableModal, setShowDisableModal] = useState(false)
  const [showImpersonateDialog, setShowImpersonateDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchUser = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/platform/users/${userId}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('User not found')
        }
        throw new Error('Failed to fetch user')
      }

      const data = await response.json()
      setUser(data.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const handleEnable = async () => {
    setActionLoading(true)

    try {
      const response = await fetch(`/api/platform/users/${userId}/enable`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to enable user')
      }

      await fetchUser()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to enable user')
    } finally {
      setActionLoading(false)
    }
  }

  const handleGrantSuperAdmin = async () => {
    if (!confirm('Are you sure you want to grant super admin access to this user?')) {
      return
    }

    setActionLoading(true)

    try {
      const response = await fetch('/api/platform/users/super-admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user?.email,
          notes: 'Granted via user detail page',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to grant super admin')
      }

      await fetchUser()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to grant super admin')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevokeSuperAdmin = async () => {
    if (!confirm('Are you sure you want to revoke super admin access from this user?')) {
      return
    }

    setActionLoading(true)

    try {
      const response = await fetch('/api/platform/users/super-admins', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          isActive: false,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to revoke super admin')
      }

      await fetchUser()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to revoke super admin')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading user...</p>
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
        <Link href="/users">
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
            Back to Users
          </Button>
        </Link>
      </div>

      {/* User Info Card */}
      <UserDetailCard user={user} />

      {/* Actions */}
      <Card>
        <CardHeader className="border-b">
          <h2 className="text-lg font-semibold">Actions</h2>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 p-4">
          {user.status === 'disabled' ? (
            <Button
              variant="default"
              onClick={handleEnable}
              disabled={actionLoading}
            >
              Re-enable Account
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={() => setShowDisableModal(true)}
              disabled={actionLoading}
            >
              Disable Account
            </Button>
          )}

          {user.isSuperAdmin ? (
            <Button
              variant="outline"
              onClick={handleRevokeSuperAdmin}
              disabled={actionLoading}
            >
              Revoke Super Admin
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleGrantSuperAdmin}
              disabled={actionLoading}
            >
              Grant Super Admin
            </Button>
          )}

          {/* Impersonation - only for non-super-admin users with tenant access */}
          {!user.isSuperAdmin && user.memberships.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowImpersonateDialog(true)}
              disabled={actionLoading}
              className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
            >
              <Eye className="mr-2 h-4 w-4" />
              Impersonate User
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Two-column layout for memberships and activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tenant Memberships */}
        <Card>
          <CardHeader className="border-b">
            <h2 className="text-lg font-semibold">Tenant Memberships</h2>
            <p className="text-sm text-muted-foreground">
              Organizations this user belongs to
            </p>
          </CardHeader>
          <CardContent className="p-4">
            <UserMembershipsTable memberships={user.memberships} />
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Recent Activity</h2>
                <p className="text-sm text-muted-foreground">
                  Latest actions by this user
                </p>
              </div>
              <Link href={`/users/${userId}/activity`}>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <UserActivityFeed userId={userId} initialLimit={5} />
          </CardContent>
        </Card>
      </div>

      {/* Disable Modal */}
      <DisableUserModal
        userId={user.id}
        userName={user.name}
        isOpen={showDisableModal}
        onClose={() => setShowDisableModal(false)}
        onSuccess={fetchUser}
      />

      {/* Impersonate Dialog */}
      <ImpersonateDialog
        userId={user.id}
        userName={user.name}
        userEmail={user.email}
        isOpen={showImpersonateDialog}
        onClose={() => setShowImpersonateDialog(false)}
        onSuccess={(token, tenant) => {
          // Store impersonation token and redirect to admin portal
          document.cookie = `auth-token=${token}; path=/; max-age=3600`
          // In production, this would redirect to the tenant admin portal
          const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || `https://${tenant.slug}.admin.example.com`
          window.open(adminUrl, '_blank')
          setShowImpersonateDialog(false)
        }}
      />
    </div>
  )
}
