'use client'

/**
 * Header Block Component
 *
 * Site header with logo, navigation, search, and cart.
 * Supports sticky positioning and mobile hamburger menu.
 */

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@cgk-platform/ui'
import {
  Menu,
  X,
  Search,
  ShoppingCart,
  User,
  ChevronDown,
} from 'lucide-react'
import type { BlockProps, HeaderBlockConfig, NavLinkItem } from '../types'

/**
 * Navigation link with optional children dropdown
 */
function NavLink({
  item,
  isMobile = false,
}: {
  item: NavLinkItem
  isMobile?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const hasChildren = item.children && item.children.length > 0

  if (isMobile) {
    return (
      <div className="border-b border-[hsl(var(--portal-border))]">
        <Link
          href={item.href}
          className={cn(
            'flex items-center justify-between px-4 py-3',
            'text-[hsl(var(--portal-foreground))]',
            'hover:bg-[hsl(var(--portal-muted))]',
            'transition-colors duration-150'
          )}
          {...(item.openInNewTab && {
            target: '_blank',
            rel: 'noopener noreferrer',
          })}
        >
          <span className="flex items-center gap-2">
            {item.label}
            {item.badge && (
              <span className="rounded-full bg-[hsl(var(--portal-primary))] px-2 py-0.5 text-xs text-white">
                {item.badge}
              </span>
            )}
          </span>
          {hasChildren && (
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
              onClick={(e) => {
                e.preventDefault()
                setIsOpen(!isOpen)
              }}
            />
          )}
        </Link>
        {hasChildren && isOpen && (
          <div className="bg-[hsl(var(--portal-muted))]/50 pb-2">
            {item.children?.map((child, idx) => (
              <Link
                key={idx}
                href={child.href}
                className={cn(
                  'block px-8 py-2 text-sm',
                  'text-[hsl(var(--portal-muted-foreground))]',
                  'hover:text-[hsl(var(--portal-foreground))]',
                  'transition-colors duration-150'
                )}
                {...(child.openInNewTab && {
                  target: '_blank',
                  rel: 'noopener noreferrer',
                })}
              >
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-1 px-3 py-2',
          'text-sm font-medium',
          'transition-colors duration-150',
          'hover:text-[hsl(var(--portal-primary))]',
          item.featured && 'text-[hsl(var(--portal-primary))]'
        )}
        {...(item.openInNewTab && {
          target: '_blank',
          rel: 'noopener noreferrer',
        })}
      >
        {item.label}
        {item.badge && (
          <span className="ml-1 rounded-full bg-[hsl(var(--portal-primary))] px-1.5 py-0.5 text-[10px] text-white">
            {item.badge}
          </span>
        )}
        {hasChildren && (
          <ChevronDown
            className={cn(
              'h-3 w-3 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        )}
      </Link>
      {hasChildren && isOpen && (
        <div
          className={cn(
            'absolute left-0 top-full z-50 min-w-[200px]',
            'rounded-lg border border-[hsl(var(--portal-border))]',
            'bg-[hsl(var(--portal-card))] shadow-lg',
            'animate-fade-in'
          )}
        >
          <div className="py-2">
            {item.children?.map((child, idx) => (
              <Link
                key={idx}
                href={child.href}
                className={cn(
                  'block px-4 py-2 text-sm',
                  'text-[hsl(var(--portal-foreground))]',
                  'hover:bg-[hsl(var(--portal-muted))]',
                  'transition-colors duration-150'
                )}
                {...(child.openInNewTab && {
                  target: '_blank',
                  rel: 'noopener noreferrer',
                })}
              >
                {child.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Header Block Component
 */
export function HeaderBlock({ block, className }: BlockProps<HeaderBlockConfig>) {
  const {
    logo,
    logoText = 'Store',
    navLinks = [],
    showSearch = true,
    showCart = true,
    showAccount = false,
    sticky = true,
    transparent = false,
    backgroundColor,
    textColor,
    announcementText,
    announcementLink,
  } = block.config

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  // Handle scroll for sticky header styling
  useEffect(() => {
    if (!sticky) return

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [sticky])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  const headerStyle: React.CSSProperties = {
    backgroundColor: transparent && !isScrolled ? 'transparent' : backgroundColor,
    color: textColor,
  }

  return (
    <>
      {/* Announcement Bar */}
      {announcementText && (
        <div className="bg-[hsl(var(--portal-primary))] py-2 text-center text-sm text-white">
          {announcementLink ? (
            <Link href={announcementLink} className="hover:underline">
              {announcementText}
            </Link>
          ) : (
            <span>{announcementText}</span>
          )}
        </div>
      )}

      {/* Main Header */}
      <header
        className={cn(
          'w-full',
          sticky && 'sticky top-0 z-50',
          isScrolled && 'shadow-md',
          !transparent || isScrolled
            ? 'bg-[hsl(var(--portal-card))] border-b border-[hsl(var(--portal-border))]'
            : 'bg-transparent',
          'transition-all duration-300',
          className
        )}
        style={headerStyle}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between lg:h-20">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center">
                {logo?.src ? (
                  <Image
                    src={logo.src}
                    alt={logo.alt || logoText}
                    width={logo.width || 150}
                    height={logo.height || 40}
                    className="h-8 w-auto lg:h-10"
                    priority
                  />
                ) : (
                  <span
                    className={cn(
                      'text-xl font-bold lg:text-2xl',
                      'text-[hsl(var(--portal-foreground))]'
                    )}
                  >
                    {logoText}
                  </span>
                )}
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex lg:items-center lg:space-x-1">
              {navLinks.map((link, idx) => (
                <NavLink key={idx} item={link} />
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2 lg:gap-4">
              {/* Search */}
              {showSearch && (
                <button
                  type="button"
                  className={cn(
                    'p-2 rounded-lg',
                    'text-[hsl(var(--portal-foreground))]',
                    'hover:bg-[hsl(var(--portal-muted))]',
                    'transition-colors duration-150'
                  )}
                  aria-label="Search"
                >
                  <Search className="h-5 w-5" />
                </button>
              )}

              {/* Account */}
              {showAccount && (
                <Link
                  href="/account"
                  className={cn(
                    'hidden p-2 rounded-lg sm:block',
                    'text-[hsl(var(--portal-foreground))]',
                    'hover:bg-[hsl(var(--portal-muted))]',
                    'transition-colors duration-150'
                  )}
                  aria-label="Account"
                >
                  <User className="h-5 w-5" />
                </Link>
              )}

              {/* Cart */}
              {showCart && (
                <Link
                  href="/cart"
                  className={cn(
                    'relative p-2 rounded-lg',
                    'text-[hsl(var(--portal-foreground))]',
                    'hover:bg-[hsl(var(--portal-muted))]',
                    'transition-colors duration-150'
                  )}
                  aria-label="Cart"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {/* Cart count badge - can be made dynamic */}
                  <span
                    className={cn(
                      'absolute -right-1 -top-1',
                      'flex h-5 w-5 items-center justify-center',
                      'rounded-full bg-[hsl(var(--portal-primary))] text-[10px] font-bold text-white'
                    )}
                  >
                    0
                  </span>
                </Link>
              )}

              {/* Mobile Menu Button */}
              <button
                type="button"
                className={cn(
                  'p-2 rounded-lg lg:hidden',
                  'text-[hsl(var(--portal-foreground))]',
                  'hover:bg-[hsl(var(--portal-muted))]',
                  'transition-colors duration-150'
                )}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-full max-w-sm lg:hidden',
          'bg-[hsl(var(--portal-card))]',
          'transform transition-transform duration-300 ease-in-out',
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Mobile Menu Header */}
        <div className="flex h-16 items-center justify-between border-b border-[hsl(var(--portal-border))] px-4">
          <span className="text-lg font-semibold text-[hsl(var(--portal-foreground))]">
            Menu
          </span>
          <button
            type="button"
            className={cn(
              'p-2 rounded-lg',
              'text-[hsl(var(--portal-foreground))]',
              'hover:bg-[hsl(var(--portal-muted))]'
            )}
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile Menu Content */}
        <nav className="overflow-y-auto pb-20" style={{ maxHeight: 'calc(100vh - 64px)' }}>
          {navLinks.map((link, idx) => (
            <NavLink key={idx} item={link} isMobile />
          ))}

          {/* Mobile Menu Footer Actions */}
          <div className="mt-6 border-t border-[hsl(var(--portal-border))] px-4 pt-6">
            {showAccount && (
              <Link
                href="/account"
                className={cn(
                  'flex items-center gap-3 py-3',
                  'text-[hsl(var(--portal-foreground))]',
                  'hover:text-[hsl(var(--portal-primary))]',
                  'transition-colors duration-150'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <User className="h-5 w-5" />
                <span>My Account</span>
              </Link>
            )}
          </div>
        </nav>
      </div>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.15s ease-out forwards;
        }
      `}</style>
    </>
  )
}
