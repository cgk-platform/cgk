/**
 * PDP Specifications Block Component
 *
 * Displays product specifications in a table, grid, or list format.
 * Supports grouped specifications with optional icons.
 */

import { cn } from '@cgk-platform/ui'
import type { BlockProps, PDPSpecificationsConfig, SpecificationItem, SpecificationGroup } from '../types'
import { LucideIcon } from '../icons'

/**
 * Single specification item
 */
function SpecItem({
  item,
  layout,
  showIcon,
  index,
}: {
  item: SpecificationItem
  layout: 'table' | 'grid' | 'list'
  showIcon: boolean
  index: number
}) {
  if (layout === 'table') {
    return (
      <tr
        className={cn(
          'animate-fade-in',
          index % 2 === 0
            ? 'bg-[hsl(var(--portal-muted))]/30'
            : 'bg-transparent'
        )}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <td className="px-4 py-3 text-sm font-medium text-[hsl(var(--portal-foreground))]">
          <div className="flex items-center gap-2">
            {showIcon && item.icon && (
              <LucideIcon
                name={item.icon}
                className="h-4 w-4 text-[hsl(var(--portal-primary))]"
              />
            )}
            {item.label}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-[hsl(var(--portal-muted-foreground))]">
          {item.value}
        </td>
      </tr>
    )
  }

  if (layout === 'grid') {
    return (
      <div
        className={cn(
          'rounded-lg bg-[hsl(var(--portal-muted))]/30 p-4',
          'animate-fade-in'
        )}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="flex items-center gap-2 mb-1">
          {showIcon && item.icon && (
            <LucideIcon
              name={item.icon}
              className="h-4 w-4 text-[hsl(var(--portal-primary))]"
            />
          )}
          <span className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--portal-muted-foreground))]">
            {item.label}
          </span>
        </div>
        <p className="text-sm font-semibold text-[hsl(var(--portal-foreground))]">
          {item.value}
        </p>
      </div>
    )
  }

  // List layout
  return (
    <div
      className={cn(
        'flex items-start gap-4 py-3',
        'border-b border-[hsl(var(--portal-border))] last:border-0',
        'animate-fade-in'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {showIcon && item.icon && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--portal-primary))]/10">
          <LucideIcon
            name={item.icon}
            className="h-4 w-4 text-[hsl(var(--portal-primary))]"
          />
        </div>
      )}
      <div className="flex-1">
        <dt className="text-sm font-medium text-[hsl(var(--portal-foreground))]">
          {item.label}
        </dt>
        <dd className="mt-0.5 text-sm text-[hsl(var(--portal-muted-foreground))]">
          {item.value}
        </dd>
      </div>
    </div>
  )
}

/**
 * Specification group component
 */
function SpecGroup({
  group,
  layout,
  showIcons,
  columns,
  groupIndex,
}: {
  group: SpecificationGroup
  layout: 'table' | 'grid' | 'list'
  showIcons: boolean
  columns: 2 | 3
  groupIndex: number
}) {
  const columnClasses = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
  }

  return (
    <div
      className={cn(
        'animate-fade-in',
        groupIndex > 0 && 'mt-10'
      )}
      style={{ animationDelay: `${groupIndex * 100}ms` }}
    >
      {/* Group title */}
      <h3 className="mb-4 text-lg font-semibold text-[hsl(var(--portal-foreground))]">
        {group.title}
      </h3>

      {/* Table layout */}
      {layout === 'table' && (
        <div className="overflow-hidden rounded-lg border border-[hsl(var(--portal-border))]">
          <table className="w-full">
            <tbody>
              {group.items.map((item, index) => (
                <SpecItem
                  key={index}
                  item={item}
                  layout={layout}
                  showIcon={showIcons}
                  index={index}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid layout */}
      {layout === 'grid' && (
        <div className={cn('grid gap-3', columnClasses[columns])}>
          {group.items.map((item, index) => (
            <SpecItem
              key={index}
              item={item}
              layout={layout}
              showIcon={showIcons}
              index={index}
            />
          ))}
        </div>
      )}

      {/* List layout */}
      {layout === 'list' && (
        <dl className="space-y-0">
          {group.items.map((item, index) => (
            <SpecItem
              key={index}
              item={item}
              layout={layout}
              showIcon={showIcons}
              index={index}
            />
          ))}
        </dl>
      )}
    </div>
  )
}

/**
 * PDP Specifications Block Component
 */
export function PDPSpecificationsBlock({ block, className }: BlockProps<PDPSpecificationsConfig>) {
  const {
    headline,
    subheadline,
    groups = [],
    items = [],
    layout = 'table',
    columns = 2,
    showIcons = true,
    backgroundColor,
  } = block.config

  // If we have flat items but no groups, create a default group
  const displayGroups: SpecificationGroup[] = groups.length > 0
    ? groups
    : items.length > 0
      ? [{ title: '', items }]
      : []

  if (displayGroups.length === 0) {
    return null
  }

  const columnClasses = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
  }

  return (
    <section
      className={cn('py-16 sm:py-20', className)}
      style={{ backgroundColor: backgroundColor || 'transparent' }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Header */}
        {(headline || subheadline) && (
          <div className="mb-10">
            {subheadline && (
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[hsl(var(--portal-primary))]">
                {subheadline}
              </p>
            )}
            {headline && (
              <h2 className="text-2xl font-bold tracking-tight text-[hsl(var(--portal-foreground))] sm:text-3xl">
                {headline}
              </h2>
            )}
          </div>
        )}

        {/* Single group without title - render items directly */}
        {displayGroups.length === 1 && displayGroups[0] && !displayGroups[0].title ? (
          <>
            {/* Table layout */}
            {layout === 'table' && (
              <div className="overflow-hidden rounded-lg border border-[hsl(var(--portal-border))]">
                <table className="w-full">
                  <tbody>
                    {displayGroups[0].items.map((item, index) => (
                      <SpecItem
                        key={index}
                        item={item}
                        layout={layout}
                        showIcon={showIcons}
                        index={index}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Grid layout */}
            {layout === 'grid' && displayGroups[0] && (
              <div className={cn('grid gap-3', columnClasses[columns])}>
                {displayGroups[0].items.map((item, index) => (
                  <SpecItem
                    key={index}
                    item={item}
                    layout={layout}
                    showIcon={showIcons}
                    index={index}
                  />
                ))}
              </div>
            )}

            {/* List layout */}
            {layout === 'list' && displayGroups[0] && (
              <dl className="space-y-0 rounded-lg border border-[hsl(var(--portal-border))] p-4">
                {displayGroups[0].items.map((item, index) => (
                  <SpecItem
                    key={index}
                    item={item}
                    layout={layout}
                    showIcon={showIcons}
                    index={index}
                  />
                ))}
              </dl>
            )}
          </>
        ) : (
          /* Multiple groups or single group with title */
          <div className="space-y-0">
            {displayGroups.map((group, index) => (
              <SpecGroup
                key={index}
                group={group}
                layout={layout}
                showIcons={showIcons}
                columns={columns}
                groupIndex={index}
              />
            ))}
          </div>
        )}
      </div>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </section>
  )
}
