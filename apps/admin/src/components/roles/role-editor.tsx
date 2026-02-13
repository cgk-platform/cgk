'use client'

import { Button, Card, CardContent, Input, Label, Textarea } from '@cgk-platform/ui'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import type { PermissionsByCategory, Role } from './types'

interface RoleEditorProps {
  /** Existing role to edit (null for create mode) */
  role: Role | null
  /** Available predefined roles for inheritance */
  predefinedRoles: Role[]
  /** All permissions grouped by category */
  permissionsByCategory: PermissionsByCategory
  /** Whether the form is in read-only mode */
  readOnly?: boolean
}

export function RoleEditor({
  role,
  predefinedRoles,
  permissionsByCategory,
  readOnly = false,
}: RoleEditorProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Form state
  const [name, setName] = React.useState(role?.name ?? '')
  const [description, setDescription] = React.useState(role?.description ?? '')
  const [parentRoleId, setParentRoleId] = React.useState<string | null>(
    role?.parentRoleId ?? null
  )
  const [selectedPermissions, setSelectedPermissions] = React.useState<Set<string>>(
    new Set(role?.permissions ?? [])
  )

  // Get parent role permissions for display
  const parentRole = parentRoleId
    ? predefinedRoles.find((r) => r.id === parentRoleId)
    : null
  const inheritedPermissions = new Set(parentRole?.permissions ?? [])

  // Check if a permission is inherited (from parent)
  const isInherited = (permission: string): boolean => {
    if (!parentRole) return false

    // Check exact match
    if (inheritedPermissions.has(permission)) return true

    // Check wildcard inheritance
    if (inheritedPermissions.has('*')) return true

    const [category, action] = permission.split('.')
    if (inheritedPermissions.has(`${category}.*`)) return true
    if (inheritedPermissions.has(`*.${action}`)) return true

    return false
  }

  // Toggle permission selection
  const togglePermission = (permission: string) => {
    if (readOnly || isInherited(permission)) return

    const newSet = new Set(selectedPermissions)
    if (newSet.has(permission)) {
      newSet.delete(permission)
    } else {
      newSet.add(permission)
    }
    setSelectedPermissions(newSet)
  }

  // Toggle all permissions in a category
  const toggleCategory = (category: string) => {
    if (readOnly) return

    const categoryPerms = permissionsByCategory[category] ?? []
    const allSelected = categoryPerms.every(
      (p) => selectedPermissions.has(p.key) || isInherited(p.key)
    )

    const newSet = new Set(selectedPermissions)
    for (const perm of categoryPerms) {
      if (isInherited(perm.key)) continue

      if (allSelected) {
        newSet.delete(perm.key)
      } else {
        newSet.add(perm.key)
      }
    }
    setSelectedPermissions(newSet)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (readOnly) return

    setIsSubmitting(true)
    setError(null)

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      permissions: Array.from(selectedPermissions),
      parentRoleId: parentRoleId || undefined,
    }

    try {
      const url = role ? `/api/admin/roles/${role.id}` : '/api/admin/roles'
      const method = role ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save role')
      }

      router.push('/admin/team/roles')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (readOnly || !role || role.isPredefined) return

    if (!confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/roles/${role.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete role')
      }

      router.push('/admin/team/roles')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsSubmitting(false)
    }
  }

  const categories = Object.keys(permissionsByCategory).sort()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <Label htmlFor="name">Role Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Marketing Manager"
              disabled={readOnly}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this role's purpose"
              disabled={readOnly}
              rows={2}
            />
          </div>

          {!role?.isPredefined && (
            <div>
              <Label htmlFor="parentRole">Inherit From (Optional)</Label>
              <select
                id="parentRole"
                value={parentRoleId ?? ''}
                onChange={(e) => setParentRoleId(e.target.value || null)}
                disabled={readOnly}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">No inheritance</option>
                {predefinedRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Inherited permissions cannot be removed
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 text-lg font-medium">Permissions</h3>

          {role?.permissions.includes('*') ? (
            <div className="rounded-md bg-muted p-4 text-sm">
              This role has <strong>full access</strong> to all features.
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map((category) => {
                const perms = permissionsByCategory[category]
                if (!perms || perms.length === 0) return null

                const allSelected = perms.every(
                  (p) => selectedPermissions.has(p.key) || isInherited(p.key)
                )

                return (
                  <div key={category}>
                    <div className="mb-2 flex items-center gap-2">
                      {!readOnly && (
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => toggleCategory(category)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      )}
                      <h4 className="font-medium capitalize">{category}</h4>
                    </div>

                    <div className="ml-6 grid gap-2 sm:grid-cols-2">
                      {perms.map((perm) => {
                        const inherited = isInherited(perm.key)
                        const selected =
                          inherited || selectedPermissions.has(perm.key)

                        return (
                          <label
                            key={perm.key}
                            className={`flex items-start gap-2 rounded-md p-2 ${
                              inherited
                                ? 'cursor-not-allowed bg-muted/50'
                                : readOnly
                                  ? 'cursor-default'
                                  : 'cursor-pointer hover:bg-muted/50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => togglePermission(perm.key)}
                              disabled={readOnly || inherited}
                              className="mt-0.5 h-4 w-4 rounded border-gray-300"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <span
                                  className={`text-sm ${inherited ? 'text-muted-foreground' : ''}`}
                                >
                                  {perm.name}
                                </span>
                                {inherited && (
                                  <span className="text-xs text-muted-foreground">
                                    (inherited)
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {perm.description}
                              </p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {!readOnly && (
        <div className="flex items-center justify-between">
          <div>
            {role && role.canDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                Delete Role
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/team/roles')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting
                ? 'Saving...'
                : role
                  ? 'Update Role'
                  : 'Create Role'}
            </Button>
          </div>
        </div>
      )}

      {readOnly && role?.isPredefined && (
        <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
          Predefined roles cannot be modified.
        </div>
      )}
    </form>
  )
}
