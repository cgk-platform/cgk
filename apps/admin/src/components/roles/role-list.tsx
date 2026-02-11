'use client'

import { Badge, Button, Card, CardContent } from '@cgk/ui'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import type { Role } from './types'

interface RoleListProps {
  roles: Role[]
  canManageRoles: boolean
}

export function RoleList({ roles, canManageRoles }: RoleListProps) {
  const router = useRouter()

  const predefinedRoles = roles.filter((r) => r.isPredefined)
  const customRoles = roles.filter((r) => !r.isPredefined)

  return (
    <div className="space-y-8">
      {/* Predefined Roles */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Predefined Roles</h3>
            <p className="text-sm text-muted-foreground">
              Platform-wide roles available to all tenants
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {predefinedRoles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              onClick={() => router.push(`/admin/team/roles/${role.id}`)}
            />
          ))}
        </div>
      </div>

      {/* Custom Roles */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Custom Roles</h3>
            <p className="text-sm text-muted-foreground">
              Roles specific to your organization
            </p>
          </div>
          {canManageRoles && (
            <Button onClick={() => router.push('/admin/team/roles/new')}>
              Create Role
            </Button>
          )}
        </div>

        {customRoles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No custom roles yet.{' '}
                {canManageRoles && 'Create one to define specific access levels.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customRoles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                onClick={() => router.push(`/admin/team/roles/${role.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface RoleCardProps {
  role: Role
  onClick: () => void
}

function RoleCard({ role, onClick }: RoleCardProps) {
  const permissionCount = role.permissions.length
  const hasWildcard = role.permissions.includes('*')

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h4 className="truncate font-medium">{role.name}</h4>
            {role.description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {role.description}
              </p>
            )}
          </div>
          {role.isPredefined && (
            <Badge variant="secondary" className="ml-2 shrink-0">
              Predefined
            </Badge>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          {hasWildcard ? (
            <span>Full access</span>
          ) : (
            <span>
              {permissionCount} permission{permissionCount !== 1 ? 's' : ''}
            </span>
          )}

          {role.parentRoleId && (
            <Badge variant="outline" className="text-xs">
              Inherits
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
