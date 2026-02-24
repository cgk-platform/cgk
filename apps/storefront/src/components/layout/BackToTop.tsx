/**
 * Back to Top Button
 *
 * Fixed button that appears after scrolling 400px.
 * Smooth-scrolls to top of page on click.
 */

'use client'

import { cn } from '@cgk-platform/ui'
import { useCallback, useEffect, useState } from 'react'

export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > 400)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className={cn(
        'fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center',
        'rounded-full bg-cgk-navy text-white shadow-lg',
        'transition-all duration-300',
        'hover:bg-cgk-navy/90 hover:shadow-xl',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cgk-navy focus-visible:ring-offset-2',
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-4 opacity-0'
      )}
      aria-label="Back to top"
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  )
}
