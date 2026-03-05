import type { Metadata } from 'next'
import Link from 'next/link'

import './globals.css'

export const metadata: Metadata = {
  title: 'Store',
  description: 'Headless Shopify storefront powered by CGK',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <header className="border-b">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Link href="/" className="text-xl font-bold">
              Store
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/products" className="text-sm hover:text-primary">
                Products
              </Link>
              <Link href="/collections" className="text-sm hover:text-primary">
                Collections
              </Link>
              <Link href="/cart" className="text-sm hover:text-primary">
                Cart
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t py-8 mt-auto">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            Powered by CGK
          </div>
        </footer>
      </body>
    </html>
  )
}
