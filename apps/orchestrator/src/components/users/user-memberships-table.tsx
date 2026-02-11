'use client'

import { Badge, cn } from '@cgk/ui'
import Link from 'next/link'

interface UserMembership {
  tenantId: string
  tenantName: string
  tenantSlug: string
  tenantLogoUrl: string | null
  role: string
  joinedAt: string
  isActive: boolean
}

interface UserMembershipsTableProps {
  memberships: UserMembership[]
  className?: string
}

/**
 * Format a date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Get role badge variant
 */
function getRoleVariant(role: string): 'default' | 'secondary' | 'outline' {
  switch (role.toLowerCase()) {
    case 'owner':
      return 'default'
    case 'admin':
      return 'secondary'
    default:
      return 'outline'
  }
}

/**
 * Table showing all tenant memberships for a user
 */
export function UserMembershipsTable({ memberships, className }: UserMembershipsTableProps) {
  if (memberships.length === 0) {
    return (
      <div className={cn('rounded-lg border p-6 text-center text-muted-foreground', className)}>
        This user is not a member of any tenants.
      </div>
    )
  }

  return (
    <div className={cn('overflow-hidden rounded-lg border', className)}>
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Tenant
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Role
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Joined
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {memberships.map((membership) => (
            <tr key={membership.tenantId} className="hover:bg-muted/50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {membership.tenantLogoUrl ? (
                    <img
                      src={membership.tenantLogoUrl}
                      alt={membership.tenantName}
                      className="h-8 w-8 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-xs font-medium">
                      {membership.tenantName.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <Link
                      href={`/brands/${membership.tenantId}`}
                      className="font-medium hover:underline"
                    >
                      {membership.tenantName}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {membership.tenantSlug}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant={getRoleVariant(membership.role)}>
                  {membership.role.charAt(0).toUpperCase() + membership.role.slice(1)}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  {formatDate(membership.joinedAt)}
                </span>
              </td>
              <td className="px-4 py-3">
                <Badge variant={membership.isActive ? 'success' : 'secondary'}>
                  {membership.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
