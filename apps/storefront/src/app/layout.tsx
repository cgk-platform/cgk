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
import { NewsletterForm } from '@/components/forms/NewsletterForm'

import { BackToTop } from '@/components/layout/BackToTop'
import { CookieConsent } from '@/components/layout/CookieConsent'

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
    <html
      lang="en"
      className={`${assistant.variable} ${raleway.variable}`}
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
          <Footer storeName={storeName} />
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

/**
 * Footer section - always expanded on all screen sizes.
 * Mobile uses vertical stacking, desktop uses grid layout.
 */
function FooterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-4 text-[13px] font-bold uppercase tracking-[0.26px] text-white md:mb-6 md:text-sm">
        {title}
      </h4>
      <div>{children}</div>
    </div>
  )
}

interface FooterProps {
  storeName: string
}

function Footer({ storeName }: FooterProps) {
  return (
    <footer className="bg-[#161f2b] text-white">
      {/* Newsletter Section */}
      <div className="px-4 py-10 md:mx-auto md:max-w-store md:px-6 md:py-12">
        <div className="mx-auto max-w-md space-y-5 md:text-center">
          <div className="space-y-[20px]">
            <h3 className="text-[24px] font-semibold capitalize leading-[1.3]">
              Sign up & Get <span className="text-[#6abfef]">$XX</span> off
            </h3>
            <p className="text-[15px] font-medium leading-[1.6] tracking-[-0.15px]">
              Join our newsletter and get exclusive access to giveaways, discounts, and new releases
            </p>
          </div>
          <NewsletterForm variant="footer" className="mt-4" />
        </div>
      </div>

      {/* Logo Section */}
      <div className="relative h-[75px] px-4 md:mx-auto md:max-w-store md:px-6">
        <div className="absolute bottom-[3px] left-4 h-8 md:left-6">
          <h3 className="text-xl font-bold">{storeName}</h3>
        </div>
        <div className="absolute left-1/2 top-0 h-px w-full max-w-[328px] -translate-x-1/2 bg-white/20 md:max-w-full" />
      </div>

      {/* Navigation Links */}
      <div className="space-y-[50px] px-4 py-[30px] md:mx-auto md:max-w-store md:px-6 md:py-12">
        <div className="flex flex-col gap-[50px] md:flex-row md:gap-12">
          {/* Shop */}
          <FooterSection title="Shop">
            <ul className="space-y-[24px] text-[13px] font-medium leading-[1.8] tracking-[-0.13px]">
              <li>
                <a
                  href="/collections/sleeper-sofa-support"
                  className="text-white transition-colors hover:text-white/80"
                >
                  Sleeper Sofa Support
                </a>
              </li>
              <li>
                <a
                  href="/collections/sofa-chair-support"
                  className="text-white transition-colors hover:text-white/80"
                >
                  Sofa & Chair Support
                </a>
              </li>
              <li>
                <a
                  href="/collections/bed-support"
                  className="text-white transition-colors hover:text-white/80"
                >
                  Bed Support
                </a>
              </li>
            </ul>
          </FooterSection>

          {/* Meliusly */}
          <FooterSection title="Meliusly">
            <ul className="space-y-[24px] text-[13px] font-medium leading-[1.8] tracking-[-0.13px]">
              <li>
                <a href="/about" className="text-white transition-colors hover:text-white/80">
                  About Us
                </a>
              </li>
              <li>
                <a href="/blog" className="text-white transition-colors hover:text-white/80">
                  Blog
                </a>
              </li>
            </ul>
          </FooterSection>

          {/* Help */}
          <FooterSection title="Help">
            <ul className="space-y-[24px] text-[13px] font-medium leading-[1.8] tracking-[-0.13px]">
              <li>
                <a href="/contact" className="text-white transition-colors hover:text-white/80">
                  Contact
                </a>
              </li>
              <li>
                <a
                  href="/refund-policy"
                  className="text-white transition-colors hover:text-white/80"
                >
                  Refund Policy
                </a>
              </li>
              <li>
                <a
                  href="/terms-of-service"
                  className="text-white transition-colors hover:text-white/80"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="/privacy-policy"
                  className="text-white transition-colors hover:text-white/80"
                >
                  Privacy Policy
                </a>
              </li>
            </ul>
          </FooterSection>
        </div>

        {/* Contact Section - Bordered Box */}
        <div className="space-y-[24px] rounded-lg border border-[#0268a0] px-4 py-5">
          <h4 className="text-[13px] font-bold uppercase tracking-[0.26px] text-white">Contact</h4>
          <div className="space-y-1 text-[13px] font-medium leading-[1.8] tracking-[-0.13px]">
            <p>Meliusly Ventures LLC</p>
            <p>8 THE GRN # 21810</p>
            <p>DOVER, DE, 19901</p>
          </div>
          <div className="flex items-center gap-1">
            <svg className="h-[13px] w-[13px]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
            </svg>
            <span className="text-[13px] font-medium leading-[1.8] tracking-[-0.13px]">
              support@meliusly.com
            </span>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="space-y-5 px-4 pb-[30px] text-center md:mx-auto md:max-w-store md:px-6">
        <div className="space-y-[30px]">
          <p className="text-[13px] leading-[1.55] tracking-[0.26px]">
            © {new Date().getFullYear()} Meliusly | Powered by Shopify
          </p>
        </div>

        {/* Payment Icons */}
        <div className="flex items-center justify-center gap-2">
          <svg className="h-[22px] w-auto" viewBox="0 0 38 24" fill="none">
            <rect x="0.5" y="0.5" width="37" height="23" rx="3.5" fill="#1434CB" stroke="#D9D9D9" />
            <path
              d="M11.5 8.5h2.1l-1.3 8h-2.1l1.3-8zm10.8 5.1l1.1-3.1.6 3.1h-1.7zm2.4 2.9h2l-1.7-8h-1.8c-.4 0-.8.2-.9.6l-3.2 7.4h2.2l.4-1.2h2.7l.3 1.2zm-5.5-2.6c0-2.1-2.8-2.2-2.8-3.2 0-.3.3-.6.9-.7.3 0 1.2-.1 2.2.4l.4-1.8c-.5-.2-1.3-.4-2.2-.4-2.3 0-3.9 1.2-3.9 3 0 1.3 1.2 2 2 2.4.9.4 1.2.7 1.2 1.1 0 .6-.7.9-1.4.9-1.2 0-1.8-.2-2.8-.6l-.4 2c.6.3 1.8.5 3 .5 2.4.1 4-.9 4-3zm-12.7-5.4l-3.8 8h-2.2l-1.9-7.2c-.1-.4-.2-.6-.6-.7-.6-.3-1.6-.5-2.5-.7l.1-.4h4.3c.5 0 1 .4 1.1.9l1 5.2 2.4-6.1h2.1z"
              fill="white"
            />
          </svg>
          <svg className="h-[22px] w-auto" viewBox="0 0 38 24" fill="none">
            <rect x="0.5" y="0.5" width="37" height="23" rx="3.5" fill="white" stroke="#D9D9D9" />
            <path d="M14 7.5h10v9H14z" fill="#FF5F00" />
            <circle cx="13" cy="12" r="6" fill="#EB001B" />
            <circle cx="25" cy="12" r="6" fill="#F79E1B" />
          </svg>
          <svg className="h-[22px] w-auto" viewBox="0 0 38 24" fill="none">
            <rect x="0.5" y="0.5" width="37" height="23" rx="3.5" fill="#65A7CC" stroke="#D9D9D9" />
            <path
              d="M8 8h3c1.7 0 2.7 1.2 2.7 2.4 0 1.6-1.2 2.6-3 2.6h-1l-.4 2h-1.8L8 8zm2.5 3.5c.8 0 1.3-.5 1.3-1.1 0-.5-.3-.9-1-.9h-.9l-.4 2h1zm7.5 0c0-2.5-1.9-3.5-3.8-3.5H11.5L10 15h1.8l.4-2h1.3c2.2 0 4.5-1 4.5-3.5zm-3.8 2c-1 0-1.8-.7-1.8-1.8 0-1.4 1-2.2 2.3-2.2 1 0 1.8.7 1.8 1.8 0 1.4-1 2.2-2.3 2.2zm9.8-3.5h-1.7l.1-.7c0-.4.4-.7.8-.7.3 0 .6.1.8.2l.3-1.3c-.3-.2-.8-.3-1.4-.3-1.4 0-2.4.8-2.4 2 0 .8.6 1.3 1.4 1.7.7.3 1 .5 1 .9 0 .5-.5.8-1.1.8-.6 0-1.2-.2-1.6-.4l-.3 1.4c.5.2 1.1.3 1.7.3 1.6 0 2.7-.8 2.7-2 0-.9-.6-1.4-1.6-1.9-.6-.3-.9-.5-.9-.9 0-.4.4-.7.9-.7.5 0 .9.1 1.1.2l.2-1.4zm4.5-.5c-.4 0-.8.2-1 .5l-.1-.4h-1.6L25 15h1.7l.5-2.6c.2-.8.6-1.3 1.2-1.3.3 0 .5.1.6.1l.3-1.6c-.1-.1-.3-.1-.6-.1zm-17.5.5h-2.5L8 15h2.5l.5-2.5c.2-1 .8-1.6 1.5-1.6.4 0 .7.1 1 .3l.3-1.7c-.3-.2-.7-.3-1.1-.3-.7 0-1.3.3-1.7 1z"
              fill="white"
            />
          </svg>
          <svg className="h-[22px] w-auto" viewBox="0 0 38 24" fill="none">
            <rect x="0.5" y="0.5" width="37" height="23" rx="3.5" fill="#FFC439" stroke="#D9D9D9" />
            <path
              d="M14.7 8c-.8 0-1.5.3-2 .8l-.1-.6h-2.5L8.5 16h2.6l.8-4c.2-1.2.9-1.9 1.7-1.9.6 0 1 .3 1 1l-.8 4.9h2.6l.9-5.2c0-1.4-.9-2.8-2.6-2.8zM22 8c-2.7 0-4.5 2.4-4.5 4.6 0 1.8 1.2 3.4 3.4 3.4 2.7 0 4.5-2.4 4.5-4.6 0-1.8-1.2-3.4-3.4-3.4zm-.9 6c-.9 0-1.3-.7-1.3-1.5 0-1.3.8-2.5 1.8-2.5.9 0 1.3.7 1.3 1.5 0 1.3-.8 2.5-1.8 2.5zm7.4-4.5c0 .3-.2.5-.5.5s-.5-.2-.5-.5.2-.5.5-.5.5.2.5.5zm-1.7 4.5v-4h-2.5l-.1.6c-.4-.5-1-.8-1.8-.8-2.3 0-4 2.2-4 4.6 0 1.6 1 2.8 2.5 2.8.8 0 1.5-.3 2-.9l-.1.7h2.5l1.5-9h-2.5l.5 3.5c-.3.8-1 1.5-1.8 1.5-.6 0-1-.4-1-1.1 0-1.1.7-2 1.6-2 .5 0 .9.2 1.2.6l2-1.2c-.7-.8-1.7-1.4-3-1.4-2.7 0-4.5 2.4-4.5 4.6 0 1.8 1.2 3.4 3.4 3.4 1 0 1.9-.4 2.6-1.1l.1.9h2.5l.4-2.2z"
              fill="#27346A"
            />
          </svg>
          <svg className="h-[22px] w-auto" viewBox="0 0 38 24" fill="none">
            <rect x="0.5" y="0.5" width="37" height="23" rx="3.5" fill="#5A31F4" stroke="#D9D9D9" />
            <path
              d="M14.5 9.5c-.4 0-.7.1-1 .3l-.1-.2h-1.2l-.8 5.9h1.3l.5-3.6c.2-.9.6-1.5 1.1-1.5.4 0 .6.2.6.7l-.5 4.4h1.3l.6-4.7c0-1-.6-1.8-1.8-1.8zM19.5 9.5c-1.9 0-3.2 1.7-3.2 3.3 0 1.3.9 2.5 2.4 2.5 1.9 0 3.2-1.7 3.2-3.3 0-1.3-.9-2.5-2.4-2.5zm-.7 4.5c-.6 0-1-.5-1-1.2 0-1 .6-1.8 1.3-1.8.6 0 1 .5 1 1.2 0 1-.6 1.8-1.3 1.8zm5.7-3.3c0 .2-.1.4-.4.4-.2 0-.4-.1-.4-.4 0-.2.2-.4.4-.4.3 0 .4.2.4.4zm-1.2 3.3v-2.9h-1.8l-.1.4c-.3-.3-.7-.6-1.3-.6-1.6 0-2.9 1.6-2.9 3.3 0 1.2.7 2 1.8 2 .6 0 1.1-.2 1.5-.7l-.1.5h1.8l1.1-6.5h-1.8l.4 2.5c-.2.6-.7 1.1-1.3 1.1-.4 0-.7-.3-.7-.8 0-.8.5-1.5 1.2-1.5.4 0 .6.1.9.4l1.4-.9c-.5-.6-1.2-1-2.1-1-1.9 0-3.2 1.7-3.2 3.3 0 1.3.9 2.5 2.4 2.5.7 0 1.4-.3 1.8-.8l.1.7h1.8l.3-1.6z"
              fill="white"
            />
          </svg>
        </div>
      </div>
    </footer>
  )
}
