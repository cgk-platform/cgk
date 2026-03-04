'use client'

/**
 * Header Component
 *
 * Main navigation header for Meliusly storefront.
 * Exact match to Figma design 1:269 (Nav component).
 * Features: Announcement bar, logo, nav links with mega menu dropdowns, search, user, cart icons.
 */

import Link from 'next/link'
import { Search, ShoppingCart, User, Menu } from 'lucide-react'
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from '@cgk-platform/ui'
import { MegaMenuProductCard } from '@/components/navigation/MegaMenuProductCard'
import {
  sofaSupportProducts,
  sleeperSofaSupportProducts,
  bedSupportProducts,
  productGuidesLinks,
  helpLinks,
} from '@/lib/sample-mega-menu-data'

interface HeaderProps {
  cartItemCount?: number
  onMobileMenuToggle?: () => void
  onCartClick?: () => void
}

export function Header({ cartItemCount = 0, onMobileMenuToggle, onCartClick }: HeaderProps) {
  return (
    <header className="relative w-full">
      {/* Announcement Bar */}
      <div className="flex h-[36px] items-center justify-center bg-[#0268a0]">
        <p className="font-manrope text-[13px] leading-[1.15] font-bold tracking-[0.26px] text-white uppercase">
          FREE Shipping on all orders
        </p>
      </div>

      {/* Main Navigation */}
      <div className="relative z-50 flex h-[72px] items-center justify-between bg-white px-[50px] py-[16px]">
        {/* Logo */}
        <Link href="/" className="relative flex h-[34px] w-[160px] items-center justify-start">
          <img
            src="/assets/69bb33a6f2ea1403b208fab9c38e49c39bcb12bf.png"
            alt="Meliusly"
            className="h-full w-auto object-contain"
          />
        </Link>

        {/* Navigation Menu with Mega Dropdowns */}
        <NavigationMenu className="hidden lg:flex">
          <NavigationMenuList className="gap-[32px]">
            {/* Sofa Support */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="font-manrope h-auto bg-transparent px-0 py-0 text-[14px] leading-[1.2] font-semibold text-[#161f2b] hover:bg-transparent hover:text-[#0268a0] data-[active]:bg-transparent data-[state=open]:bg-transparent">
                Sofa Support
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-screen max-w-6xl p-6">
                  <div className="grid grid-cols-3 gap-6">
                    {sofaSupportProducts.map((product) => (
                      <MegaMenuProductCard key={product.handle} product={product} />
                    ))}
                  </div>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Sleeper Sofa Support */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="font-manrope h-auto bg-transparent px-0 py-0 text-[14px] leading-[1.2] font-semibold text-[#161f2b] hover:bg-transparent hover:text-[#0268a0] data-[active]:bg-transparent data-[state=open]:bg-transparent">
                Sleeper Sofa Support
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-screen max-w-6xl p-6">
                  <div className="grid grid-cols-3 gap-6">
                    {sleeperSofaSupportProducts.map((product) => (
                      <MegaMenuProductCard key={product.handle} product={product} />
                    ))}
                  </div>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Bed Support */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="font-manrope h-auto bg-transparent px-0 py-0 text-[14px] leading-[1.2] font-semibold text-[#161f2b] hover:bg-transparent hover:text-[#0268a0] data-[active]:bg-transparent data-[state=open]:bg-transparent">
                Bed Support
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-screen max-w-6xl p-6">
                  <div className="grid grid-cols-3 gap-6">
                    {bedSupportProducts.map((product) => (
                      <MegaMenuProductCard key={product.handle} product={product} />
                    ))}
                  </div>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Product Guides */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="font-manrope h-auto bg-transparent px-0 py-0 text-[14px] leading-[1.2] font-semibold text-[#161f2b] hover:bg-transparent hover:text-[#0268a0] data-[active]:bg-transparent data-[state=open]:bg-transparent">
                Product Guides
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-80 p-4">
                  <div className="space-y-2">
                    {productGuidesLinks.map((link) => (
                      <NavigationMenuLink key={link.href} asChild>
                        <Link
                          href={link.href}
                          className="font-manrope block rounded-md px-4 py-3 text-sm font-medium text-[#161f2b] transition-colors hover:bg-gray-50 hover:text-[#0268a0]"
                        >
                          {link.title}
                        </Link>
                      </NavigationMenuLink>
                    ))}
                  </div>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Help */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="font-manrope h-auto bg-transparent px-0 py-0 text-[14px] leading-[1.2] font-semibold text-[#161f2b] hover:bg-transparent hover:text-[#0268a0] data-[active]:bg-transparent data-[state=open]:bg-transparent">
                Help
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-80 p-4">
                  <div className="space-y-2">
                    {helpLinks.map((link) => (
                      <NavigationMenuLink key={link.href} asChild>
                        <Link
                          href={link.href}
                          className="font-manrope block rounded-md px-4 py-3 text-sm font-medium text-[#161f2b] transition-colors hover:bg-gray-50 hover:text-[#0268a0]"
                        >
                          {link.title}
                        </Link>
                      </NavigationMenuLink>
                    ))}
                  </div>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

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
