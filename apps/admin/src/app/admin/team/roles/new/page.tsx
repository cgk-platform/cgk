import {
  getPermissionsByCategory,
  getPredefinedRoles,
  getUserPermissions,
  hasPermission,
  requireAuth,
} from '@cgk/auth'
import { Card, CardContent } from '@cgk/ui'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { RoleEditor } from '@/components/roles'
import type { PermissionsByCategory, Role } from '@/components/roles/types'

async function NewRoleDataLoader() {
  const [predefinedRolesRaw, permsByCat] = await Promise.all([
    getPredefinedRoles(),
    Promise.resolve(getPermissionsByCategory()),
  ])

  const predefinedRoles: Role[] = predefinedRolesRaw.map((r) => ({
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

  return (
    <RoleEditor
      role={null}
      predefinedRoles={predefinedRoles}
      permissionsByCategory={permissionsByCategory}
    />
  )
}

function NewRoleLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
          <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          <div className="h-20 w-full animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    </div>
  )
}

export default async function NewRolePage() {
  // Verify auth and permission
  const headersList = await headers()
  const mockRequest = new Request('http://localhost', {
    headers: headersList,
  })

  try {
    const auth = await requireAuth(mockRequest)
    const permissions = await getUserPermissions(auth.userId, auth.tenantId || '')

    if (!hasPermission(permissions, 'team.roles.manage')) {
      return (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">Access Denied</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You do not have permission to create roles.
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
        <h1 className="text-2xl font-bold tracking-tight">Create Role</h1>
        <p className="text-muted-foreground">
          Define a custom role with specific permissions
        </p>
      </div>

      <Suspense fallback={<NewRoleLoadingSkeleton />}>
        <NewRoleDataLoader />
      </Suspense>
    </div>
  )
}
