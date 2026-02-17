'use client'

import { StatusBadge } from '@cgk-platform/ui'
import { getStatusDisplayInfo, type ProjectStatus } from '@/lib/projects/helpers'

interface ProjectStatusBadgeProps {
  status: ProjectStatus
  size?: 'sm' | 'md'
}

/**
 * Maps project status colors to StatusBadge variants
 * This bridges the project-specific color scheme to the shared design system
 */
const colorToVariant: Record<string, 'muted' | 'warning' | 'info' | 'success' | 'error'> = {
  gray: 'muted',
  yellow: 'warning',
  blue: 'info',
  orange: 'warning',
  green: 'success',
  red: 'error',
}

export function ProjectStatusBadge({
  status,
  size = 'md',
}: ProjectStatusBadgeProps): React.JSX.Element {
  const info = getStatusDisplayInfo(status)
  const variant = colorToVariant[info.color] || 'muted'

  return (
    <StatusBadge
      variant={variant}
      size={size === 'sm' ? 'sm' : 'default'}
      label={info.label}
      title={info.description}
    />
  )
}
