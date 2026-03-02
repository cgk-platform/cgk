'use client'

/**
 * Header Component
 *
 * Main navigation header for Meliusly storefront.
 * Exact match to Figma design 1:269 (Nav component).
 * Features: Announcement bar, logo, nav links with dropdowns, search, user, cart icons.
 */

import { useState } from 'react'
import Link from 'next/link'
import { Search, ShoppingCart, User, ChevronDown, Menu } from 'lucide-react'

interface HeaderProps {
  cartItemCount?: number
  onMobileMenuToggle?: () => void
  onCartClick?: () => void
}

export function Header({ cartItemCount = 0, onMobileMenuToggle, onCartClick }: HeaderProps) {
  return (
    <header className="w-full">
      {/* Announcement Bar */}
      <div className="flex h-[36px] items-center justify-center bg-[#0268a0]">
        <p className="font-manrope text-[13px] leading-[1.15] font-bold tracking-[0.26px] text-white uppercase">
          FREE Shipping on all orders
        </p>
      </div>

      {/* Main Navigation */}
      <div className="flex h-[72px] items-center justify-between bg-white px-[50px] py-[16px]">
        {/* Logo */}
        <Link
          href="/"
          className="relative flex h-[34px] w-[128px] items-center justify-center overflow-hidden"
        >
          <img
            src="/assets/69bb33a6f2ea1403b208fab9c38e49c39bcb12bf.png"
            alt="Meliusly"
            className="h-[32px] w-auto object-cover"
          />
        </Link>

        {/* Navigation Links */}
        <nav className="hidden items-center gap-[32px] lg:flex">
          <NavLink href="/collections/sofa-support" label="Sofa Support" />
          <NavLink href="/collections/sleeper-sofa-support" label="Sleeper Sofa Support" />
          <NavLink href="/collections/bed-support" label="Bed Support" />
          <NavLink href="/guides" label="Product Guides" />
          <NavLink href="/help" label="Help" />
        </nav>

        {/* Right Icons */}
        <div className="flex items-center gap-[24px]">
          {/* Search */}
          <button
            className="hidden size-[24px] items-center justify-center transition-opacity hover:opacity-70 lg:flex"
            aria-label="Search"
          >
            <Search className="size-[24px] text-[#161f2b]" strokeWidth={1.5} />
          </button>

          {/* User Account */}
          <button
            className="hidden size-[24px] items-center justify-center transition-opacity hover:opacity-70 lg:flex"
            aria-label="Account"
          >
            <User className="size-[24px] text-[#161f2b]" strokeWidth={1.5} />
          </button>

          {/* Cart */}
          <button
            onClick={onCartClick}
            className="relative flex size-[24px] items-center justify-center transition-opacity hover:opacity-70"
            aria-label={`Cart (${cartItemCount} items)`}
          >
            <ShoppingCart className="size-[24px] text-[#161f2b]" strokeWidth={1.5} />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#0268a0] px-1 text-[10px] font-semibold text-white">
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </span>
            )}
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={onMobileMenuToggle}
            className="flex size-[24px] items-center justify-center transition-opacity hover:opacity-70 lg:hidden"
            aria-label="Menu"
          >
            <Menu className="size-[24px] text-[#161f2b]" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  )
}

interface NavLinkProps {
  href: string
  label: string
  hasDropdown?: boolean
}

function NavLink({ href, label, hasDropdown = true }: NavLinkProps) {
  return (
    <Link href={href} className="group flex items-center gap-[9px]">
      <span className="font-manrope text-[14px] leading-[1.2] font-semibold text-[#161f2b] capitalize transition-colors group-hover:text-[#0268a0]">
        {label}
      </span>
      {hasDropdown && (
        <ChevronDown
          className="h-[5px] w-[10px] text-[#161f2b] transition-colors group-hover:text-[#0268a0]"
          strokeWidth={2}
        />
      )}
    </Link>
  )
}
