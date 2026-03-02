'use client'

/**
 * Root Layout Wrapper
 *
 * Client component wrapper for layout with header/footer.
 * Manages mobile navigation state and cart context.
 */

import { useState } from 'react'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { Footer } from './Footer'
import { CartDrawer } from '@/components/cart'
import { CartProvider, useCart } from '@/lib/cart/CartContext'

interface RootLayoutProps {
  children: React.ReactNode
}

function RootLayoutContent({ children }: RootLayoutProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const { cart } = useCart()

  return (
    <>
      <Header
        cartItemCount={cart?.itemCount || 0}
        onMobileMenuToggle={() => setIsMobileNavOpen(true)}
        onCartClick={() => setIsCartOpen(true)}
      />

      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      <main className="min-h-screen">{children}</main>

      <Footer />
    </>
  )
}

export function RootLayout({ children }: RootLayoutProps) {
  return (
    <CartProvider>
      <RootLayoutContent>{children}</RootLayoutContent>
    </CartProvider>
  )
}
