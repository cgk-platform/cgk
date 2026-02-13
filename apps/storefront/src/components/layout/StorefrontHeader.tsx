/**
 * Storefront Header Component
 *
 * Site-wide header with navigation, search, account, and cart with drawer.
 */

'use client'

import Link from 'next/link'
import { cn } from '@cgk-platform/ui'

import { CartIcon } from '@/components/cart'
import { CartProvider } from '@/components/cart/CartProvider'

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
}

export function StorefrontHeader({
  storeName,
  tenantSlug,
  theme,
  logoComponent,
  darkModeToggle,
}: HeaderProps) {
  return (
    <CartProvider tenantSlug={tenantSlug}>
      <header className="sticky top-0 z-50 border-b border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))]/95 backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--portal-card))]/60">
        <div
          className="container mx-auto flex h-16 items-center justify-between px-4"
          style={{ maxWidth: 'var(--portal-max-width)' }}
        >
          {/* Logo */}
          {logoComponent ?? (
            <Link href="/" className="text-xl font-bold">
              {storeName}
            </Link>
          )}

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/products"
              className="text-sm transition-colors hover:text-[hsl(var(--portal-primary))]"
            >
              Products
            </Link>
            <Link
              href="/collections"
              className="text-sm transition-colors hover:text-[hsl(var(--portal-primary))]"
            >
              Collections
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Dark Mode Toggle */}
            {theme.darkModeEnabled && darkModeToggle}

            {/* Search */}
            <Link
              href="/search"
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full',
                'transition-colors hover:bg-[hsl(var(--portal-muted))]'
              )}
              aria-label="Search"
            >
              <SearchIcon className="h-5 w-5" />
            </Link>

            {/* Account */}
            <Link
              href="/account"
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full',
                'transition-colors hover:bg-[hsl(var(--portal-muted))]'
              )}
              aria-label="Account"
            >
              <UserIcon className="h-5 w-5" />
            </Link>

            {/* Cart with Drawer */}
            <CartIcon />

            {/* Mobile Menu */}
            <button
              type="button"
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full',
                'transition-colors hover:bg-[hsl(var(--portal-muted))] md:hidden'
              )}
              aria-label="Menu"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>
    </CartProvider>
  )
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
