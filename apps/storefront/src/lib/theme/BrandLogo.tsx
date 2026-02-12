'use client'

/**
 * BrandLogo Component
 *
 * Displays the tenant's brand logo with dark mode support.
 * Falls back to text-based logo if no image is configured.
 */

import { useTheme, useIsDarkMode } from './ThemeProvider'
import Image from 'next/image'

interface BrandLogoProps {
  className?: string
  linkHref?: string
  showName?: boolean
}

/**
 * Brand logo component
 *
 * Displays:
 * - Custom logo image if configured
 * - Dark mode variant if available and dark mode is active
 * - Fallback to store name if no logo configured
 */
export function BrandLogo({
  className = '',
  linkHref = '/',
  showName = false,
}: BrandLogoProps): React.ReactElement {
  const { theme } = useTheme()
  const isDarkMode = useIsDarkMode()

  // Determine which logo to show
  const logoUrl = isDarkMode && theme.logoDarkUrl
    ? theme.logoDarkUrl
    : theme.logoUrl

  const content = logoUrl ? (
    <div className={`relative ${className}`} style={{ height: theme.logoHeight }}>
      <Image
        src={logoUrl}
        alt={`${theme.tenantId} logo`}
        height={theme.logoHeight}
        width={theme.logoHeight * 3} // Assume 3:1 aspect ratio
        style={{ height: theme.logoHeight, width: 'auto' }}
        priority
      />
      {showName && (
        <span className="sr-only">{theme.tenantId}</span>
      )}
    </div>
  ) : (
    <span
      className={`
        text-xl font-bold tracking-tight
        text-[hsl(var(--portal-foreground))]
        ${className}
      `.trim()}
    >
      {theme.tenantId}
    </span>
  )

  if (linkHref) {
    return (
      <a
        href={linkHref}
        className="inline-flex items-center focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-ring))] rounded"
      >
        {content}
      </a>
    )
  }

  return content
}

/**
 * Server-side brand logo (no dark mode switching)
 *
 * Use this in server components where useTheme is not available.
 */
interface ServerBrandLogoProps {
  theme: {
    tenantId: string
    logoUrl: string | null
    logoHeight: number
  }
  className?: string
  linkHref?: string
}

export function ServerBrandLogo({
  theme,
  className = '',
  linkHref = '/',
}: ServerBrandLogoProps): React.ReactElement {
  const content = theme.logoUrl ? (
    <div className={`relative ${className}`} style={{ height: theme.logoHeight }}>
      <Image
        src={theme.logoUrl}
        alt={`${theme.tenantId} logo`}
        height={theme.logoHeight}
        width={theme.logoHeight * 3}
        style={{ height: theme.logoHeight, width: 'auto' }}
        priority
      />
    </div>
  ) : (
    <span
      className={`
        text-xl font-bold tracking-tight
        text-[hsl(var(--portal-foreground))]
        ${className}
      `.trim()}
    >
      {theme.tenantId}
    </span>
  )

  if (linkHref) {
    return (
      <a
        href={linkHref}
        className="inline-flex items-center"
      >
        {content}
      </a>
    )
  }

  return content
}
