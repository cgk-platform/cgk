/**
 * GA4 integration
 */

import type { EventParams, UserProperties } from './types'

export interface GA4Config {
  measurementId: string
  debug?: boolean
  sendPageViews?: boolean
}

let config: GA4Config | null = null

/**
 * Initialize GA4
 * Call this once on app load
 */
export function initGA4(ga4Config: GA4Config): void {
  config = ga4Config

  if (typeof window === 'undefined') {
    console.warn('GA4 can only be initialized in browser environment')
    return
  }

  // Load gtag.js
  const script = document.createElement('script')
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Config.measurementId}`
  script.async = true
  document.head.appendChild(script)

  // Initialize gtag
  window.dataLayer = window.dataLayer || []
  function gtag(...args: unknown[]) {
    window.dataLayer.push(args)
  }
  window.gtag = gtag

  gtag('js', new Date())
  gtag('config', ga4Config.measurementId, {
    debug_mode: ga4Config.debug,
    send_page_view: ga4Config.sendPageViews ?? true,
  })
}

/**
 * Track a custom event
 */
export function trackEvent(eventName: string, params?: EventParams): void {
  if (typeof window === 'undefined' || !window.gtag) {
    if (config?.debug) {
      console.log('GA4 trackEvent:', eventName, params)
    }
    return
  }

  window.gtag('event', eventName, params)
}

/**
 * Track a page view
 */
export function trackPageView(path?: string, title?: string): void {
  if (typeof window === 'undefined' || !window.gtag) {
    if (config?.debug) {
      console.log('GA4 trackPageView:', path, title)
    }
    return
  }

  window.gtag('event', 'page_view', {
    page_path: path ?? window.location.pathname,
    page_title: title ?? document.title,
  })
}

/**
 * Set user properties
 */
export function setUserProperties(properties: UserProperties): void {
  if (typeof window === 'undefined' || !window.gtag || !config) {
    return
  }

  window.gtag('config', config.measurementId, {
    user_properties: properties,
  })
}

// Type declarations for gtag
declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}
