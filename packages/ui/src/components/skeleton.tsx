import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../utils/cn'

const skeletonVariants = cva('animate-pulse rounded-md bg-muted', {
  variants: {
    variant: {
      default: '',
      text: 'h-4 w-full',
      title: 'h-6 w-3/4',
      avatar: 'rounded-full',
      button: 'h-10 w-24',
      card: 'h-32 w-full',
      image: 'aspect-video w-full',
      input: 'h-10 w-full',
      badge: 'h-5 w-16 rounded-full',
    },
    size: {
      sm: '',
      md: '',
      lg: '',
    },
  },
  compoundVariants: [
    // Avatar sizes
    { variant: 'avatar', size: 'sm', className: 'h-8 w-8' },
    { variant: 'avatar', size: 'md', className: 'h-10 w-10' },
    { variant: 'avatar', size: 'lg', className: 'h-12 w-12' },
    // Text sizes
    { variant: 'text', size: 'sm', className: 'h-3' },
    { variant: 'text', size: 'md', className: 'h-4' },
    { variant: 'text', size: 'lg', className: 'h-5' },
  ],
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
})

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

/**
 * Basic skeleton component for loading states
 */
function Skeleton({ className, variant, size, ...props }: SkeletonProps) {
  return <div className={cn(skeletonVariants({ variant, size }), className)} {...props} />
}

/**
 * Skeleton for text content with multiple lines
 */
interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number
  lastLineWidth?: 'full' | '3/4' | '1/2' | '1/4'
}

function SkeletonText({
  lines = 3,
  lastLineWidth = '3/4',
  className,
  ...props
}: SkeletonTextProps) {
  const widthClasses = {
    full: 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2',
    '1/4': 'w-1/4',
  }

  return (
    <div className={cn('space-y-2', className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={i === lines - 1 ? widthClasses[lastLineWidth] : 'w-full'}
        />
      ))}
    </div>
  )
}

/**
 * Skeleton for card layouts
 */
interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  showImage?: boolean
  showAvatar?: boolean
  lines?: number
}

function SkeletonCard({
  showImage = true,
  showAvatar = false,
  lines = 2,
  className,
  ...props
}: SkeletonCardProps) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-card p-4 space-y-4', className)}
      {...props}
    >
      {showImage && <Skeleton variant="image" />}
      <div className="space-y-3">
        {showAvatar && (
          <div className="flex items-center gap-3">
            <Skeleton variant="avatar" size="md" />
            <div className="space-y-1.5 flex-1">
              <Skeleton variant="text" className="w-32" />
              <Skeleton variant="text" size="sm" className="w-24" />
            </div>
          </div>
        )}
        <Skeleton variant="title" />
        <SkeletonText lines={lines} />
      </div>
    </div>
  )
}

/**
 * Skeleton for table rows
 */
interface SkeletonTableProps extends React.HTMLAttributes<HTMLDivElement> {
  rows?: number
  columns?: number
  showHeader?: boolean
}

function SkeletonTable({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
  ...props
}: SkeletonTableProps) {
  return (
    <div className={cn('w-full', className)} {...props}>
      {/* Header */}
      {showHeader && (
        <div className="flex gap-4 border-b border-border pb-3 mb-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} variant="text" size="sm" className="flex-1" />
          ))}
        </div>
      )}
      {/* Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                variant="text"
                className={cn(
                  'flex-1',
                  colIndex === 0 && 'w-12 flex-none',
                  colIndex === columns - 1 && 'w-20 flex-none'
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton for list items
 */
interface SkeletonListProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: number
  showAvatar?: boolean
  showAction?: boolean
}

function SkeletonList({
  items = 5,
  showAvatar = true,
  showAction = false,
  className,
  ...props
}: SkeletonListProps) {
  return (
    <div className={cn('space-y-3', className)} {...props}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          {showAvatar && <Skeleton variant="avatar" size="md" />}
          <div className="flex-1 space-y-1.5">
            <Skeleton variant="text" className="w-48" />
            <Skeleton variant="text" size="sm" className="w-32" />
          </div>
          {showAction && <Skeleton variant="button" className="w-20" />}
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton for stats/KPI cards
 */
interface SkeletonStatsProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: number
}

function SkeletonStats({ items = 4, className, ...props }: SkeletonStatsProps) {
  return (
    <div className={cn('grid gap-4', className)} {...props}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
          <Skeleton variant="text" size="sm" className="w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton variant="text" size="sm" className="w-16" />
        </div>
      ))}
    </div>
  )
}

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  SkeletonStats,
  skeletonVariants,
}
