/**
 * Mega Menu Component
 *
 * Desktop mega menu dropdown with full-width panels for nested navigation.
 * Receives menu data from server via props (fetched from Shopify Storefront API).
 * CGK branding: navy, light-blue, smooth transitions.
 */

'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { cn } from '@cgk-platform/ui'

export interface MenuItem {
  id: string
  title: string
  url: string
  items: MenuItem[]
}

interface MegaMenuProps {
  items: MenuItem[]
}

export function MegaMenu({ items }: MegaMenuProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleMouseEnter = useCallback((itemId: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setActiveMenu(itemId)
  }, [])

  const handleMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setActiveMenu(null), 150)
  }, [])

  const handleDropdownEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  return (
    <nav className="hidden items-center gap-1 lg:flex">
      {items.map((item) => {
        const hasChildren = item.items.length > 0
        const isActive = activeMenu === item.id

        return (
          <div
            key={item.id}
            onMouseEnter={() => handleMouseEnter(item.id)}
            onMouseLeave={handleMouseLeave}
            className="relative"
          >
            <Link
              href={toRelativePath(item.url)}
              className={cn(
                'flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-cgk-light-blue/20 text-cgk-navy'
                  : 'text-cgk-charcoal hover:text-cgk-navy'
              )}
            >
              {item.title}
              {hasChildren && (
                <svg
                  className={cn(
                    'h-3.5 w-3.5 transition-transform',
                    isActive && 'rotate-180'
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              )}
            </Link>

            {/* Dropdown */}
            {hasChildren && isActive && (
              <div
                onMouseEnter={handleDropdownEnter}
                onMouseLeave={handleMouseLeave}
                className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2"
              >
                <div className="min-w-[320px] rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
                  <div className="grid grid-cols-2 gap-6">
                    {item.items.map((child) => (
                      <div key={child.id}>
                        <Link
                          href={toRelativePath(child.url)}
                          className="text-sm font-semibold text-cgk-navy hover:underline"
                          onClick={() => setActiveMenu(null)}
                        >
                          {child.title}
                        </Link>
                        {child.items.length > 0 && (
                          <ul className="mt-2 space-y-1.5">
                            {child.items.map((grandchild) => (
                              <li key={grandchild.id}>
                                <Link
                                  href={toRelativePath(grandchild.url)}
                                  className="block text-sm text-gray-600 transition-colors hover:text-cgk-navy"
                                  onClick={() => setActiveMenu(null)}
                                >
                                  {grandchild.title}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

/**
 * Convert Shopify absolute URLs to relative paths.
 * Shopify returns full URLs like https://store.myshopify.com/collections/foo.
 * We strip the origin to get /collections/foo for Next.js routing.
 */
function toRelativePath(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.pathname
  } catch {
    return url
  }
}
