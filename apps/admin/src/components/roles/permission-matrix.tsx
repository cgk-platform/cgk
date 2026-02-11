'use client'

import { Badge, Card, CardContent } from '@cgk/ui'
import * as React from 'react'

import type { PermissionsByCategory, Role } from './types'

interface PermissionMatrixProps {
  roles: Role[]
  permissionsByCategory: PermissionsByCategory
  canManageRoles: boolean
  onTogglePermission?: (roleId: string, permission: string, enabled: boolean) => void
}

/**
 * Permission matrix showing all roles vs all permissions
 * Rows: Permissions (grouped by category)
 * Columns: Roles (predefined + custom)
 */
export function PermissionMatrix({
  roles,
  permissionsByCategory,
  canManageRoles,
  onTogglePermission,
}: PermissionMatrixProps) {
  const [filter, setFilter] = React.useState('')
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null)

  const categories = Object.keys(permissionsByCategory).sort()

  // Filter permissions based on search and category
  const filteredCategories = categories.filter((cat) => {
    if (selectedCategory && cat !== selectedCategory) return false
    if (!filter) return true

    const perms = permissionsByCategory[cat]
    return perms?.some(
      (p) =>
        p.key.toLowerCase().includes(filter.toLowerCase()) ||
        p.name.toLowerCase().includes(filter.toLowerCase()) ||
        p.description.toLowerCase().includes(filter.toLowerCase())
    )
  })

  // Check if a role has a specific permission (including wildcards)
  const roleHasPermission = (role: Role, permission: string): boolean => {
    if (role.permissions.includes(permission)) return true
    if (role.permissions.includes('*')) return true

    const [category, action] = permission.split('.')
    if (role.permissions.includes(`${category}.*`)) return true
    if (role.permissions.includes(`*.${action}`)) return true

    return false
  }

  // Check if permission is granted via wildcard (not directly)
  const isWildcardGrant = (role: Role, permission: string): boolean => {
    if (role.permissions.includes(permission)) return false
    return roleHasPermission(role, permission)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <input
          type="search"
          placeholder="Search permissions..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-64 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <select
          value={selectedCategory ?? ''}
          onChange={(e) => setSelectedCategory(e.target.value || null)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Matrix Table */}
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left text-sm font-medium">
                  Permission
                </th>
                {roles.map((role) => (
                  <th
                    key={role.id}
                    className="min-w-[120px] px-4 py-3 text-center text-sm font-medium"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="truncate">{role.name}</span>
                      {role.isPredefined && (
                        <Badge variant="secondary" className="text-xs">
                          Predefined
                        </Badge>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((category) => {
                let perms = permissionsByCategory[category] ?? []

                // Filter permissions in category
                if (filter) {
                  perms = perms.filter(
                    (p) =>
                      p.key.toLowerCase().includes(filter.toLowerCase()) ||
                      p.name.toLowerCase().includes(filter.toLowerCase()) ||
                      p.description.toLowerCase().includes(filter.toLowerCase())
                  )
                }

                if (perms.length === 0) return null

                return (
                  <React.Fragment key={category}>
                    {/* Category header row */}
                    <tr className="bg-muted/30">
                      <td
                        colSpan={roles.length + 1}
                        className="sticky left-0 px-4 py-2 text-sm font-semibold capitalize"
                      >
                        {category}
                      </td>
                    </tr>

                    {/* Permission rows */}
                    {perms.map((perm) => (
                      <tr key={perm.key} className="border-b hover:bg-muted/10">
                        <td
                          className="sticky left-0 z-10 bg-background px-4 py-2"
                          title={perm.description}
                        >
                          <div className="text-sm">{perm.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {perm.key}
                          </div>
                        </td>
                        {roles.map((role) => {
                          const hasPermission = roleHasPermission(role, perm.key)
                          const isWildcard = isWildcardGrant(role, perm.key)
                          const canEdit =
                            canManageRoles && !role.isPredefined && !isWildcard

                          return (
                            <td
                              key={role.id}
                              className="px-4 py-2 text-center"
                            >
                              {hasPermission ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (canEdit && onTogglePermission) {
                                      onTogglePermission(role.id, perm.key, false)
                                    }
                                  }}
                                  disabled={!canEdit}
                                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
                                    isWildcard
                                      ? 'bg-muted text-muted-foreground'
                                      : 'bg-green-100 text-green-600'
                                  } ${canEdit ? 'cursor-pointer hover:bg-green-200' : 'cursor-default'}`}
                                  title={
                                    isWildcard
                                      ? 'Granted via wildcard'
                                      : canEdit
                                        ? 'Click to remove'
                                        : 'Cannot edit predefined roles'
                                  }
                                >
                                  <CheckIcon />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (canEdit && onTogglePermission) {
                                      onTogglePermission(role.id, perm.key, true)
                                    }
                                  }}
                                  disabled={!canEdit}
                                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground ${
                                    canEdit ? 'cursor-pointer hover:bg-muted' : 'cursor-default'
                                  }`}
                                  title={
                                    canEdit
                                      ? 'Click to grant'
                                      : 'Cannot edit predefined roles'
                                  }
                                >
                                  <MinusIcon />
                                </button>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckIcon />
          </span>
          <span>Granted directly</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <CheckIcon />
          </span>
          <span>Granted via wildcard</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground">
            <MinusIcon />
          </span>
          <span>Not granted</span>
        </div>
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-3 w-3"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function MinusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-3 w-3"
    >
      <path
        fillRule="evenodd"
        d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z"
        clipRule="evenodd"
      />
    </svg>
  )
}
