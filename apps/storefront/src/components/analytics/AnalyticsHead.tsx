/**
 * Analytics Head - Server Component
 *
 * Injects per-tenant analytics pixel scripts into <head>.
 * Pixel IDs are loaded at request time from the tenant's site_config table,
 * so they are not baked into the build as NEXT_PUBLIC_ env vars.
 *
 * Initializes:
 * - Google Analytics 4 (GA4) via gtag.js
 * - Meta/Facebook Pixel via fbq
 * - TikTok Pixel via ttq
 */

import Script from 'next/script'

import { getAnalyticsConfig } from '@/lib/analytics/server'

interface AnalyticsHeadProps {
  tenantSlug: string
}

export async function AnalyticsHead({ tenantSlug }: AnalyticsHeadProps) {
  const config = await getAnalyticsConfig(tenantSlug)

  // Nothing to inject if no pixels configured
  if (!config.ga4MeasurementId && !config.fbPixelId && !config.tiktokPixelId) {
    return null
  }

  // Expose config to client for runtime pixel checks
  const runtimeConfigScript = `window.__CGK_ANALYTICS__ = ${JSON.stringify({
    ga4MeasurementId: config.ga4MeasurementId,
    fbPixelId: config.fbPixelId,
    tiktokPixelId: config.tiktokPixelId,
  })};`

  return (
    <>
      {/* Runtime config for client-side pixel modules */}
      <Script id="cgk-analytics-config" strategy="beforeInteractive">
        {runtimeConfigScript}
      </Script>

      {/* Google Analytics 4 */}
      {config.ga4MeasurementId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${config.ga4MeasurementId}`}
            strategy="afterInteractive"
          />
          <Script id="cgk-ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${config.ga4MeasurementId}');`}
          </Script>
        </>
      )}

      {/* Meta/Facebook Pixel */}
      {config.fbPixelId && (
        <Script id="cgk-meta-pixel-init" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${config.fbPixelId}');
fbq('track', 'PageView');`}
        </Script>
      )}

      {/* TikTok Pixel */}
      {config.tiktokPixelId && (
        <Script id="cgk-tiktok-pixel-init" strategy="afterInteractive">
          {`!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
  ttq.load('${config.tiktokPixelId}');
  ttq.page();
}(window, document, 'ttq');`}
        </Script>
      )}
    </>
  )
}
