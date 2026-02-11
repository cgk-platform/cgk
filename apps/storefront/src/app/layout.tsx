/**
 * Root Layout
 *
 * Provides tenant-aware layout with header, footer, and global styles.
 * Tenant context is extracted from middleware headers.
 */

import type { Metadata } from 'next'

import { getTenantConfig } from '@/lib/tenant'

import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantConfig()

  return {
    title: {
      default: tenant?.name ?? 'Store',
      template: `%s | ${tenant?.name ?? 'Store'}`,
    },
    description: `Shop at ${tenant?.name ?? 'our store'}`,
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}): Promise<React.JSX.Element> {
  const tenant = await getTenantConfig()

  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <Header storeName={tenant?.name ?? 'Store'} />
        <main className="min-h-[calc(100vh-8rem)]">{children}</main>
        <Footer storeName={tenant?.name ?? 'Store'} />
      </body>
    </html>
  )
}

interface HeaderProps {
  storeName: string
}

function Header({ storeName }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <a href="/" className="text-xl font-bold">
          {storeName}
        </a>

        <nav className="hidden items-center gap-6 md:flex">
          <a href="/products" className="text-sm hover:text-primary">
            Products
          </a>
          <a href="/collections" className="text-sm hover:text-primary">
            Collections
          </a>
        </nav>

        <div className="flex items-center gap-4">
          {/* Search */}
          <a
            href="/search"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
            aria-label="Search"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </a>

          {/* Cart */}
          <a
            href="/cart"
            className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
            aria-label="Cart"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            {/* Cart count badge would go here */}
          </a>

          {/* Mobile Menu */}
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted md:hidden"
            aria-label="Menu"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}

interface FooterProps {
  storeName: string
}

function Footer({ storeName }: FooterProps) {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold">{storeName}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Quality products, delivered with care.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Shop
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a href="/products" className="hover:text-primary">
                  All Products
                </a>
              </li>
              <li>
                <a href="/collections" className="hover:text-primary">
                  Collections
                </a>
              </li>
              <li>
                <a href="/search?q=sale" className="hover:text-primary">
                  Sale
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Support
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a href="/contact" className="hover:text-primary">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="/faq" className="hover:text-primary">
                  FAQ
                </a>
              </li>
              <li>
                <a href="/shipping" className="hover:text-primary">
                  Shipping
                </a>
              </li>
              <li>
                <a href="/returns" className="hover:text-primary">
                  Returns
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Legal
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a href="/privacy" className="hover:text-primary">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms" className="hover:text-primary">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} {storeName}. All rights reserved.
          </p>
          <p className="mt-1">Powered by CGK</p>
        </div>
      </div>
    </footer>
  )
}
