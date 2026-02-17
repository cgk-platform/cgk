'use client'

/**
 * Mega Menu Block Component
 *
 * Dropdown mega menu with multi-column layout, category headers,
 * and optional featured images.
 */

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@cgk-platform/ui'
import { ChevronDown, ArrowRight } from 'lucide-react'
import type { BlockProps, MegaMenuBlockConfig, MegaMenuCategory, MegaMenuItem } from '../types'

/**
 * Featured item card component
 */
function FeaturedCard({ item }: { item: MegaMenuItem }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'group relative overflow-hidden rounded-xl',
        'border border-[hsl(var(--portal-border))]',
        'hover:border-[hsl(var(--portal-primary))]',
        'transition-all duration-300'
      )}
    >
      {/* Image */}
      {item.image?.src && (
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={item.image.src}
            alt={item.image.alt || item.label}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, 250px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      {/* Content */}
      <div
        className={cn(
          item.image?.src ? 'absolute bottom-0 left-0 right-0 p-4' : 'p-4',
          item.image?.src && 'text-white'
        )}
      >
        <div className="flex items-center gap-2">
          <h4 className="font-semibold">{item.label}</h4>
          {item.badge && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                item.image?.src
                  ? 'bg-white/20 text-white'
                  : 'bg-[hsl(var(--portal-primary))] text-white'
              )}
            >
              {item.badge}
            </span>
          )}
        </div>
        {item.description && (
          <p
            className={cn(
              'mt-1 text-sm',
              item.image?.src
                ? 'text-white/80'
                : 'text-[hsl(var(--portal-muted-foreground))]'
            )}
          >
            {item.description}
          </p>
        )}
      </div>
    </Link>
  )
}

/**
 * Menu category column component
 */
function CategoryColumn({ category }: { category: MegaMenuCategory }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--portal-muted-foreground))]">
        {category.title}
      </h3>
      <ul className="space-y-2">
        {category.items.map((item, idx) => (
          <li key={idx}>
            <Link
              href={item.href}
              className={cn(
                'group flex items-center gap-2',
                'text-sm text-[hsl(var(--portal-foreground))]',
                'hover:text-[hsl(var(--portal-primary))]',
                'transition-colors duration-150'
              )}
            >
              {/* Item image thumbnail */}
              {item.image?.src && (
                <div className="relative h-8 w-8 overflow-hidden rounded">
                  <Image
                    src={item.image.src}
                    alt={item.image.alt || item.label}
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                </div>
              )}
              <span>{item.label}</span>
              {item.badge && (
                <span className="rounded bg-[hsl(var(--portal-primary))]/10 px-1.5 py-0.5 text-[10px] font-medium text-[hsl(var(--portal-primary))]">
                  {item.badge}
                </span>
              )}
              {item.featured && (
                <ArrowRight className="h-3 w-3 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
              )}
            </Link>
          </li>
        ))}
      </ul>
      {category.viewAllLink && (
        <Link
          href={category.viewAllLink.href}
          className={cn(
            'mt-4 inline-flex items-center gap-1',
            'text-sm font-medium text-[hsl(var(--portal-primary))]',
            'hover:underline'
          )}
        >
          {category.viewAllLink.label}
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  )
}

/**
 * Mega Menu Block Component
 */
export function MegaMenuBlock({ block, className }: BlockProps<MegaMenuBlockConfig>) {
  const {
    triggerLabel,
    categories = [],
    featuredSection,
    columns = 4,
    showImages = true,
    openOn = 'hover',
    backgroundColor,
  } = block.config

  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleTriggerClick = () => {
    if (openOn === 'click') {
      setIsOpen(!isOpen)
    }
  }

  const handleMouseEnter = () => {
    if (openOn === 'hover') {
      setIsOpen(true)
    }
  }

  const handleMouseLeave = () => {
    if (openOn === 'hover') {
      setIsOpen(false)
    }
  }

  const menuStyle: React.CSSProperties = {
    backgroundColor,
  }

  // Calculate grid columns based on config
  const gridCols = {
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
  }[columns]

  return (
    <div
      className={cn('relative', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        className={cn(
          'flex items-center gap-1 px-3 py-2',
          'text-sm font-medium',
          'text-[hsl(var(--portal-foreground))]',
          'hover:text-[hsl(var(--portal-primary))]',
          'transition-colors duration-150'
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {triggerLabel}
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Mega Menu Panel */}
      {isOpen && (
        <div
          ref={menuRef}
          className={cn(
            'absolute left-1/2 top-full z-50',
            '-translate-x-1/2 pt-2'
          )}
        >
          <div
            className={cn(
              'w-screen max-w-5xl',
              'rounded-xl border border-[hsl(var(--portal-border))]',
              'bg-[hsl(var(--portal-card))] shadow-2xl',
              'animate-fade-in-up'
            )}
            style={menuStyle}
          >
            <div className="p-6 lg:p-8">
              <div className="flex gap-8 lg:gap-12">
                {/* Categories Grid */}
                <div className={cn('flex-1 grid gap-8', gridCols)}>
                  {categories.map((category, idx) => (
                    <CategoryColumn key={idx} category={category} />
                  ))}
                </div>

                {/* Featured Section */}
                {featuredSection && showImages && (
                  <div className="hidden w-64 shrink-0 border-l border-[hsl(var(--portal-border))] pl-8 lg:block">
                    <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--portal-muted-foreground))]">
                      {featuredSection.title}
                    </h3>
                    <div className="space-y-4">
                      {featuredSection.items.map((item, idx) => (
                        <FeaturedCard key={idx} item={item} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
