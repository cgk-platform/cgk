import {
  getPermissionsByCategory,
  getRolesForTenant,
  getUserPermissions,
  hasPermission,
  requireAuth,
} from '@cgk-platform/auth'
import { Card, CardContent } from '@cgk-platform/ui'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { PermissionsPageClient } from './permissions-page-client'

import type { PermissionsByCategory, Role } from '@/components/roles/types'


async function PermissionsDataLoader() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const userId = headersList.get('x-user-id')

  if (!tenantId || !userId) {
    redirect('/login')
  }

  const [rolesRaw, permsByCat, userPermissions] = await Promise.all([
    getRolesForTenant(tenantId),
    Promise.resolve(getPermissionsByCategory()),
    getUserPermissions(userId, tenantId),
  ])

  const roles: Role[] = rolesRaw.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    permissions: r.permissions,
    isPredefined: r.isPredefined,
    canDelete: r.canDelete,
    parentRoleId: r.parentRoleId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))

  const permissionsByCategory: PermissionsByCategory = permsByCat
  const canManageRoles = hasPermission(userPermissions, 'team.roles.manage')

  return (
    <PermissionsPageClient
      roles={roles}
      permissionsByCategory={permissionsByCategory}
      canManageRoles={canManageRoles}
    />
  )
}

function PermissionsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="h-10 w-64 animate-pulse rounded bg-muted" />
        <div className="h-10 w-40 animate-pulse rounded bg-muted" />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="h-96 animate-pulse bg-muted" />
        </CardContent>
      </Card>
    </div>
  )
}

export default async function PermissionsPage() {
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
              You do not have permission to view the permission matrix.
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
        <h1 className="text-2xl font-bold tracking-tight">Permission Matrix</h1>
        <p className="text-muted-foreground">
          Overview of all roles and their permissions
        </p>
      </div>

      <Suspense fallback={<PermissionsLoadingSkeleton />}>
        <PermissionsDataLoader />
      </Suspense>
    </div>
  )
}
