/**
 * Social Share Buttons
 *
 * Horizontal row of share buttons for PDP.
 * Supports X/Twitter, Facebook, Pinterest, and Copy Link.
 */

'use client'

import { cn } from '@cgk-platform/ui'
import { useCallback, useState } from 'react'

interface SocialShareProps {
  url: string
  title: string
  image?: string
}

export function SocialShare({ url, title, image }: SocialShareProps) {
  const [copied, setCopied] = useState(false)

  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = url
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [url])

  const shareLinks = [
    {
      label: 'Share on X',
      href: `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      icon: (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      label: 'Share on Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      ),
    },
    {
      label: 'Share on Pinterest',
      href: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}${image ? `&media=${encodeURIComponent(image)}` : ''}`,
      icon: (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 0a12 12 0 0 0-4.37 23.17c-.1-.94-.2-2.4.04-3.44l1.4-5.96s-.37-.73-.37-1.81c0-1.7.98-2.96 2.21-2.96 1.04 0 1.54.78 1.54 1.72 0 1.05-.67 2.62-1.01 4.07-.29 1.2.6 2.18 1.79 2.18 2.15 0 3.8-2.27 3.8-5.54 0-2.9-2.08-4.92-5.06-4.92-3.45 0-5.47 2.58-5.47 5.25 0 1.04.4 2.15.9 2.76a.36.36 0 0 1 .08.35l-.34 1.36c-.05.22-.18.27-.4.16-1.5-.7-2.43-2.88-2.43-4.64 0-3.78 2.75-7.25 7.92-7.25 4.16 0 7.4 2.97 7.4 6.93 0 4.13-2.6 7.46-6.22 7.46-1.21 0-2.36-.63-2.75-1.38l-.75 2.85c-.27 1.04-1 2.35-1.49 3.15A12 12 0 1 0 12 0z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-500">Share:</span>
      {shareLinks.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-500',
            'transition-colors hover:border-cgk-navy hover:bg-cgk-navy hover:text-white'
          )}
        >
          {link.icon}
        </a>
      ))}
      <button
        type="button"
        onClick={handleCopyLink}
        aria-label={copied ? 'Link copied' : 'Copy link'}
        className={cn(
          'flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors',
          copied
            ? 'border-green-300 bg-green-50 text-green-600'
            : 'border-gray-300 text-gray-500 hover:border-cgk-navy hover:bg-cgk-navy hover:text-white'
        )}
      >
        {copied ? (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.193-5.647a4.5 4.5 0 0 0-1.242-7.244l4.5-4.5a4.5 4.5 0 0 1 6.364 6.364l-1.757 1.757" />
            </svg>
            Copy Link
          </>
        )}
      </button>
    </div>
  )
}
