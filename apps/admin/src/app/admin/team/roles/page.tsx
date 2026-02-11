import {
  getRolesForTenant,
  getUserPermissions,
  hasPermission,
  requireAuth,
} from '@cgk/auth'
import { Card, CardContent } from '@cgk/ui'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { RoleList } from '@/components/roles'

async function RolesDataLoader() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const userId = headersList.get('x-user-id')

  if (!tenantId || !userId) {
    redirect('/login')
  }

  const [roles, userPermissions] = await Promise.all([
    getRolesForTenant(tenantId),
    getUserPermissions(userId, tenantId),
  ])

  const canManageRoles = hasPermission(userPermissions, 'team.roles.manage')

  return (
    <RoleList
      roles={roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        permissions: r.permissions,
        isPredefined: r.isPredefined,
        canDelete: r.canDelete,
        parentRoleId: r.parentRoleId,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))}
      canManageRoles={canManageRoles}
    />
  )
}

function RolesLoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4 h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-4 w-48 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default async function RolesPage() {
  // Verify auth
  const headersList = await headers()
  const mockRequest = new Request('http://localhost', {
    headers: headersList,
  })

  try {
    const auth = await requireAuth(mockRequest)
    const permissions = await getUserPermissions(auth.userId, auth.tenantId || '')

    if (!hasPermission(permissions, 'team.view')) {
      return (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">Access Denied</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You do not have permission to view roles.
            </p>
          </CardContent>
        </Card>
      )
    }
  } catch {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roles</h1>
        <p className="text-muted-foreground">
          Manage roles and permissions for your team
        </p>
      </div>

      <Suspense fallback={<RolesLoadingSkeleton />}>
        <RolesDataLoader />
      </Suspense>
    </div>
  )
}
