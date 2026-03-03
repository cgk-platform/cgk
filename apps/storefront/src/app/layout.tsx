/**
 * Root Layout
 *
 * Provides tenant-aware layout with theming, header, footer, and global styles.
 * Tenant context and theme are extracted from middleware headers.
 */

// Environment validation - must be first import to fail fast on missing env vars
import '@/lib/env-validation'

import type { Metadata } from 'next'
import { Assistant, Raleway, Manrope } from 'next/font/google'

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

import { BackToTop } from '@/components/layout/BackToTop'
import { CookieConsent } from '@/components/layout/CookieConsent'
import { StorefrontFooter } from '@/components/layout/StorefrontFooter'

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

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
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
    <html
      lang="en"
      className={`${assistant.variable} ${raleway.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeHead theme={theme} />
        {tenantSlug && <AnalyticsHead tenantSlug={tenantSlug} />}

        {/* DNS Prefetch & Preconnect for performance */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <link rel="dns-prefetch" href="https://analytics.tiktok.com" />
        <link rel="preconnect" href="https://ajax.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.shopify.com" />
        <link rel="dns-prefetch" href="https://tools.luckyorange.com" />

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

        {/* Buy with Prime (Amazon) */}
        {process.env.NEXT_PUBLIC_BWP_SITE_ID && (
          <script async src="https://code.buywithprime.amazon.com/bwp.v1.js" />
        )}

        {/* Bazaarvoice Reviews */}
        {process.env.NEXT_PUBLIC_BAZAARVOICE_CLIENT_ID && (
          <script
            async
            src={`https://apps.bazaarvoice.com/deployments/${process.env.NEXT_PUBLIC_BAZAARVOICE_CLIENT_ID}/main_site/en_US/bv.js`}
          />
        )}
      </head>
      <body className="min-h-screen bg-cgk-off-white font-assistant text-foreground antialiased">
        {/* Skip to content */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-cgk-navy focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
        >
          Skip to content
        </a>
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
                theme={{
                  tenantId: storeName,
                  logoUrl: theme.logoUrl,
                  logoHeight: theme.logoHeight,
                }}
                linkHref="/"
              />
            }
            darkModeToggle={theme.darkModeEnabled ? <DarkModeToggle size="md" /> : null}
          />
          <main id="main-content" className="min-h-[calc(100vh-8rem)]">
            {children}
          </main>
          <StorefrontFooter />
          <BackToTop />
          <CookieConsent />
          {/* Buy with Prime Cart Widget */}
          {process.env.NEXT_PUBLIC_BWP_SITE_ID && (
            <div
              id="amzn-bwp-cart"
              data-site-id={process.env.NEXT_PUBLIC_BWP_SITE_ID}
              data-widget-id={process.env.NEXT_PUBLIC_BWP_WIDGET_ID ?? ''}
            />
          )}
        </ThemeProvider>
      </body>
    </html>
  )
}
