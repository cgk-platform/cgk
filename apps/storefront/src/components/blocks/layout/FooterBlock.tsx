'use client'

/**
 * Footer Block Component
 *
 * Site footer with logo, navigation columns, social links,
 * newsletter signup, and legal links.
 */

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@cgk-platform/ui'
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Music2,
  Pin,
  Send,
  Loader2,
} from 'lucide-react'
import type { BlockProps, FooterBlockConfig, SocialLink } from '../types'

/**
 * Social icon mapping
 */
const socialIcons: Record<SocialLink['platform'], React.ElementType> = {
  facebook: Facebook,
  twitter: Twitter,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: Music2,
  pinterest: Pin,
}

/**
 * Newsletter form component
 */
function NewsletterForm({
  headline,
  description,
}: {
  headline?: string
  description?: string
}) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setStatus('loading')

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setStatus('success')
    setEmail('')

    // Reset after 3 seconds
    setTimeout(() => setStatus('idle'), 3000)
  }

  return (
    <div className="max-w-md">
      {headline && (
        <h3 className="text-lg font-semibold text-[hsl(var(--portal-foreground))]">
          {headline}
        </h3>
      )}
      {description && (
        <p className="mt-2 text-sm text-[hsl(var(--portal-muted-foreground))]">
          {description}
        </p>
      )}
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className={cn(
              'flex-1 rounded-lg border px-4 py-2.5',
              'border-[hsl(var(--portal-border))]',
              'bg-[hsl(var(--portal-background))]',
              'text-[hsl(var(--portal-foreground))]',
              'placeholder:text-[hsl(var(--portal-muted-foreground))]',
              'focus:border-[hsl(var(--portal-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-primary))]/20',
              'transition-colors duration-150'
            )}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className={cn(
              'rounded-lg px-5 py-2.5',
              'bg-[hsl(var(--portal-primary))] text-white',
              'hover:bg-[hsl(var(--portal-primary))]/90',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors duration-150',
              'flex items-center gap-2'
            )}
          >
            {status === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Subscribe</span>
          </button>
        </div>
        {status === 'success' && (
          <p className="mt-2 text-sm text-green-600">
            Thanks for subscribing!
          </p>
        )}
        {status === 'error' && (
          <p className="mt-2 text-sm text-red-600">
            Something went wrong. Please try again.
          </p>
        )}
      </form>
    </div>
  )
}

/**
 * Footer Block Component
 */
export function FooterBlock({ block, className }: BlockProps<FooterBlockConfig>) {
  const {
    logo,
    logoText = 'Store',
    description,
    columns = [],
    socialLinks = [],
    showNewsletter = false,
    newsletterHeadline = 'Subscribe to our newsletter',
    newsletterDescription = 'Get the latest updates and offers.',
    copyrightText = '{year} All rights reserved.',
    legalLinks = [],
    backgroundColor,
    textColor,
  } = block.config

  const currentYear = new Date().getFullYear()
  const formattedCopyright = copyrightText.replace('{year}', String(currentYear))

  const footerStyle: React.CSSProperties = {
    backgroundColor,
    color: textColor,
  }

  return (
    <footer
      className={cn(
        'border-t border-[hsl(var(--portal-border))]',
        'bg-[hsl(var(--portal-card))]',
        className
      )}
      style={footerStyle}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {/* Main Footer Content */}
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand Column */}
          <div className="lg:col-span-4">
            {/* Logo */}
            <div className="mb-4">
              <Link href="/" className="inline-flex items-center">
                {logo?.src ? (
                  <Image
                    src={logo.src}
                    alt={logo.alt || logoText}
                    width={logo.width || 150}
                    height={logo.height || 40}
                    className="h-8 w-auto"
                  />
                ) : (
                  <span className="text-xl font-bold text-[hsl(var(--portal-foreground))]">
                    {logoText}
                  </span>
                )}
              </Link>
            </div>

            {/* Description */}
            {description && (
              <p className="max-w-xs text-sm leading-relaxed text-[hsl(var(--portal-muted-foreground))]">
                {description}
              </p>
            )}

            {/* Social Links */}
            {socialLinks.length > 0 && (
              <div className="mt-6 flex items-center gap-3">
                {socialLinks.map((social, idx) => {
                  const IconComponent = socialIcons[social.platform]
                  return (
                    <a
                      key={idx}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full',
                        'bg-[hsl(var(--portal-muted))]',
                        'text-[hsl(var(--portal-muted-foreground))]',
                        'hover:bg-[hsl(var(--portal-primary))] hover:text-white',
                        'transition-colors duration-200'
                      )}
                      aria-label={social.platform}
                    >
                      <IconComponent className="h-5 w-5" />
                    </a>
                  )
                })}
              </div>
            )}
          </div>

          {/* Navigation Columns */}
          <div className="lg:col-span-8">
            <div
              className={cn(
                'grid gap-8 sm:gap-12',
                columns.length === 1 && 'sm:grid-cols-1',
                columns.length === 2 && 'sm:grid-cols-2',
                columns.length === 3 && 'sm:grid-cols-3',
                columns.length >= 4 && 'sm:grid-cols-2 lg:grid-cols-4'
              )}
            >
              {columns.map((column, colIdx) => (
                <div key={colIdx}>
                  <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[hsl(var(--portal-foreground))]">
                    {column.title}
                  </h4>
                  <ul className="space-y-3">
                    {column.links.map((link, linkIdx) => (
                      <li key={linkIdx}>
                        <Link
                          href={link.href}
                          className={cn(
                            'text-sm text-[hsl(var(--portal-muted-foreground))]',
                            'hover:text-[hsl(var(--portal-foreground))]',
                            'transition-colors duration-150'
                          )}
                          {...(link.openInNewTab && {
                            target: '_blank',
                            rel: 'noopener noreferrer',
                          })}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* Newsletter Column */}
              {showNewsletter && (
                <div className={columns.length > 0 ? 'sm:col-span-2 lg:col-span-2' : ''}>
                  <NewsletterForm
                    headline={newsletterHeadline}
                    description={newsletterDescription}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          className={cn(
            'mt-12 pt-8',
            'border-t border-[hsl(var(--portal-border))]',
            'flex flex-col items-center justify-between gap-4 sm:flex-row'
          )}
        >
          {/* Copyright */}
          <p className="text-sm text-[hsl(var(--portal-muted-foreground))]">
            &copy; {formattedCopyright}
          </p>

          {/* Legal Links */}
          {legalLinks.length > 0 && (
            <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              {legalLinks.map((link, idx) => (
                <Link
                  key={idx}
                  href={link.href}
                  className={cn(
                    'text-sm text-[hsl(var(--portal-muted-foreground))]',
                    'hover:text-[hsl(var(--portal-foreground))]',
                    'transition-colors duration-150'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </footer>
  )
}
