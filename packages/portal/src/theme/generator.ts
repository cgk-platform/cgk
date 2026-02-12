/**
 * Theme CSS Generator
 *
 * Generates CSS custom properties from theme configuration.
 * Supports light/dark mode with automatic color derivation.
 */

import type { PortalThemeConfig, SpacingValues } from './types.js'
import { DEFAULT_DARK_COLORS, getSpacingValues } from './defaults.js'

/**
 * Convert hex color to HSL values for CSS variables
 * This enables opacity modifiers in Tailwind (e.g., bg-primary/50)
 */
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Remove # if present
  const cleanHex = hex.replace('#', '')

  // Parse RGB values
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

/**
 * Format HSL for CSS variable (without hsl() wrapper for Tailwind)
 */
function formatHSL(hex: string): string {
  const { h, s, l } = hexToHSL(hex)
  return `${h} ${s}% ${l}%`
}

/**
 * Adjust color lightness for derived colors
 */
function adjustLightness(hex: string, amount: number): string {
  const { h, s, l } = hexToHSL(hex)
  const newL = Math.max(0, Math.min(100, l + amount))
  return `${h} ${s}% ${newL}%`
}

/**
 * Generate CSS custom properties from theme configuration
 */
export function generateThemeCss(theme: PortalThemeConfig): string {
  const spacing = getSpacingValues(theme.spacing)

  // Light mode variables
  const lightModeVars = generateColorVariables(theme, false)

  // Dark mode variables (if enabled)
  const darkModeVars = theme.darkModeEnabled
    ? generateColorVariables(theme, true)
    : ''

  // Common variables (don't change between light/dark)
  const commonVars = generateCommonVariables(theme, spacing)

  // Font import (if custom fonts URL provided)
  const fontImport = theme.customFontsUrl
    ? `@import url('${theme.customFontsUrl}');`
    : ''

  return `
${fontImport}

:root {
  /* Portal Theme - Light Mode */
${lightModeVars}

  /* Common Variables */
${commonVars}
}

${
  theme.darkModeEnabled
    ? `
.dark, [data-theme="dark"] {
  /* Portal Theme - Dark Mode */
${darkModeVars}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* Auto Dark Mode */
${darkModeVars}
  }
}
`
    : ''
}

/* Base Styles */
body {
  font-family: var(--portal-font-family);
  font-size: var(--portal-font-size);
  line-height: var(--portal-line-height);
  background-color: hsl(var(--portal-background));
  color: hsl(var(--portal-foreground));
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--portal-heading-font);
  line-height: var(--portal-heading-line-height);
}

${theme.customCss || ''}
`.trim()
}

/**
 * Generate color CSS variables
 */
function generateColorVariables(theme: PortalThemeConfig, isDark: boolean): string {
  if (isDark) {
    // Use dark mode overrides or derive from defaults
    const bg = theme.darkBackgroundColor || DEFAULT_DARK_COLORS.backgroundColor
    const cardBg = theme.darkCardBackgroundColor || DEFAULT_DARK_COLORS.cardBackgroundColor
    const border = theme.darkBorderColor || DEFAULT_DARK_COLORS.borderColor
    const fg = theme.darkForegroundColor || DEFAULT_DARK_COLORS.foregroundColor
    const mutedFg = theme.darkMutedForegroundColor || DEFAULT_DARK_COLORS.mutedForegroundColor
    const primary = theme.darkPrimaryColor || theme.primaryColor
    const secondary = theme.darkSecondaryColor || theme.secondaryColor

    return `
  --portal-primary: ${formatHSL(primary)};
  --portal-primary-foreground: ${adjustLightness(primary, primary > '#888888' ? -40 : 40)};
  --portal-secondary: ${formatHSL(secondary)};
  --portal-secondary-foreground: ${adjustLightness(secondary, secondary > '#888888' ? -40 : 40)};
  --portal-background: ${formatHSL(bg)};
  --portal-foreground: ${formatHSL(fg)};
  --portal-card: ${formatHSL(cardBg)};
  --portal-card-foreground: ${formatHSL(fg)};
  --portal-border: ${formatHSL(border)};
  --portal-muted: ${adjustLightness(cardBg, 5)};
  --portal-muted-foreground: ${formatHSL(mutedFg)};
  --portal-accent: ${formatHSL(theme.accentColor)};
  --portal-accent-foreground: ${adjustLightness(theme.accentColor, 40)};
  --portal-destructive: ${formatHSL(theme.errorColor)};
  --portal-destructive-foreground: 0 0% 100%;
  --portal-success: ${formatHSL(theme.successColor)};
  --portal-success-foreground: 0 0% 100%;
  --portal-warning: ${formatHSL(theme.warningColor)};
  --portal-warning-foreground: 0 0% 0%;
  --portal-ring: ${formatHSL(primary)};
  --portal-input: ${formatHSL(border)};`
  }

  // Light mode
  return `
  --portal-primary: ${formatHSL(theme.primaryColor)};
  --portal-primary-foreground: 0 0% 100%;
  --portal-secondary: ${formatHSL(theme.secondaryColor)};
  --portal-secondary-foreground: 0 0% 100%;
  --portal-background: ${formatHSL(theme.backgroundColor)};
  --portal-foreground: ${formatHSL(theme.foregroundColor)};
  --portal-card: ${formatHSL(theme.cardBackgroundColor)};
  --portal-card-foreground: ${formatHSL(theme.foregroundColor)};
  --portal-border: ${formatHSL(theme.borderColor)};
  --portal-muted: ${adjustLightness(theme.backgroundColor, -5)};
  --portal-muted-foreground: ${formatHSL(theme.mutedForegroundColor)};
  --portal-accent: ${formatHSL(theme.accentColor)};
  --portal-accent-foreground: 0 0% 100%;
  --portal-destructive: ${formatHSL(theme.errorColor)};
  --portal-destructive-foreground: 0 0% 100%;
  --portal-success: ${formatHSL(theme.successColor)};
  --portal-success-foreground: 0 0% 100%;
  --portal-warning: ${formatHSL(theme.warningColor)};
  --portal-warning-foreground: 0 0% 0%;
  --portal-ring: ${formatHSL(theme.primaryColor)};
  --portal-input: ${formatHSL(theme.borderColor)};`
}

/**
 * Generate common (non-color) CSS variables
 */
function generateCommonVariables(theme: PortalThemeConfig, spacing: SpacingValues): string {
  const headingFont = theme.headingFontFamily || theme.fontFamily

  return `
  /* Typography */
  --portal-font-family: ${theme.fontFamily};
  --portal-heading-font: ${headingFont};
  --portal-font-size: ${theme.baseFontSize}px;
  --portal-line-height: ${theme.lineHeight};
  --portal-heading-line-height: ${theme.headingLineHeight};
  --portal-font-weight-normal: ${theme.fontWeightNormal};
  --portal-font-weight-medium: ${theme.fontWeightMedium};
  --portal-font-weight-bold: ${theme.fontWeightBold};

  /* Layout */
  --portal-max-width: ${theme.maxContentWidth};
  --portal-card-radius: ${theme.cardBorderRadius};
  --portal-button-radius: ${theme.buttonBorderRadius};
  --portal-input-radius: ${theme.inputBorderRadius};
  --portal-radius: ${theme.cardBorderRadius};

  /* Spacing */
  --portal-card-padding: ${spacing.card};
  --portal-section-gap: ${spacing.section};
  --portal-gap: ${spacing.gap};
  --portal-button-padding: ${spacing.buttonPadding};
  --portal-input-padding: ${spacing.inputPadding};

  /* Logo */
  --portal-logo-height: ${theme.logoHeight}px;`
}

/**
 * Generate inline style object for React components
 * Useful for server-side rendering without style tags
 */
export function generateThemeStyleObject(
  theme: PortalThemeConfig
): Record<string, string> {
  const spacing = getSpacingValues(theme.spacing)
  const headingFont = theme.headingFontFamily || theme.fontFamily

  return {
    '--portal-primary': formatHSL(theme.primaryColor),
    '--portal-primary-foreground': '0 0% 100%',
    '--portal-secondary': formatHSL(theme.secondaryColor),
    '--portal-secondary-foreground': '0 0% 100%',
    '--portal-background': formatHSL(theme.backgroundColor),
    '--portal-foreground': formatHSL(theme.foregroundColor),
    '--portal-card': formatHSL(theme.cardBackgroundColor),
    '--portal-card-foreground': formatHSL(theme.foregroundColor),
    '--portal-border': formatHSL(theme.borderColor),
    '--portal-muted': adjustLightness(theme.backgroundColor, -5),
    '--portal-muted-foreground': formatHSL(theme.mutedForegroundColor),
    '--portal-accent': formatHSL(theme.accentColor),
    '--portal-accent-foreground': '0 0% 100%',
    '--portal-destructive': formatHSL(theme.errorColor),
    '--portal-destructive-foreground': '0 0% 100%',
    '--portal-success': formatHSL(theme.successColor),
    '--portal-success-foreground': '0 0% 100%',
    '--portal-warning': formatHSL(theme.warningColor),
    '--portal-warning-foreground': '0 0% 0%',
    '--portal-ring': formatHSL(theme.primaryColor),
    '--portal-input': formatHSL(theme.borderColor),
    '--portal-font-family': theme.fontFamily,
    '--portal-heading-font': headingFont,
    '--portal-font-size': `${theme.baseFontSize}px`,
    '--portal-line-height': String(theme.lineHeight),
    '--portal-heading-line-height': String(theme.headingLineHeight),
    '--portal-max-width': theme.maxContentWidth,
    '--portal-card-radius': theme.cardBorderRadius,
    '--portal-button-radius': theme.buttonBorderRadius,
    '--portal-input-radius': theme.inputBorderRadius,
    '--portal-radius': theme.cardBorderRadius,
    '--portal-card-padding': spacing.card,
    '--portal-section-gap': spacing.section,
    '--portal-gap': spacing.gap,
    '--portal-logo-height': `${theme.logoHeight}px`,
  }
}
