import * as React from 'react'
import { ChevronRight, MoreHorizontal } from 'lucide-react'
import { Slot } from '@radix-ui/react-slot'

import { cn } from '../utils/cn'

const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<'nav'> & {
    separator?: React.ReactNode
  }
>(({ ...props }, ref) => <nav ref={ref} aria-label="breadcrumb" {...props} />)
Breadcrumb.displayName = 'Breadcrumb'

const BreadcrumbList = React.forwardRef<HTMLOListElement, React.ComponentPropsWithoutRef<'ol'>>(
  ({ className, ...props }, ref) => (
    <ol
      ref={ref}
      className={cn(
        'flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5',
        className
      )}
      {...props}
    />
  )
)
BreadcrumbList.displayName = 'BreadcrumbList'

const BreadcrumbItem = React.forwardRef<HTMLLIElement, React.ComponentPropsWithoutRef<'li'>>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn('inline-flex items-center gap-1.5', className)} {...props} />
  )
)
BreadcrumbItem.displayName = 'BreadcrumbItem'

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<'a'> & {
    asChild?: boolean
  }
>(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? Slot : 'a'

  return (
    <Comp
      ref={ref}
      className={cn('transition-colors hover:text-foreground', className)}
      {...props}
    />
  )
})
BreadcrumbLink.displayName = 'BreadcrumbLink'

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<'span'>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn('font-normal text-foreground', className)}
      {...props}
    />
  )
)
BreadcrumbPage.displayName = 'BreadcrumbPage'

const BreadcrumbSeparator = ({ children, className, ...props }: React.ComponentProps<'li'>) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={cn('[&>svg]:size-3.5', className)}
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
)
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator'

const BreadcrumbEllipsis = ({ className, ...props }: React.ComponentProps<'span'>) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={cn('flex h-9 w-9 items-center justify-center', className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
)
BreadcrumbEllipsis.displayName = 'BreadcrumbEllipsis'

/**
 * Simple Breadcrumbs component
 * Takes an array of items and renders them with separators
 */
interface BreadcrumbItemData {
  label: string
  href?: string
}

interface SimpleBreadcrumbsProps extends React.ComponentPropsWithoutRef<typeof Breadcrumb> {
  items: BreadcrumbItemData[]
  homeHref?: string
  homeLabel?: string
  maxItems?: number
  linkComponent?: React.ComponentType<{ href: string; children: React.ReactNode; className?: string }>
}

function SimpleBreadcrumbs({
  items,
  homeHref = '/',
  homeLabel = 'Home',
  maxItems = 4,
  linkComponent: LinkComponent,
  className,
  ...props
}: SimpleBreadcrumbsProps) {
  const allItems = [{ label: homeLabel, href: homeHref }, ...items]
  const shouldCollapse = allItems.length > maxItems

  let visibleItems: BreadcrumbItemData[]
  if (shouldCollapse) {
    // Show first, ellipsis, then last (maxItems - 1) items
    const firstItem = allItems[0]
    const lastItems = allItems.slice(-(maxItems - 1))
    visibleItems = firstItem ? [firstItem, ...lastItems] : lastItems
  } else {
    visibleItems = allItems
  }

  const renderLink = (item: BreadcrumbItemData, isLast: boolean) => {
    if (isLast || !item.href) {
      return <BreadcrumbPage>{item.label}</BreadcrumbPage>
    }

    if (LinkComponent) {
      return (
        <BreadcrumbLink asChild>
          <LinkComponent href={item.href}>{item.label}</LinkComponent>
        </BreadcrumbLink>
      )
    }

    return <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
  }

  return (
    <Breadcrumb className={className} {...props}>
      <BreadcrumbList>
        {visibleItems.map((item, index) => {
          const isLast = index === visibleItems.length - 1
          const showEllipsis = shouldCollapse && index === 0

          return (
            <React.Fragment key={item.label + index}>
              <BreadcrumbItem>
                {renderLink(item, isLast)}
              </BreadcrumbItem>
              {showEllipsis && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbEllipsis />
                  </BreadcrumbItem>
                </>
              )}
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
  SimpleBreadcrumbs,
}

export type { BreadcrumbItemData, SimpleBreadcrumbsProps }
