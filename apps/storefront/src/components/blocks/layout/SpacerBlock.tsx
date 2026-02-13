/**
 * Spacer Block Component
 *
 * Simple vertical spacing element with configurable height.
 * Can be hidden on mobile devices.
 */

import { cn } from '@cgk-platform/ui'
import type { BlockProps, SpacerConfig } from '../types'

/**
 * Height class mapping
 */
const heightClasses = {
  xs: 'h-4 sm:h-6',
  sm: 'h-8 sm:h-12',
  md: 'h-16 sm:h-24',
  lg: 'h-24 sm:h-40',
  xl: 'h-32 sm:h-56',
}

/**
 * Spacer Block Component
 */
export function SpacerBlock({ block, className }: BlockProps<SpacerConfig>) {
  const { height = 'md', showOnMobile = true } = block.config

  return (
    <div
      className={cn(
        heightClasses[height],
        !showOnMobile && 'hidden sm:block',
        className
      )}
      aria-hidden="true"
    />
  )
}
