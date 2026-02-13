/**
 * User Status Badges
 *
 * Uses @cgk-platform/ui StatusBadge for consistent styling.
 */

'use client'

import { StatusBadge, cn } from '@cgk-platform/ui'
import { Star } from 'lucide-react'

type UserStatus = 'active' | 'disabled' | 'pending_verification' | 'invited'

interface UserStatusBadgeProps {
  status: UserStatus
  className?: string
}

/**
 * Badge component for displaying user status
 */
export function UserStatusBadge({ status, className }: UserStatusBadgeProps) {
  return <StatusBadge status={status} className={className} />
}

interface SuperAdminBadgeProps {
  className?: string
}

/**
 * Badge indicating super admin status
 */
export function SuperAdminBadge({ className }: SuperAdminBadgeProps) {
  return (
    <StatusBadge
      status="super_admin"
      label="Super Admin"
      variant="default"
      className={cn('bg-gold/15 text-gold border border-gold/20', className)}
    >
      <Star className="mr-1 h-3 w-3" />
    </StatusBadge>
  )
}
