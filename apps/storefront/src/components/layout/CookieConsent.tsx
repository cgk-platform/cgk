/**
 * Cookie Consent Banner
 *
 * Fixed bottom banner shown until user accepts cookies.
 * Persists consent in localStorage.
 */

'use client'

import { cn } from '@cgk-platform/ui'
import { useCallback, useEffect, useState } from 'react'

const COOKIE_CONSENT_KEY = 'cookie_consent'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Delay check slightly so it doesn't flash during SSR hydration
    const timer = setTimeout(() => {
      try {
        if (!localStorage.getItem(COOKIE_CONSENT_KEY)) {
          setVisible(true)
        }
      } catch {
        // localStorage unavailable (private browsing, etc.)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  const handleAccept = useCallback(() => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted')
    } catch {
      // Silently fail if localStorage unavailable
    }
    setVisible(false)
  }, [])

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 p-4 transition-all duration-500',
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-full opacity-0'
      )}
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="mx-auto flex max-w-store flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-xl sm:flex-row sm:justify-between sm:gap-6 sm:p-5">
        <p className="text-center text-sm text-gray-600 sm:text-left">
          We use cookies to improve your experience and analyze site traffic.
          By continuing to use our site, you agree to our use of cookies.
        </p>
        <button
          type="button"
          onClick={handleAccept}
          className={cn(
            'shrink-0 rounded-lg bg-cgk-navy px-6 py-2.5 text-sm font-semibold text-white',
            'transition-colors hover:bg-cgk-navy/90',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cgk-navy focus-visible:ring-offset-2'
          )}
        >
          Accept All
        </button>
      </div>
    </div>
  )
}
