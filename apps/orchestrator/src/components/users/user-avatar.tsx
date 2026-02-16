'use client'

import { cn } from '@cgk-platform/ui'

interface UserAvatarProps {
  name: string | null
  avatarUrl: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

/**
 * Get initials from a name (up to 2 characters)
 */
function getInitials(name: string | null): string {
  if (!name) return '?'

  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0]!.substring(0, 2).toUpperCase()
  }

  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

/**
 * Generate a consistent color from a string using theme-compatible colors
 */
function stringToColor(str: string): string {
  // Theme-compatible color palette using HSL values that work with the design system
  const colors = [
    'bg-primary',           // Deep Navy
    'bg-primary/80',        // Lighter Navy
    'bg-gold',              // Gold accent
    'bg-gold/80',           // Lighter Gold
    'bg-info',              // Info blue
    'bg-success',           // Success green
    'bg-warning',           // Warning amber
    'bg-[hsl(280,60%,50%)]', // Purple (theme-compatible)
    'bg-[hsl(340,60%,50%)]', // Pink (theme-compatible)
    'bg-[hsl(180,60%,40%)]', // Teal (theme-compatible)
  ]

  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]!
}

/**
 * User avatar component with fallback to initials
 */
export function UserAvatar({ name, avatarUrl, size = 'md', className }: UserAvatarProps) {
  const initials = getInitials(name)
  const colorClass = stringToColor(name || 'unknown')

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'User avatar'}
        className={cn(
          'rounded-full object-cover',
          sizeClasses[size],
          className
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-medium text-white',
        sizeClasses[size],
        colorClass,
        className
      )}
      aria-label={name || 'User'}
    >
      {initials}
    </div>
  )
}
