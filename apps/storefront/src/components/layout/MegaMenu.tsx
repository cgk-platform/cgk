/**
 * Mega Menu Component
 *
 * Premium desktop mega menu with NavigationMenu primitives.
 * Features product card grids with 3D renders, hover states, and keyboard navigation.
 * CGK branding: Meliusly navy + blue colors, smooth weighted transitions.
 */

'use client'

import Link from 'next/link'
import { cn } from '@cgk-platform/ui'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@cgk-platform/ui'
import { MegaMenuProductCard, type MegaMenuProduct } from '../navigation/MegaMenuProductCard'

export interface MenuItem {
  id: string
  title: string
  url: string
  items: MenuItem[]
  featuredProducts?: MegaMenuProduct[]
}

interface MegaMenuProps {
  items: MenuItem[]
}

export function MegaMenu({ items }: MegaMenuProps) {
  return (
    <NavigationMenu className="hidden lg:flex" delayDuration={150}>
      <NavigationMenuList>
        {items.map((item) => {
          const hasChildren = item.items.length > 0
          const hasFeaturedProducts = item.featuredProducts && item.featuredProducts.length > 0

          // Simple link without dropdown
          if (!hasChildren && !hasFeaturedProducts) {
            return (
              <NavigationMenuItem key={item.id}>
                <NavigationMenuLink asChild>
                  <Link
                    href={toRelativePath(item.url)}
                    className={cn(
                      'group inline-flex h-10 w-max items-center justify-center rounded-lg px-4 py-2',
                      'text-sm font-medium transition-colors',
                      'hover:bg-meliusly-light-blue hover:text-meliusly-primary',
                      'focus:bg-meliusly-light-blue focus:text-meliusly-primary focus:outline-none'
                    )}
                  >
                    {item.title}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            )
          }

          // Menu with dropdown
          return (
            <NavigationMenuItem key={item.id}>
              <NavigationMenuTrigger>{item.title}</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-screen max-w-[1200px] p-8">
                  {/* Featured Products Grid */}
                  {hasFeaturedProducts && (
                    <div className="mb-8">
                      <h3 className="mb-6 font-manrope text-sm font-semibold uppercase tracking-wider text-meliusly-dark-gray">
                        Featured Products
                      </h3>
                      <div className="grid gap-6 md:grid-cols-3">
                        {item.featuredProducts!.slice(0, 3).map((product, index) => (
                          <MegaMenuProductCard
                            key={`${product.handle}-${index}`}
                            product={product}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nested Categories */}
                  {hasChildren && (
                    <div>
                      {hasFeaturedProducts && (
                        <div className="mb-4 border-t border-gray-100 pt-6">
                          <h3 className="mb-4 font-manrope text-sm font-semibold uppercase tracking-wider text-meliusly-dark-gray">
                            Browse by Category
                          </h3>
                        </div>
                      )}
                      <div className="grid gap-8 md:grid-cols-3">
                        {item.items.map((child) => (
                          <div key={child.id}>
                            <Link
                              href={toRelativePath(child.url)}
                              className={cn(
                                'mb-3 block font-manrope text-base font-semibold text-meliusly-dark',
                                'transition-colors hover:text-meliusly-primary'
                              )}
                            >
                              {child.title}
                            </Link>
                            {child.items.length > 0 && (
                              <ul className="space-y-2">
                                {child.items.map((grandchild) => (
                                  <li key={grandchild.id}>
                                    <Link
                                      href={toRelativePath(grandchild.url)}
                                      className={cn(
                                        'block font-manrope text-sm text-meliusly-dark-gray',
                                        'transition-colors hover:text-meliusly-primary'
                                      )}
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
                  )}

                  {/* Compare Products CTA */}
                  {hasFeaturedProducts && (
                    <div className="mt-8 flex justify-center border-t border-gray-100 pt-6">
                      <Link
                        href="/compare"
                        className={cn(
                          'inline-flex items-center justify-center rounded-lg',
                          'bg-meliusly-primary px-8 py-3 font-manrope font-medium text-white',
                          'shadow-lg shadow-meliusly-primary/20',
                          'transition-all duration-200 hover:bg-meliusly-primary/90 hover:shadow-xl',
                          'focus:outline-none focus:ring-2 focus:ring-meliusly-primary focus:ring-offset-2'
                        )}
                      >
                        Compare Products
                      </Link>
                    </div>
                  )}
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          )
        })}
      </NavigationMenuList>
    </NavigationMenu>
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
