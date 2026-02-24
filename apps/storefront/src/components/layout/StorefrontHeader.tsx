/**
 * Storefront Header Component
 *
 * CGK-branded sticky header with mega menu navigation, search, cart drawer,
 * and mobile hamburger drawer.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { cn } from '@cgk-platform/ui'

import { CartIcon } from '@/components/cart'
import { CartProvider } from '@/components/cart/CartProvider'
import { SearchOverlay } from '@/components/search/SearchOverlay'
import { performPredictiveSearch } from '@/app/actions/search'
import { MegaMenu, type MenuItem } from './MegaMenu'

interface HeaderProps {
  storeName: string
  tenantSlug: string
  theme: {
    tenantId: string
    logoUrl: string | null
    logoHeight: number
    darkModeEnabled: boolean
  }
  logoComponent?: React.ReactNode
  darkModeToggle?: React.ReactNode
  menuItems?: MenuItem[]
}

const NAV_LINKS = [
  {
    label: 'Shop All',
    href: '/products',
  },
  {
    label: 'Kids',
    href: '/collections/kids',
  },
  {
    label: 'Protectors + Toppers',
    href: '/collections/protectors-toppers',
  },
  {
    label: 'Comforters + Duvets',
    href: '/collections/comforters-duvets',
  },
  {
    label: 'Blankets + Throws',
    href: '/collections/blankets-throws',
  },
  {
    label: 'Sheet Sets',
    href: '/collections/sheet-sets',
  },
]

export function StorefrontHeader({
  storeName,
  tenantSlug,
  theme,
  logoComponent,
  darkModeToggle,
  menuItems,
}: HeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), [])

  return (
    <CartProvider tenantSlug={tenantSlug}>
      <header
        className={cn(
          'sticky top-0 z-50 border-b bg-white transition-all duration-300',
          scrolled
            ? 'border-gray-200 shadow-sm'
            : 'border-transparent'
        )}
      >
        <div className="mx-auto flex max-w-store items-center justify-between px-4 transition-all duration-300"
          style={{ height: scrolled ? '60px' : '72px' }}
        >
          {/* Logo */}
          <div className={cn(
            'flex-shrink-0 origin-left transition-transform duration-300',
            scrolled ? 'scale-[0.85]' : 'scale-100'
          )}>
            {logoComponent ?? (
              <Link href="/" className="text-xl font-bold tracking-tight text-cgk-navy">
                {storeName}
              </Link>
            )}
          </div>

          {/* Desktop Navigation */}
          {menuItems && menuItems.length > 0 ? (
            <MegaMenu items={menuItems} />
          ) : (
            <nav className="hidden items-center gap-8 lg:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-cgk-charcoal transition-colors hover:text-cgk-navy"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Dark Mode Toggle */}
            {theme.darkModeEnabled && darkModeToggle}

            {/* Search */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
              aria-label="Search"
            >
              <SearchIcon className="h-5 w-5 text-cgk-charcoal" />
            </button>

            {/* Account */}
            <Link
              href="/account"
              className="hidden h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100 sm:flex"
              aria-label="Account"
            >
              <UserIcon className="h-5 w-5 text-cgk-charcoal" />
            </Link>

            {/* Cart with Drawer */}
            <CartIcon />

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100 lg:hidden"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <CloseIcon className="h-5 w-5 text-cgk-charcoal" />
              ) : (
                <MenuIcon className="h-5 w-5 text-cgk-charcoal" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={closeMobileMenu}
          aria-hidden
        />
      )}

      {/* Mobile Menu Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] bg-white shadow-2xl transition-transform duration-300 ease-out lg:hidden',
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <span className="text-lg font-bold text-cgk-navy">{storeName}</span>
          <button
            type="button"
            onClick={closeMobileMenu}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="Close menu"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <nav className="px-6 py-6">
          <ul className="space-y-1">
            {menuItems && menuItems.length > 0 ? (
              <MobileMenuItems items={menuItems} onNavigate={closeMobileMenu} />
            ) : (
              NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block rounded-lg px-3 py-3 text-base font-medium text-cgk-charcoal transition-colors hover:bg-cgk-light-blue/30 hover:text-cgk-navy"
                    onClick={closeMobileMenu}
                  >
                    {link.label}
                  </Link>
                </li>
              ))
            )}
          </ul>
          <div className="mt-6 border-t border-gray-100 pt-6">
            <ul className="space-y-1">
              <li>
                <Link
                  href="/account"
                  className="block rounded-lg px-3 py-3 text-base font-medium text-cgk-charcoal transition-colors hover:bg-cgk-light-blue/30 hover:text-cgk-navy"
                  onClick={closeMobileMenu}
                >
                  My Account
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="block rounded-lg px-3 py-3 text-base font-medium text-cgk-charcoal transition-colors hover:bg-cgk-light-blue/30 hover:text-cgk-navy"
                  onClick={closeMobileMenu}
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="block rounded-lg px-3 py-3 text-base font-medium text-cgk-charcoal transition-colors hover:bg-cgk-light-blue/30 hover:text-cgk-navy"
                  onClick={closeMobileMenu}
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>
      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        searchAction={performPredictiveSearch}
      />
    </CartProvider>
  )
}

// --- Mobile Menu Items (for Shopify menu data) ---

function MobileMenuItems({
  items,
  onNavigate,
}: {
  items: MenuItem[]
  onNavigate: () => void
}) {
  return (
    <>
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={toRelativePath(item.url)}
            className="block rounded-lg px-3 py-3 text-base font-medium text-cgk-charcoal transition-colors hover:bg-cgk-light-blue/30 hover:text-cgk-navy"
            onClick={onNavigate}
          >
            {item.title}
          </Link>
          {item.items.length > 0 && (
            <ul className="ml-4 space-y-0.5">
              {item.items.map((child) => (
                <li key={child.id}>
                  <Link
                    href={toRelativePath(child.url)}
                    className="block rounded-lg px-3 py-2 text-sm text-cgk-charcoal/80 transition-colors hover:bg-cgk-light-blue/20 hover:text-cgk-navy"
                    onClick={onNavigate}
                  >
                    {child.title}
                  </Link>
                  {child.items.length > 0 && (
                    <ul className="ml-4 space-y-0.5">
                      {child.items.map((grandchild) => (
                        <li key={grandchild.id}>
                          <Link
                            href={toRelativePath(grandchild.url)}
                            className="block rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-cgk-light-blue/10 hover:text-cgk-navy"
                            onClick={onNavigate}
                          >
                            {grandchild.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </>
  )
}

/**
 * Convert Shopify absolute URLs to relative paths for Next.js routing.
 */
function toRelativePath(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.pathname
  } catch {
    return url
  }
}

// --- Icons ---

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  )
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  )
}
