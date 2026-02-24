/**
 * Root Layout
 *
 * Provides tenant-aware layout with theming, header, footer, and global styles.
 * Tenant context and theme are extracted from middleware headers.
 */

// Environment validation - must be first import to fail fast on missing env vars
import '@/lib/env-validation'

import type { Metadata } from 'next'
import { Assistant, Raleway } from 'next/font/google'

import { getTenantConfig, getTenantSlug } from '@/lib/tenant'
import {
  ThemeHead,
  ThemeProvider,
  DarkModeToggle,
  ServerBrandLogo,
  loadThemeForSSR,
  createTheme,
} from '@/lib/theme'
import { HeaderWrapper } from '@/components/layout/HeaderWrapper'
import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { AnalyticsHead } from '@/components/analytics/AnalyticsHead'

import './globals.css'

const assistant = Assistant({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-assistant',
  display: 'swap',
})

const raleway = Raleway({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-raleway',
  display: 'swap',
})

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
    <html lang="en" className={`${assistant.variable} ${raleway.variable}`} suppressHydrationWarning>
      <head>
        <ThemeHead theme={theme} />
        {tenantSlug && <AnalyticsHead tenantSlug={tenantSlug} />}

        {/* Google Tag Manager */}
        {process.env.NEXT_PUBLIC_GTM_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${process.env.NEXT_PUBLIC_GTM_ID}');`,
            }}
          />
        )}

        {/* TikTok Pixel */}
        {process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html: `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID}');ttq.page();}(window,document,'ttq');`,
            }}
          />
        )}

        {/* Lucky Orange */}
        {process.env.NEXT_PUBLIC_LUCKY_ORANGE_ID && (
          <script
            async
            defer
            src={`https://tools.luckyorange.com/core/lo.js?site-id=${process.env.NEXT_PUBLIC_LUCKY_ORANGE_ID}`}
          />
        )}
      </head>
      <body className="min-h-screen bg-cgk-off-white font-assistant text-foreground antialiased">
        {/* GTM noscript fallback */}
        {process.env.NEXT_PUBLIC_GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${process.env.NEXT_PUBLIC_GTM_ID}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}
        <ThemeProvider theme={theme}>
          {/* Announcement Bar */}
          <AnnouncementBar />
          <HeaderWrapper
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
    <footer className="bg-cgk-navy text-white">
      <div className="mx-auto max-w-store px-4 py-12">
        {/* Newsletter Section */}
        <div className="mb-12 border-b border-white/20 pb-12">
          <div className="mx-auto max-w-md text-center">
            <h3 className="text-lg font-semibold">Stay in the Loop</h3>
            <p className="mt-2 text-sm text-white/70">
              Subscribe for exclusive deals, new arrivals, and sleep tips.
            </p>
            <form className="mt-4 flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 rounded-btn border border-white/30 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-white focus:outline-none"
                required
              />
              <button
                type="submit"
                className="rounded-btn bg-white px-5 py-2.5 text-sm font-semibold text-cgk-navy transition-colors hover:bg-cgk-cream"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold">{storeName}</h3>
            <p className="mt-2 text-sm text-white/70">
              The Internet&apos;s Favorite Sheets. Premium bedding delivered with care.
            </p>
            {/* Social Icons */}
            <div className="mt-4 flex gap-3">
              <a href="https://www.facebook.com/cgklinens" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 transition-colors hover:bg-white/10">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
              </a>
              <a href="https://www.instagram.com/cgklinens" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 transition-colors hover:bg-white/10">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
              </a>
              <a href="https://www.tiktok.com/@cgklinens" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 transition-colors hover:bg-white/10">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78 2.92 2.92 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.57 6.33 6.33 0 0 0 9.37 22a6.33 6.33 0 0 0 6.37-6.23V9.4a8.16 8.16 0 0 0 3.85.96V7.04a4.85 4.85 0 0 1-1-.35z" /></svg>
              </a>
              <a href="https://www.pinterest.com/cgklinens" target="_blank" rel="noopener noreferrer" aria-label="Pinterest" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 transition-colors hover:bg-white/10">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0a12 12 0 0 0-4.37 23.17c-.1-.94-.2-2.4.04-3.44l1.4-5.96s-.37-.73-.37-1.81c0-1.7.98-2.96 2.21-2.96 1.04 0 1.54.78 1.54 1.72 0 1.05-.67 2.62-1.01 4.07-.29 1.2.6 2.18 1.79 2.18 2.15 0 3.8-2.27 3.8-5.54 0-2.9-2.08-4.92-5.06-4.92-3.45 0-5.47 2.58-5.47 5.25 0 1.04.4 2.15.9 2.76a.36.36 0 0 1 .08.35l-.34 1.36c-.05.22-.18.27-.4.16-1.5-.7-2.43-2.88-2.43-4.64 0-3.78 2.75-7.25 7.92-7.25 4.16 0 7.4 2.97 7.4 6.93 0 4.13-2.6 7.46-6.22 7.46-1.21 0-2.36-.63-2.75-1.38l-.75 2.85c-.27 1.04-1 2.35-1.49 3.15A12 12 0 1 0 12 0z" /></svg>
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white/60">
              Shop
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><a href="/products" className="text-white/80 transition-colors hover:text-white">All Products</a></li>
              <li><a href="/collections/6-piece-sheet-sets" className="text-white/80 transition-colors hover:text-white">Sheet Sets</a></li>
              <li><a href="/collections/bedding" className="text-white/80 transition-colors hover:text-white">Bedding</a></li>
              <li><a href="/collections/blankets" className="text-white/80 transition-colors hover:text-white">Blankets</a></li>
              <li><a href="/collections/comforters" className="text-white/80 transition-colors hover:text-white">Comforters</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white/60">
              Support
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><a href="/contact" className="text-white/80 transition-colors hover:text-white">Contact Us</a></li>
              <li><a href="/faq" className="text-white/80 transition-colors hover:text-white">FAQ</a></li>
              <li><a href="/shipping" className="text-white/80 transition-colors hover:text-white">Shipping</a></li>
              <li><a href="/returns" className="text-white/80 transition-colors hover:text-white">Returns</a></li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white/60">
              Account
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><a href="/account" className="text-white/80 transition-colors hover:text-white">My Account</a></li>
              <li><a href="/account/orders" className="text-white/80 transition-colors hover:text-white">Orders</a></li>
              <li><a href="/privacy" className="text-white/80 transition-colors hover:text-white">Privacy Policy</a></li>
              <li><a href="/terms" className="text-white/80 transition-colors hover:text-white">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/20 pt-8 text-center text-sm text-white/50">
          <p>&copy; {new Date().getFullYear()} {storeName}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
