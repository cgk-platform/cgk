'use client'

import { getStatusDisplayInfo, type ProjectStatus } from '@/lib/projects/helpers'

interface ProjectStatusBadgeProps {
  status: ProjectStatus
  size?: 'sm' | 'md'
}

const colorClasses: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export function ProjectStatusBadge({
  status,
  size = 'md',
}: ProjectStatusBadgeProps): React.JSX.Element {
  const info = getStatusDisplayInfo(status)
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${colorClasses[info.color]}`}
      title={info.description}
    >
      {info.label}
    </span>
  )
}
