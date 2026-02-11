'use client'

import { Badge } from '@cgk/ui'
import { cn } from '@cgk/ui'

type UserStatus = 'active' | 'disabled' | 'pending_verification' | 'invited'

interface UserStatusBadgeProps {
  status: UserStatus
  className?: string
}

const statusConfig: Record<UserStatus, { label: string; variant: 'success' | 'destructive' | 'warning' | 'secondary' }> = {
  active: {
    label: 'Active',
    variant: 'success',
  },
  disabled: {
    label: 'Disabled',
    variant: 'destructive',
  },
  pending_verification: {
    label: 'Pending',
    variant: 'warning',
  },
  invited: {
    label: 'Invited',
    variant: 'secondary',
  },
}

/**
 * Badge component for displaying user status
 */
export function UserStatusBadge({ status, className }: UserStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.active

  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  )
}

interface SuperAdminBadgeProps {
  className?: string
}

/**
 * Badge indicating super admin status
 */
export function SuperAdminBadge({ className }: SuperAdminBadgeProps) {
  return (
    <Badge
      variant="default"
      className={cn(
        'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
        className
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="mr-1 h-3 w-3"
      >
        <path
          fillRule="evenodd"
          d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
          clipRule="evenodd"
        />
      </svg>
      Super Admin
    </Badge>
  )
}
