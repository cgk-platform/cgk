'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'

import { PermissionMatrix } from '@/components/roles'
import type { PermissionsByCategory, Role } from '@/components/roles/types'

interface PermissionsPageClientProps {
  roles: Role[]
  permissionsByCategory: PermissionsByCategory
  canManageRoles: boolean
}

export function PermissionsPageClient({
  roles: initialRoles,
  permissionsByCategory,
  canManageRoles,
}: PermissionsPageClientProps) {
  const router = useRouter()
  const [roles, setRoles] = React.useState<Role[]>(initialRoles)
  const [isUpdating, setIsUpdating] = React.useState(false)

  const handleTogglePermission = async (
    roleId: string,
    permission: string,
    enabled: boolean
  ) => {
    const role = roles.find((r) => r.id === roleId)
    if (!role || role.isPredefined) return

    setIsUpdating(true)

    // Optimistically update the UI
    const newPermissions = enabled
      ? [...role.permissions, permission]
      : role.permissions.filter((p) => p !== permission)

    setRoles((prev) =>
      prev.map((r) =>
        r.id === roleId ? { ...r, permissions: newPermissions } : r
      )
    )

    try {
      const response = await fetch(`/api/admin/roles/${roleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: newPermissions }),
      })

      if (!response.ok) {
        // Revert on failure
        setRoles((prev) =>
          prev.map((r) =>
            r.id === roleId ? { ...r, permissions: role.permissions } : r
          )
        )
        const data = await response.json()
        console.error('Failed to update permission:', data.error)
      } else {
        // Refresh data from server
        router.refresh()
      }
    } catch (error) {
      // Revert on error
      setRoles((prev) =>
        prev.map((r) =>
          r.id === roleId ? { ...r, permissions: role.permissions } : r
        )
      )
      console.error('Failed to update permission:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className={isUpdating ? 'pointer-events-none opacity-70' : ''}>
      <PermissionMatrix
        roles={roles}
        permissionsByCategory={permissionsByCategory}
        canManageRoles={canManageRoles}
        onTogglePermission={handleTogglePermission}
      />
    </div>
  )
}
