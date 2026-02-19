/**
 * Root Layout
 *
 * Provides tenant-aware layout with theming, header, footer, and global styles.
 * Tenant context and theme are extracted from middleware headers.
 */

// Environment validation - must be first import to fail fast on missing env vars
import '@/lib/env-validation'

import type { Metadata } from 'next'

import { getTenantConfig, getTenantSlug } from '@/lib/tenant'
import {
  ThemeHead,
  ThemeProvider,
  DarkModeToggle,
  ServerBrandLogo,
  loadThemeForSSR,
  createTheme,
} from '@/lib/theme'
import { StorefrontHeader } from '@/components/layout/StorefrontHeader'
import { AnalyticsHead } from '@/components/analytics/AnalyticsHead'

import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantConfig()
  const tenantSlug = await getTenantSlug()
  let theme = createTheme(tenantSlug ?? 'default')

  if (tenantSlug) {
    try {
      theme = await loadThemeForSSR(tenantSlug)
    } catch {
      // Use default theme on error
    }
  }

  return {
    title: {
      default: tenant?.name ?? 'Store',
      template: `%s | ${tenant?.name ?? 'Store'}`,
    },
    description: `Shop at ${tenant?.name ?? 'our store'}`,
    icons: theme.faviconUrl ? { icon: theme.faviconUrl } : undefined,
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}): Promise<React.JSX.Element> {
  const tenant = await getTenantConfig()
  const tenantSlug = await getTenantSlug()

  // Load theme config
  let theme = createTheme(tenantSlug ?? 'default')
  if (tenantSlug) {
    try {
      theme = await loadThemeForSSR(tenantSlug)
    } catch {
      // Use default theme on error
    }
  }

  const storeName = tenant?.name ?? 'Store'

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeHead theme={theme} />
        {tenantSlug && <AnalyticsHead tenantSlug={tenantSlug} />}
      </head>
      <body className="min-h-screen bg-[hsl(var(--portal-background))] font-[var(--portal-font-family)] text-[hsl(var(--portal-foreground))] antialiased">
        <ThemeProvider theme={theme}>
          <StorefrontHeader
            storeName={storeName}
            tenantSlug={tenantSlug ?? 'default'}
            theme={theme}
            logoComponent={
              <ServerBrandLogo
                theme={{ tenantId: storeName, logoUrl: theme.logoUrl, logoHeight: theme.logoHeight }}
                linkHref="/"
              />
            }
            darkModeToggle={theme.darkModeEnabled ? <DarkModeToggle size="md" /> : null}
          />
          <main className="min-h-[calc(100vh-8rem)]">{children}</main>
          <Footer storeName={storeName} />
        </ThemeProvider>
      </body>
    </html>
  )
}

interface FooterProps {
  storeName: string
}

function Footer({ storeName }: FooterProps) {
  return (
    <footer className="border-t border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-muted))]/30">
      <div className="container mx-auto px-4 py-12" style={{ maxWidth: 'var(--portal-max-width)' }}>
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold">{storeName}</h3>
            <p className="mt-2 text-sm text-[hsl(var(--portal-muted-foreground))]">
              Quality products, delivered with care.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--portal-muted-foreground))]">
              Shop
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a href="/products" className="transition-colors hover:text-[hsl(var(--portal-primary))]">
                  All Products
                </a>
              </li>
              <li>
                <a href="/collections" className="transition-colors hover:text-[hsl(var(--portal-primary))]">
                  Collections
                </a>
              </li>
              <li>
                <a href="/search?q=sale" className="transition-colors hover:text-[hsl(var(--portal-primary))]">
                  Sale
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--portal-muted-foreground))]">
              Support
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a href="/contact" className="transition-colors hover:text-[hsl(var(--portal-primary))]">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="/faq" className="transition-colors hover:text-[hsl(var(--portal-primary))]">
                  FAQ
                </a>
              </li>
              <li>
                <a href="/shipping" className="transition-colors hover:text-[hsl(var(--portal-primary))]">
                  Shipping
                </a>
              </li>
              <li>
                <a href="/returns" className="transition-colors hover:text-[hsl(var(--portal-primary))]">
                  Returns
                </a>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--portal-muted-foreground))]">
              Account
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a href="/account" className="transition-colors hover:text-[hsl(var(--portal-primary))]">
                  My Account
                </a>
              </li>
              <li>
                <a href="/account/orders" className="transition-colors hover:text-[hsl(var(--portal-primary))]">
                  Orders
                </a>
              </li>
              <li>
                <a href="/privacy" className="transition-colors hover:text-[hsl(var(--portal-primary))]">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms" className="transition-colors hover:text-[hsl(var(--portal-primary))]">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-[hsl(var(--portal-border))] pt-8 text-center text-sm text-[hsl(var(--portal-muted-foreground))]">
          <p>
            &copy; {new Date().getFullYear()} {storeName}. All rights reserved.
          </p>
          <p className="mt-1">Powered by CGK</p>
        </div>
      </div>
    </footer>
  )
}
