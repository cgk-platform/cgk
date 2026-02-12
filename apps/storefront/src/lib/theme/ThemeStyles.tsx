/**
 * ThemeStyles Component
 *
 * Server-side component that generates and injects theme CSS.
 * This is a React Server Component - no 'use client' directive.
 */

import { generateThemeCss } from './defaults'
import type { PortalThemeConfig } from './types'

interface ThemeStylesProps {
  theme: PortalThemeConfig
}

/**
 * Server-side theme CSS injection
 *
 * Generates CSS custom properties from theme configuration and
 * injects them as a style tag. This runs on the server for
 * optimal performance and SEO (no flash of unstyled content).
 */
export function ThemeStyles({ theme }: ThemeStylesProps): React.ReactElement {
  const css = generateThemeCss(theme)

  return (
    <style
      id="portal-theme-styles"
      dangerouslySetInnerHTML={{ __html: css }}
    />
  )
}

/**
 * Theme font preload links
 *
 * Generates preload links for custom fonts to improve loading performance.
 */
export function ThemeFontPreload({ theme }: ThemeStylesProps): React.ReactElement | null {
  if (!theme.customFontsUrl) {
    return null
  }

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="preload" href={theme.customFontsUrl} as="style" />
    </>
  )
}

/**
 * Theme favicon link
 *
 * Generates favicon link for custom tenant branding.
 */
export function ThemeFavicon({ theme }: ThemeStylesProps): React.ReactElement | null {
  if (!theme.faviconUrl) {
    return null
  }

  return <link rel="icon" href={theme.faviconUrl} />
}

/**
 * Complete theme head elements
 *
 * Combines all theme-related head elements for convenience.
 */
export function ThemeHead({ theme }: ThemeStylesProps): React.ReactElement {
  return (
    <>
      <ThemeFontPreload theme={theme} />
      <ThemeFavicon theme={theme} />
      <ThemeStyles theme={theme} />
    </>
  )
}
