/**
 * Divider Block Component
 *
 * Horizontal divider line with configurable style, color, and width.
 */

import { cn } from '@cgk/ui'
import type { BlockProps, DividerConfig } from '../types'

/**
 * Width class mapping
 */
const widthClasses = {
  full: 'w-full',
  half: 'w-1/2',
  quarter: 'w-1/4',
}

/**
 * Margin class mapping
 */
const marginClasses = {
  sm: 'my-8',
  md: 'my-16',
  lg: 'my-24',
}

/**
 * Divider Block Component
 */
export function DividerBlock({ block, className }: BlockProps<DividerConfig>) {
  const {
    style = 'solid',
    color,
    width = 'full',
    margin = 'md',
  } = block.config

  if (style === 'gradient') {
    return (
      <div className={cn('mx-auto', widthClasses[width], marginClasses[margin], className)}>
        <div
          className="h-px bg-gradient-to-r from-transparent via-[hsl(var(--portal-border))] to-transparent"
          style={color ? { background: `linear-gradient(to right, transparent, ${color}, transparent)` } : undefined}
        />
      </div>
    )
  }

  return (
    <hr
      className={cn(
        'mx-auto border-t',
        widthClasses[width],
        marginClasses[margin],
        style === 'dashed' && 'border-dashed',
        style === 'dotted' && 'border-dotted',
        className
      )}
      style={{
        borderColor: color || 'hsl(var(--portal-border))',
      }}
    />
  )
}
