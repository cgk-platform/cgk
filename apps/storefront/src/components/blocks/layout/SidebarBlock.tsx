'use client'

/**
 * Sidebar Block Component
 *
 * Page sidebar with configurable position, width, and sticky behavior.
 * Supports collapsible mode on mobile.
 */

import { useState, useEffect, useRef } from 'react'
import { cn } from '@cgk-platform/ui'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { BlockProps, SidebarBlockConfig } from '../types'

/**
 * Width class mapping
 */
const widthClasses = {
  sm: 'w-64',
  md: 'w-72',
  lg: 'w-80',
}

/**
 * Sidebar Block Component
 */
export function SidebarBlock({
  block,
  className,
  children,
}: BlockProps<SidebarBlockConfig> & { children?: React.ReactNode }) {
  const {
    position = 'left',
    width = 'md',
    sticky = false,
    stickyOffset = 80,
    backgroundColor,
    showBorder = true,
    collapsibleOnMobile = true,
    defaultCollapsed = true,
  } = block.config

  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [isMobile, setIsMobile] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Reset collapsed state when switching between mobile and desktop
  useEffect(() => {
    if (!isMobile) {
      setIsCollapsed(false)
    } else {
      setIsCollapsed(defaultCollapsed)
    }
  }, [isMobile, defaultCollapsed])

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isMobile && !isCollapsed) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobile, isCollapsed])

  const sidebarStyle: React.CSSProperties = {
    backgroundColor,
    ...(sticky && !isMobile && { top: stickyOffset }),
  }

  const isLeft = position === 'left'

  // Mobile toggle button
  const MobileToggle = () => {
    if (!collapsibleOnMobile || !isMobile) return null

    return (
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          'fixed z-40',
          'flex items-center justify-center',
          'h-10 w-10 rounded-full',
          'bg-[hsl(var(--portal-primary))] text-white',
          'shadow-lg',
          'hover:bg-[hsl(var(--portal-primary))]/90',
          'transition-all duration-300',
          isLeft ? 'left-4' : 'right-4',
          'top-1/2 -translate-y-1/2'
        )}
        aria-label={isCollapsed ? 'Open sidebar' : 'Close sidebar'}
        aria-expanded={!isCollapsed}
      >
        {isCollapsed ? (
          isLeft ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )
        ) : (
          <X className="h-5 w-5" />
        )}
      </button>
    )
  }

  return (
    <>
      {/* Mobile Toggle Button */}
      <MobileToggle />

      {/* Mobile Overlay */}
      {isMobile && !isCollapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsCollapsed(true)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={cn(
          // Base styles
          'flex-shrink-0',
          widthClasses[width],
          'bg-[hsl(var(--portal-card))]',

          // Border
          showBorder && [
            'border-[hsl(var(--portal-border))]',
            isLeft ? 'border-r' : 'border-l',
          ],

          // Sticky behavior (desktop only)
          sticky && !isMobile && 'sticky self-start',

          // Mobile styles
          isMobile && [
            'fixed inset-y-0 z-40',
            isLeft ? 'left-0' : 'right-0',
            'transform transition-transform duration-300 ease-in-out',
            isCollapsed && (isLeft ? '-translate-x-full' : 'translate-x-full'),
            !isCollapsed && 'translate-x-0',
            'shadow-2xl',
          ],

          // Desktop styles
          !isMobile && 'relative',

          className
        )}
        style={sidebarStyle}
      >
        {/* Mobile Header */}
        {isMobile && (
          <div
            className={cn(
              'flex h-16 items-center justify-between',
              'border-b border-[hsl(var(--portal-border))]',
              'px-4'
            )}
          >
            <span className="text-lg font-semibold text-[hsl(var(--portal-foreground))]">
              Menu
            </span>
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className={cn(
                'p-2 rounded-lg',
                'text-[hsl(var(--portal-foreground))]',
                'hover:bg-[hsl(var(--portal-muted))]',
                'transition-colors duration-150'
              )}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Sidebar Content */}
        <div
          className={cn(
            'overflow-y-auto p-4 lg:p-6',
            isMobile && 'h-[calc(100%-4rem)]'
          )}
        >
          {children}

          {/* Placeholder content if no children */}
          {!children && (
            <div className="space-y-6">
              {/* Example Navigation Section */}
              <nav>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--portal-muted-foreground))]">
                  Navigation
                </h3>
                <ul className="space-y-1">
                  {['All Products', 'New Arrivals', 'Best Sellers', 'On Sale'].map(
                    (item) => (
                      <li key={item}>
                        <a
                          href="#"
                          className={cn(
                            'block rounded-lg px-3 py-2',
                            'text-sm text-[hsl(var(--portal-foreground))]',
                            'hover:bg-[hsl(var(--portal-muted))]',
                            'transition-colors duration-150'
                          )}
                        >
                          {item}
                        </a>
                      </li>
                    )
                  )}
                </ul>
              </nav>

              {/* Example Filter Section */}
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--portal-muted-foreground))]">
                  Categories
                </h3>
                <ul className="space-y-2">
                  {['Skincare', 'Haircare', 'Body', 'Supplements'].map((item) => (
                    <li key={item}>
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          className={cn(
                            'h-4 w-4 rounded',
                            'border-[hsl(var(--portal-border))]',
                            'text-[hsl(var(--portal-primary))]',
                            'focus:ring-[hsl(var(--portal-primary))]/20'
                          )}
                        />
                        <span className="text-sm text-[hsl(var(--portal-foreground))]">
                          {item}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Example Price Range Section */}
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--portal-muted-foreground))]">
                  Price Range
                </h3>
                <div className="space-y-4">
                  <input
                    type="range"
                    min="0"
                    max="200"
                    defaultValue="100"
                    className={cn(
                      'w-full h-2 rounded-lg appearance-none cursor-pointer',
                      'bg-[hsl(var(--portal-muted))]',
                      '[&::-webkit-slider-thumb]:appearance-none',
                      '[&::-webkit-slider-thumb]:h-4',
                      '[&::-webkit-slider-thumb]:w-4',
                      '[&::-webkit-slider-thumb]:rounded-full',
                      '[&::-webkit-slider-thumb]:bg-[hsl(var(--portal-primary))]'
                    )}
                  />
                  <div className="flex justify-between text-sm text-[hsl(var(--portal-muted-foreground))]">
                    <span>$0</span>
                    <span>$200+</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
