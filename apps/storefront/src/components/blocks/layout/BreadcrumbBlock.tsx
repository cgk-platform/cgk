'use client'

/**
 * Breadcrumb Block Component
 *
 * Navigation breadcrumb trail with configurable separator,
 * home link, and support for collapsible middle items.
 */

import { Fragment, useState } from 'react'
import Link from 'next/link'
import { cn } from '@cgk-platform/ui'
import { ChevronRight, Home, MoreHorizontal } from 'lucide-react'
import type { BlockProps, BreadcrumbBlockConfig, BreadcrumbItem } from '../types'

/**
 * Separator component based on config
 */
function Separator({ type }: { type: '/' | '>' | '-' | 'chevron' }) {
  if (type === 'chevron') {
    return (
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-[hsl(var(--portal-muted-foreground))]" />
    )
  }

  const separatorMap = {
    '/': '/',
    '>': '>',
    '-': '-',
  }

  return (
    <span className="mx-2 text-[hsl(var(--portal-muted-foreground))]">
      {separatorMap[type]}
    </span>
  )
}

/**
 * Breadcrumb link component
 */
function BreadcrumbLink({
  item,
  isLast,
  showIcon = false,
}: {
  item: BreadcrumbItem
  isLast: boolean
  showIcon?: boolean
}) {
  const content = (
    <span className="flex items-center gap-1.5">
      {showIcon && <Home className="h-4 w-4" />}
      {item.label}
    </span>
  )

  if (isLast || !item.href) {
    return (
      <span
        className={cn(
          'text-sm',
          isLast
            ? 'font-medium text-[hsl(var(--portal-foreground))]'
            : 'text-[hsl(var(--portal-muted-foreground))]'
        )}
        aria-current={isLast ? 'page' : undefined}
      >
        {content}
      </span>
    )
  }

  return (
    <Link
      href={item.href}
      className={cn(
        'text-sm text-[hsl(var(--portal-muted-foreground))]',
        'hover:text-[hsl(var(--portal-foreground))]',
        'hover:underline underline-offset-4',
        'transition-colors duration-150'
      )}
    >
      {content}
    </Link>
  )
}

/**
 * Collapsed breadcrumb items component
 */
function CollapsedItems({
  items,
  onExpand,
}: {
  items: BreadcrumbItem[]
  onExpand: () => void
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className={cn(
        'inline-flex items-center justify-center',
        'h-6 w-6 rounded',
        'text-[hsl(var(--portal-muted-foreground))]',
        'hover:bg-[hsl(var(--portal-muted))]',
        'hover:text-[hsl(var(--portal-foreground))]',
        'transition-colors duration-150'
      )}
      aria-label={`Show ${items.length} more items`}
      title={items.map((i) => i.label).join(' > ')}
    >
      <MoreHorizontal className="h-4 w-4" />
    </button>
  )
}

/**
 * Breadcrumb Block Component
 */
export function BreadcrumbBlock({ block, className }: BlockProps<BreadcrumbBlockConfig>) {
  const {
    items = [],
    separator = '/',
    showHome = true,
    homeLabel = 'Home',
    homeHref = '/',
    showCurrentPage = true,
    maxItems,
    backgroundColor,
  } = block.config

  const [isExpanded, setIsExpanded] = useState(false)

  // Build full breadcrumb list
  const breadcrumbItems: BreadcrumbItem[] = []

  // Add home item if configured
  if (showHome) {
    breadcrumbItems.push({ label: homeLabel, href: homeHref })
  }

  // Add provided items
  breadcrumbItems.push(...items)

  // Remove last item if we don't want to show current page
  const displayItems = showCurrentPage
    ? breadcrumbItems
    : breadcrumbItems.slice(0, -1)

  // Handle collapsing middle items if maxItems is set
  let collapsedItems: BreadcrumbItem[] = []
  let visibleItems = displayItems

  if (maxItems && displayItems.length > maxItems && !isExpanded) {
    // Keep first item and last (maxItems - 2) items
    const keepStart = 1
    const keepEnd = maxItems - 2
    const startItems = displayItems.slice(0, keepStart)
    const endItems = displayItems.slice(-keepEnd)
    collapsedItems = displayItems.slice(keepStart, -keepEnd)
    visibleItems = [...startItems, ...endItems]
  }

  if (displayItems.length === 0) {
    return null
  }

  const containerStyle: React.CSSProperties = {
    backgroundColor,
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('py-4', className)}
      style={containerStyle}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ol className="flex flex-wrap items-center gap-1">
          {visibleItems.map((item, idx) => {
            const isFirst = idx === 0
            const isLast = idx === visibleItems.length - 1
            const isAfterFirst = idx === 1

            // Check if we need to show collapsed items
            const showCollapsed = isAfterFirst && collapsedItems.length > 0

            return (
              <Fragment key={idx}>
                {/* Separator before item (except first) */}
                {!isFirst && !showCollapsed && (
                  <li className="flex items-center" aria-hidden="true">
                    <Separator type={separator} />
                  </li>
                )}

                {/* Collapsed items button */}
                {showCollapsed && (
                  <>
                    <li className="flex items-center" aria-hidden="true">
                      <Separator type={separator} />
                    </li>
                    <li>
                      <CollapsedItems
                        items={collapsedItems}
                        onExpand={() => setIsExpanded(true)}
                      />
                    </li>
                    <li className="flex items-center" aria-hidden="true">
                      <Separator type={separator} />
                    </li>
                  </>
                )}

                {/* Breadcrumb item */}
                <li className="flex items-center">
                  <BreadcrumbLink
                    item={item}
                    isLast={isLast}
                    showIcon={isFirst && showHome}
                  />
                </li>
              </Fragment>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}
