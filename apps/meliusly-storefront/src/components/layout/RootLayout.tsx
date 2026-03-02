'use client'

/**
 * Root Layout Wrapper
 *
 * Client component wrapper for layout with header/footer.
 * Manages mobile navigation state.
 */

import { useState } from 'react'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { Footer } from './Footer'

interface RootLayoutProps {
  children: React.ReactNode
}

export function RootLayout({ children }: RootLayoutProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  return (
    <>
      <Header cartItemCount={0} onMobileMenuToggle={() => setIsMobileNavOpen(true)} />

      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <main className="min-h-screen">{children}</main>

      <Footer />
    </>
  )
}
