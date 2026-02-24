/**
 * Announcement Bar
 *
 * Rotating announcement bar with configurable messages and auto-rotate interval.
 * Slides messages in from the right with a smooth transition.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

interface AnnouncementBarProps {
  messages?: string[]
  /** Auto-rotate interval in milliseconds. Default: 5000ms */
  interval?: number
}

const DEFAULT_MESSAGES = [
  'FREE 3-DAY DELIVERY FOR ORDERS OVER $50',
  'SHOP OUR BEST-SELLING 6-PIECE SHEET SETS',
  '30-DAY HASSLE-FREE RETURNS',
]

export function AnnouncementBar({
  messages = DEFAULT_MESSAGES,
  interval = 5000,
}: AnnouncementBarProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const advance = useCallback(() => {
    if (messages.length <= 1) return
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length)
      setIsTransitioning(false)
    }, 300)
  }, [messages.length])

  useEffect(() => {
    if (messages.length <= 1) return
    const timer = setInterval(advance, interval)
    return () => clearInterval(timer)
  }, [advance, interval, messages.length])

  return (
    <div className="bg-cgk-navy text-center text-sm text-white py-2.5 px-4 overflow-hidden">
      <p
        className="transition-all duration-300 ease-in-out"
        style={{
          opacity: isTransitioning ? 0 : 1,
          transform: isTransitioning ? 'translateY(-100%)' : 'translateY(0)',
        }}
      >
        {messages[currentIndex]}
      </p>
    </div>
  )
}
