import {
  getPermissionsByCategory,
  getPredefinedRoles,
  getRoleWithInheritance,
  getUserPermissions,
  hasPermission,
  requireAuth,
} from '@cgk/auth'
import { Card, CardContent } from '@cgk/ui'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'

import { RoleEditor } from '@/components/roles'
import type { PermissionsByCategory, Role } from '@/components/roles/types'

interface PageParams {
  params: Promise<{ id: string }>
}

async function RoleEditorDataLoader({ roleId }: { roleId: string }) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const userId = headersList.get('x-user-id')

  if (!tenantId || !userId) {
    redirect('/login')
  }

  const [roleRaw, predefinedRolesRaw, permsByCat, userPermissions] = await Promise.all([
    getRoleWithInheritance(roleId),
    getPredefinedRoles(),
    Promise.resolve(getPermissionsByCategory()),
    getUserPermissions(userId, tenantId),
  ])

  if (!roleRaw) {
    notFound()
  }

  // Verify role is accessible to tenant
  if (roleRaw.tenantId && roleRaw.tenantId !== tenantId) {
    notFound()
  }

  const role: Role = {
    id: roleRaw.id,
    name: roleRaw.name,
    description: roleRaw.description,
    permissions: roleRaw.permissions,
    isPredefined: roleRaw.isPredefined,
    canDelete: roleRaw.canDelete,
    parentRoleId: roleRaw.parentRoleId,
    createdAt: roleRaw.createdAt.toISOString(),
    updatedAt: roleRaw.updatedAt.toISOString(),
  }

  const predefinedRoles: Role[] = predefinedRolesRaw
    .filter((r) => r.id !== roleId) // Exclude self from parent options
    .map((r) => ({
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
  const isReadOnly = role.isPredefined || !canManageRoles

  return (
    <RoleEditor
      role={role}
      predefinedRoles={predefinedRoles}
      permissionsByCategory={permissionsByCategory}
      readOnly={isReadOnly}
    />
  )
}

function RoleEditorLoadingSkeleton() {
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
      <Card>
        <CardContent className="p-6">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function RoleDetailPage({ params }: PageParams) {
  const { id } = await params

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
        <h1 className="text-2xl font-bold tracking-tight">Role Details</h1>
        <p className="text-muted-foreground">
          View and edit role permissions
        </p>
      </div>

      <Suspense fallback={<RoleEditorLoadingSkeleton />}>
        <RoleEditorDataLoader roleId={id} />
      </Suspense>
    </div>
  )
}
