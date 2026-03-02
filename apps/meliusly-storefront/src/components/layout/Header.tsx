'use client'

/**
 * Header Component
 *
 * Main navigation header for Meliusly storefront.
 * Features: Logo, nav links, search, cart with badge.
 * Sticky on scroll, responsive with mobile drawer toggle.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, ShoppingCart, Menu } from 'lucide-react'

interface HeaderProps {
  cartItemCount?: number
  onMobileMenuToggle?: () => void
  onCartClick?: () => void
}

export function Header({ cartItemCount = 0, onMobileMenuToggle, onCartClick }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 border-b bg-white transition-shadow ${
        isScrolled ? 'shadow-md' : 'border-meliusly-gray/20'
      }`}
    >
      <div className="mx-auto flex h-[108px] max-w-[1440px] items-center justify-between px-6 lg:px-12">
        {/* Mobile Menu Button */}
        <button
          onClick={onMobileMenuToggle}
          className="flex items-center lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="text-meliusly-dark h-6 w-6" />
        </button>

        {/* Logo */}
        <Link href="/" className="flex items-center">
          <img
            src="/meliusly/logo/logo.svg"
            alt="Meliusly"
            className="h-10 w-auto"
            width={160}
            height={40}
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 lg:flex">
          <Link
            href="/"
            className="font-manrope text-meliusly-dark hover:text-meliusly-primary text-[15px] font-semibold transition-colors"
          >
            Home
          </Link>
          <Link
            href="/collections/all"
            className="font-manrope text-meliusly-dark hover:text-meliusly-primary text-[15px] font-semibold transition-colors"
          >
            Shop
          </Link>
          <Link
            href="/how-it-works"
            className="font-manrope text-meliusly-dark hover:text-meliusly-primary text-[15px] font-semibold transition-colors"
          >
            How It Works
          </Link>
          <Link
            href="/about"
            className="font-manrope text-meliusly-dark hover:text-meliusly-primary text-[15px] font-semibold transition-colors"
          >
            About
          </Link>
          <Link
            href="/contact"
            className="font-manrope text-meliusly-dark hover:text-meliusly-primary text-[15px] font-semibold transition-colors"
          >
            Contact
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <button
            className="hover:bg-meliusly-gray/10 flex items-center justify-center rounded-full p-2 transition-colors"
            aria-label="Search"
          >
            <Search className="text-meliusly-dark h-5 w-5" />
          </button>

          {/* Cart with Badge */}
          <button
            onClick={onCartClick}
            className="hover:bg-meliusly-gray/10 relative flex items-center justify-center rounded-full p-2 transition-colors"
            aria-label={`Cart (${cartItemCount} items)`}
          >
            <ShoppingCart className="text-meliusly-dark h-5 w-5" />
            {cartItemCount > 0 && (
              <span className="bg-meliusly-primary absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white">
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
