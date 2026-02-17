/**
 * Tabs Block Component
 *
 * Tabbed content sections with horizontal or vertical layout,
 * optional icons, and animated tab transitions.
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, TabsConfig, TabItem } from '../types'
import { LucideIcon, getIconByName } from '../icons'

/**
 * Tab Button Component
 */
function TabButton({
  tab,
  isActive,
  onClick,
  layout,
}: {
  tab: TabItem
  isActive: boolean
  onClick: () => void
  layout: 'horizontal' | 'vertical'
}) {
  const hasIcon = tab.icon && getIconByName(tab.icon) !== null

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-2',
        'px-5 py-3 text-sm font-medium',
        'transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[hsl(var(--portal-primary))] focus-visible:ring-offset-2',
        layout === 'horizontal' ? 'rounded-t-lg' : 'rounded-l-lg w-full justify-start',
        isActive
          ? 'bg-[hsl(var(--portal-primary))]/10 text-[hsl(var(--portal-primary))]'
          : 'text-[hsl(var(--portal-muted-foreground))] hover:bg-[hsl(var(--portal-muted))]/50 hover:text-[hsl(var(--portal-foreground))]'
      )}
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
    >
      {hasIcon && <LucideIcon name={tab.icon!} className="h-4 w-4" />}
      <span>{tab.label}</span>

      {/* Active indicator */}
      {isActive && (
        <span
          className={cn(
            'absolute bg-[hsl(var(--portal-primary))]',
            layout === 'horizontal'
              ? 'bottom-0 left-0 right-0 h-0.5'
              : 'bottom-0 left-0 top-0 w-0.5'
          )}
        />
      )}
    </button>
  )
}

/**
 * Tab Panel Component
 */
function TabPanel({
  tab,
  isActive,
}: {
  tab: TabItem
  isActive: boolean
}) {
  return (
    <div
      role="tabpanel"
      aria-labelledby={`tab-${tab.id}`}
      hidden={!isActive}
      className={cn(
        'focus-visible:outline-none',
        isActive && 'animate-fade-in'
      )}
      tabIndex={0}
    >
      {/* Support for HTML content */}
      {tab.content.includes('<') ? (
        <div
          className="prose prose-lg max-w-none text-[hsl(var(--portal-foreground))] leading-relaxed"
          dangerouslySetInnerHTML={{ __html: tab.content }}
        />
      ) : (
        <p className="text-[hsl(var(--portal-foreground))] leading-relaxed">
          {tab.content}
        </p>
      )}
    </div>
  )
}

/**
 * Tabs Block Component
 */
export function TabsBlock({ block, className }: BlockProps<TabsConfig>) {
  const {
    headline,
    subheadline,
    tabs,
    layout = 'horizontal',
    defaultTab,
    backgroundColor,
  } = block.config

  // Initialize active tab
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    if (defaultTab && tabs.some((t) => t.id === defaultTab)) {
      return defaultTab
    }
    const firstTab = tabs[0]
    return firstTab ? firstTab.id : ''
  })

  const tabListRef = useRef<HTMLDivElement>(null)

  // Handle keyboard navigation
  useEffect(() => {
    const tabList = tabListRef.current
    if (!tabList) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentIndex = tabs.findIndex((t) => t.id === activeTabId)
      let newIndex = currentIndex

      if (layout === 'horizontal') {
        if (e.key === 'ArrowRight') {
          newIndex = (currentIndex + 1) % tabs.length
        } else if (e.key === 'ArrowLeft') {
          newIndex = (currentIndex - 1 + tabs.length) % tabs.length
        }
      } else {
        if (e.key === 'ArrowDown') {
          newIndex = (currentIndex + 1) % tabs.length
        } else if (e.key === 'ArrowUp') {
          newIndex = (currentIndex - 1 + tabs.length) % tabs.length
        }
      }

      if (newIndex !== currentIndex) {
        const newTab = tabs[newIndex]
        if (newTab) {
          setActiveTabId(newTab.id)
          // Focus the new tab button
          const buttons = tabList.querySelectorAll('[role="tab"]')
          ;(buttons[newIndex] as HTMLButtonElement)?.focus()
        }
      }
    }

    tabList.addEventListener('keydown', handleKeyDown)
    return () => tabList.removeEventListener('keydown', handleKeyDown)
  }, [activeTabId, tabs, layout])

  return (
    <section
      className={cn('py-20 sm:py-28', className)}
      style={{ backgroundColor: backgroundColor || 'transparent' }}
    >
      <div className="mx-auto max-w-5xl px-6 sm:px-8">
        {/* Header */}
        {(headline || subheadline) && (
          <div className="mx-auto mb-12 max-w-3xl text-center">
            {subheadline && (
              <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[hsl(var(--portal-primary))]">
                {subheadline}
              </p>
            )}
            {headline && (
              <h2 className="text-3xl font-bold tracking-tight text-[hsl(var(--portal-foreground))] sm:text-4xl">
                {headline}
              </h2>
            )}
          </div>
        )}

        {/* Tabs Container */}
        <div
          className={cn(
            'rounded-2xl border border-[hsl(var(--portal-border))]',
            'bg-[hsl(var(--portal-card))] shadow-lg overflow-hidden',
            layout === 'vertical' && 'flex'
          )}
        >
          {/* Tab List */}
          <div
            ref={tabListRef}
            role="tablist"
            aria-orientation={layout}
            className={cn(
              'flex bg-[hsl(var(--portal-muted))]/30',
              layout === 'horizontal'
                ? 'flex-row border-b border-[hsl(var(--portal-border))]'
                : 'flex-col border-r border-[hsl(var(--portal-border))] min-w-[200px]'
            )}
          >
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeTabId}
                onClick={() => setActiveTabId(tab.id)}
                layout={layout}
              />
            ))}
          </div>

          {/* Tab Panels */}
          <div className={cn('p-8', layout === 'vertical' && 'flex-1')}>
            {tabs.map((tab) => (
              <TabPanel key={tab.id} tab={tab} isActive={tab.id === activeTabId} />
            ))}
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </section>
  )
}
