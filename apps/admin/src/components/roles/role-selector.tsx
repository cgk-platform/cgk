'use client'

import { Badge, Label } from '@cgk/ui'
import * as React from 'react'

import type { Role } from './types'

interface RoleSelectorProps {
  roles: Role[]
  selectedRoleId: string | null
  onChange: (roleId: string) => void
  disabled?: boolean
  label?: string
  showDescription?: boolean
}

/**
 * Dropdown for selecting a role
 * Used in team management for assigning roles to members
 */
export function RoleSelector({
  roles,
  selectedRoleId,
  onChange,
  disabled = false,
  label = 'Role',
  showDescription = true,
}: RoleSelectorProps) {
  const selectedRole = roles.find((r) => r.id === selectedRoleId)

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}

      <select
        value={selectedRoleId ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="" disabled>
          Select a role...
        </option>

        {/* Predefined roles first */}
        <optgroup label="Predefined Roles">
          {roles
            .filter((r) => r.isPredefined)
            .map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
        </optgroup>

        {/* Custom roles */}
        {roles.some((r) => !r.isPredefined) && (
          <optgroup label="Custom Roles">
            {roles
              .filter((r) => !r.isPredefined)
              .map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
          </optgroup>
        )}
      </select>

      {showDescription && selectedRole && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          {selectedRole.isPredefined && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              Predefined
            </Badge>
          )}
          {selectedRole.description && <span>{selectedRole.description}</span>}
        </div>
      )}
    </div>
  )
}

interface RoleSelectorCompactProps {
  roles: Role[]
  selectedRoleId: string | null
  onChange: (roleId: string) => void
  disabled?: boolean
}

/**
 * Compact role selector for inline use (e.g., in tables)
 */
export function RoleSelectorCompact({
  roles,
  selectedRoleId,
  onChange,
  disabled = false,
}: RoleSelectorCompactProps) {
  return (
    <select
      value={selectedRoleId ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="h-8 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    >
      {roles.map((role) => (
        <option key={role.id} value={role.id}>
          {role.name}
        </option>
      ))}
    </select>
  )
}
