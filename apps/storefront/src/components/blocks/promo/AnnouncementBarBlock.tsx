'use client'

/**
 * Announcement Bar Block Component
 *
 * Top announcement bar for site-wide notifications, promotions,
 * and important messages. Supports dismissible behavior and
 * multiple visual styles.
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, ButtonConfig } from '../types'

/**
 * Announcement item for rotating messages
 */
export interface AnnouncementItem {
  /** Announcement text */
  text: string
  /** Optional link */
  link?: ButtonConfig
  /** Icon name */
  icon?: string
}

/**
 * Announcement Bar block configuration
 */
export interface AnnouncementBarConfig {
  /** Single message or multiple rotating messages */
  messages: AnnouncementItem[]
  /** Background color */
  backgroundColor?: string
  /** Text color */
  textColor?: string
  /** Accent color for links/icons */
  accentColor?: string
  /** Visual style */
  style?: 'solid' | 'gradient' | 'animated'
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Enable dismissal */
  dismissible?: boolean
  /** Storage key for dismiss state */
  dismissKey?: string
  /** Auto-rotate interval (ms) - 0 to disable */
  rotateInterval?: number
  /** Enable marquee animation */
  marquee?: boolean
  /** Marquee speed (px/sec) */
  marqueeSpeed?: number
  /** Show close button */
  showClose?: boolean
  /** Position: fixed or relative */
  position?: 'fixed' | 'relative'
  /** Alignment */
  alignment?: 'left' | 'center' | 'right'
}

/**
 * Icon component for announcements
 */
function AnnouncementIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    sale: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zm-2.207 6.207a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
      </svg>
    ),
    shipping: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
      </svg>
    ),
    info: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    gift: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
        <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
      </svg>
    ),
    star: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ),
    clock: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
    ),
  }

  return icons[name] || icons.info
}

/**
 * Announcement Bar Block Component
 */
export function AnnouncementBarBlock({ block, className }: BlockProps<AnnouncementBarConfig>) {
  const {
    messages,
    backgroundColor,
    textColor,
    accentColor,
    style = 'solid',
    size = 'md',
    dismissible = false,
    dismissKey = 'announcement-dismissed',
    rotateInterval = 5000,
    marquee = false,
    marqueeSpeed = 50,
    showClose = true,
    position = 'relative',
    alignment = 'center',
  } = block.config

  const [isDismissed, setIsDismissed] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  // Check dismissed state on mount
  useEffect(() => {
    if (dismissible && typeof window !== 'undefined') {
      const dismissed = localStorage.getItem(dismissKey)
      if (dismissed) {
        setIsDismissed(true)
      }
    }
  }, [dismissible, dismissKey])

  // Rotate messages
  useEffect(() => {
    if (messages.length <= 1 || rotateInterval === 0 || marquee) return

    const interval = setInterval(() => {
      setIsVisible(false)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % messages.length)
        setIsVisible(true)
      }, 200)
    }, rotateInterval)

    return () => clearInterval(interval)
  }, [messages.length, rotateInterval, marquee])

  const handleDismiss = useCallback(() => {
    setIsDismissed(true)
    if (dismissible && typeof window !== 'undefined') {
      localStorage.setItem(dismissKey, 'true')
    }
  }, [dismissible, dismissKey])

  if (isDismissed || messages.length === 0) {
    return null
  }

  const currentMessage = messages[currentIndex] ?? messages[0]

  // Safety check - should never happen due to above guard
  if (!currentMessage) {
    return null
  }

  const sizeClasses = {
    sm: 'py-1.5 text-xs',
    md: 'py-2.5 text-sm',
    lg: 'py-3 text-base',
  }

  const alignmentClasses = {
    left: 'justify-start text-left',
    center: 'justify-center text-center',
    right: 'justify-end text-right',
  }

  const bgStyles = {
    solid: {
      backgroundColor: backgroundColor || 'hsl(var(--portal-primary))',
    },
    gradient: {
      background: `linear-gradient(90deg, ${backgroundColor || 'hsl(var(--portal-primary))'}, ${accentColor || 'hsl(var(--portal-accent))'})`,
    },
    animated: {
      background: `linear-gradient(90deg, ${backgroundColor || 'hsl(var(--portal-primary))'}, ${accentColor || 'hsl(var(--portal-accent))'}, ${backgroundColor || 'hsl(var(--portal-primary))'})`,
      backgroundSize: '200% 100%',
      animation: 'gradient-shift 3s linear infinite',
    },
  }

  return (
    <>
      <div
        className={cn(
          'w-full overflow-hidden',
          position === 'fixed' && 'fixed top-0 left-0 right-0 z-[100]',
          sizeClasses[size],
          className
        )}
        style={{
          ...bgStyles[style],
          color: textColor || 'hsl(var(--portal-primary-foreground))',
        }}
      >
        <div className={cn('mx-auto max-w-7xl px-4 sm:px-6', alignmentClasses[alignment])}>
          {marquee ? (
            // Marquee animation
            <div className="relative overflow-hidden">
              <div
                className="flex animate-marquee whitespace-nowrap"
                style={{
                  animationDuration: `${(messages.length * 100) / (marqueeSpeed / 10)}s`,
                }}
              >
                {[...messages, ...messages].map((msg, index) => (
                  <div
                    key={index}
                    className="mx-8 flex items-center gap-2"
                  >
                    {msg.icon && <AnnouncementIcon name={msg.icon} />}
                    <span className="font-medium">{msg.text}</span>
                    {msg.link && (
                      <Link
                        href={msg.link.href}
                        className="font-semibold underline decoration-2 underline-offset-2 hover:no-underline"
                        style={{ color: accentColor || 'inherit' }}
                        {...(msg.link.openInNewTab && { target: '_blank', rel: 'noopener noreferrer' })}
                      >
                        {msg.link.text}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Single/rotating message
            <div className="flex items-center gap-4">
              {/* Navigation dots for multiple messages */}
              {messages.length > 1 && alignment === 'center' && (
                <div className="hidden items-center gap-1 sm:flex">
                  {messages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setIsVisible(false)
                        setTimeout(() => {
                          setCurrentIndex(index)
                          setIsVisible(true)
                        }, 200)
                      }}
                      className={cn(
                        'h-1.5 w-1.5 rounded-full transition-all duration-200',
                        index === currentIndex
                          ? 'w-4 bg-current'
                          : 'bg-current/40 hover:bg-current/60'
                      )}
                      aria-label={`Go to message ${index + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Message content */}
              <div
                className={cn(
                  'flex flex-1 items-center gap-2 transition-opacity duration-200',
                  alignmentClasses[alignment],
                  isVisible ? 'opacity-100' : 'opacity-0'
                )}
              >
                {currentMessage.icon && <AnnouncementIcon name={currentMessage.icon} />}
                <span className="font-medium">{currentMessage.text}</span>
                {currentMessage.link && (
                  <Link
                    href={currentMessage.link.href}
                    className="inline-flex items-center gap-1 font-semibold underline decoration-2 underline-offset-2 hover:no-underline"
                    {...(currentMessage.link.openInNewTab && { target: '_blank', rel: 'noopener noreferrer' })}
                  >
                    {currentMessage.link.text}
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
              </div>

              {/* Close button */}
              {showClose && dismissible && (
                <button
                  onClick={handleDismiss}
                  className="ml-4 flex-shrink-0 rounded p-1 opacity-70 transition-opacity hover:opacity-100"
                  aria-label="Dismiss announcement"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 200% 50%;
          }
        }
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee linear infinite;
        }
      `}</style>
    </>
  )
}
