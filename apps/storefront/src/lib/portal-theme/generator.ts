/**
 * Portal Theme CSS Generator
 *
 * Generates CSS custom properties specifically for the customer portal.
 * Extends the base portal theme generator with portal-specific variables.
 */

import type { CustomerPortalThemeConfig, PortalSidebarConfig, PortalCardConfig, SpacingDensity } from './types'

/**
 * Spacing values by density setting
 */
const SPACING_PRESETS: Record<SpacingDensity, { card: string; section: string; gap: string }> = {
  compact: { card: '12px', section: '20px', gap: '8px' },
  normal: { card: '20px', section: '32px', gap: '16px' },
  relaxed: { card: '28px', section: '48px', gap: '24px' },
}

/**
 * Get spacing values for a density setting
 */
function getSpacingValues(density: SpacingDensity): { card: string; section: string; gap: string } {
  return SPACING_PRESETS[density] || SPACING_PRESETS.normal
}

/**
 * Convert hex to HSL format for CSS variables
 */
function hexToHSL(hex: string): string {
  const cleanHex = hex.replace('#', '')
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

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

/**
 * Generate sidebar-specific CSS variables
 */
function generateSidebarVariables(theme: CustomerPortalThemeConfig): string {
  const { sidebar } = theme
  const lines: string[] = []

  // Sidebar dimensions
  lines.push(`  --portal-sidebar-width: ${sidebar.width};`)
  lines.push(`  --portal-sidebar-collapsed-width: 64px;`)

  // Sidebar background
  const sidebarBg = theme.sidebarBackgroundColor || theme.cardBackgroundColor
  const sidebarFg = theme.sidebarForegroundColor || theme.foregroundColor
  lines.push(`  --portal-sidebar-bg: ${hexToHSL(sidebarBg)};`)
  lines.push(`  --portal-sidebar-fg: ${hexToHSL(sidebarFg)};`)

  // Active state
  const activeBg = theme.sidebarActiveColor || theme.primaryColor
  const activeFg = theme.sidebarActiveForegroundColor || '#ffffff'
  lines.push(`  --portal-sidebar-active-bg: ${hexToHSL(activeBg)};`)
  lines.push(`  --portal-sidebar-active-fg: ${hexToHSL(activeFg)};`)

  // Sidebar styling based on config
  const sidebarRadius = getSidebarRadius(sidebar.style)
  lines.push(`  --portal-sidebar-radius: ${sidebarRadius};`)

  const sidebarPadding = getSidebarPadding(sidebar.style)
  lines.push(`  --portal-sidebar-padding: ${sidebarPadding};`)

  // Background effect
  if (sidebar.backgroundMode === 'blur') {
    lines.push(`  --portal-sidebar-backdrop: blur(12px);`)
    lines.push(`  --portal-sidebar-bg-opacity: 0.85;`)
  } else if (sidebar.backgroundMode === 'transparent') {
    lines.push(`  --portal-sidebar-backdrop: none;`)
    lines.push(`  --portal-sidebar-bg-opacity: 0;`)
  } else {
    lines.push(`  --portal-sidebar-backdrop: none;`)
    lines.push(`  --portal-sidebar-bg-opacity: 1;`)
  }

  return lines.join('\n')
}

/**
 * Get sidebar border radius based on style
 */
function getSidebarRadius(style: PortalSidebarConfig['style']): string {
  switch (style) {
    case 'floating':
      return '16px'
    case 'minimal':
      return '0px'
    case 'attached':
    default:
      return '0px'
  }
}

/**
 * Get sidebar padding based on style
 */
function getSidebarPadding(style: PortalSidebarConfig['style']): string {
  switch (style) {
    case 'floating':
      return '16px'
    case 'minimal':
      return '8px'
    case 'attached':
    default:
      return '12px'
  }
}

/**
 * Generate header-specific CSS variables
 */
function generateHeaderVariables(theme: CustomerPortalThemeConfig): string {
  const { header } = theme
  const lines: string[] = []

  lines.push(`  --portal-header-height: ${header.height};`)

  // Header background
  const headerBg = theme.headerBackgroundColor || theme.cardBackgroundColor
  const headerFg = theme.headerForegroundColor || theme.foregroundColor
  lines.push(`  --portal-header-bg: ${hexToHSL(headerBg)};`)
  lines.push(`  --portal-header-fg: ${hexToHSL(headerFg)};`)

  // Background effect
  if (header.backgroundMode === 'blur') {
    lines.push(`  --portal-header-backdrop: blur(12px);`)
    lines.push(`  --portal-header-bg-opacity: 0.85;`)
  } else if (header.backgroundMode === 'transparent') {
    lines.push(`  --portal-header-backdrop: none;`)
    lines.push(`  --portal-header-bg-opacity: 0;`)
  } else {
    lines.push(`  --portal-header-backdrop: none;`)
    lines.push(`  --portal-header-bg-opacity: 1;`)
  }

  return lines.join('\n')
}

/**
 * Generate card-specific CSS variables
 */
function generateCardVariables(theme: CustomerPortalThemeConfig): string {
  const { card } = theme
  const lines: string[] = []

  // Card shadow based on style and intensity
  const shadow = getCardShadow(card)
  lines.push(`  --portal-card-shadow: ${shadow};`)
  lines.push(`  --portal-card-shadow-hover: ${getCardHoverShadow(card)};`)

  // Card border
  lines.push(`  --portal-card-border-width: ${card.borderWidth};`)

  // Card hover transform
  const hoverTransform = card.hoverEffect === 'lift' ? 'translateY(-2px)' : 'none'
  lines.push(`  --portal-card-hover-transform: ${hoverTransform};`)

  return lines.join('\n')
}

/**
 * Get card shadow based on configuration
 */
function getCardShadow(card: PortalCardConfig): string {
  if (card.style === 'flat' || card.shadowIntensity === 0) {
    return 'none'
  }

  const intensity = card.shadowIntensity / 100
  const yOffset = Math.round(2 + intensity * 8)
  const blur = Math.round(8 + intensity * 24)
  const spread = Math.round(-2 + intensity * 2)
  const opacity = (0.04 + intensity * 0.08).toFixed(2)

  return `0 ${yOffset}px ${blur}px ${spread}px rgba(0, 0, 0, ${opacity})`
}

/**
 * Get card hover shadow
 */
function getCardHoverShadow(card: PortalCardConfig): string {
  if (card.hoverEffect === 'none' || card.style === 'flat') {
    return 'none'
  }

  if (card.hoverEffect === 'glow') {
    return '0 0 24px -4px hsl(var(--portal-primary) / 0.3)'
  }

  const intensity = (card.shadowIntensity + 10) / 100
  const yOffset = Math.round(4 + intensity * 12)
  const blur = Math.round(16 + intensity * 32)
  const spread = Math.round(-2 + intensity * 4)
  const opacity = (0.06 + intensity * 0.1).toFixed(2)

  return `0 ${yOffset}px ${blur}px ${spread}px rgba(0, 0, 0, ${opacity})`
}

/**
 * Generate spacing CSS variables
 */
function generateSpacingVariables(theme: CustomerPortalThemeConfig): string {
  const lines: string[] = []

  lines.push(`  --portal-page-gap: ${theme.pageGap};`)
  lines.push(`  --portal-section-gap: ${theme.sectionGap};`)
  lines.push(`  --portal-card-gap: ${theme.cardGap};`)

  return lines.join('\n')
}

/**
 * Generate nav item CSS variables
 */
function generateNavVariables(theme: CustomerPortalThemeConfig): string {
  const { sidebar } = theme
  const lines: string[] = []

  // Active indicator styles
  switch (sidebar.activeIndicator) {
    case 'bar':
      lines.push(`  --portal-nav-active-indicator: 3px solid hsl(var(--portal-sidebar-active-bg));`)
      lines.push(`  --portal-nav-active-indicator-position: left;`)
      lines.push(`  --portal-nav-item-active-bg: transparent;`)
      break
    case 'dot':
      lines.push(`  --portal-nav-active-indicator: none;`)
      lines.push(`  --portal-nav-active-indicator-position: none;`)
      lines.push(`  --portal-nav-item-active-bg: transparent;`)
      break
    case 'fill':
      lines.push(`  --portal-nav-active-indicator: none;`)
      lines.push(`  --portal-nav-active-indicator-position: none;`)
      lines.push(`  --portal-nav-item-active-bg: hsl(var(--portal-sidebar-active-bg));`)
      break
    case 'none':
    default:
      lines.push(`  --portal-nav-active-indicator: none;`)
      lines.push(`  --portal-nav-active-indicator-position: none;`)
      lines.push(`  --portal-nav-item-active-bg: transparent;`)
  }

  return lines.join('\n')
}

/**
 * Generate button CSS variables
 */
function generateButtonVariables(theme: CustomerPortalThemeConfig): string {
  const { button } = theme
  const lines: string[] = []

  lines.push(`  --portal-button-font-weight: ${button.fontWeight};`)
  lines.push(`  --portal-button-letter-spacing: ${button.letterSpacing};`)
  lines.push(`  --portal-button-text-transform: ${button.textTransform};`)

  // Size-based padding
  const sizePadding = {
    sm: '8px 12px',
    md: '10px 16px',
    lg: '14px 24px',
  }
  lines.push(`  --portal-button-padding: ${sizePadding[button.defaultSize]};`)

  return lines.join('\n')
}

/**
 * Generate base theme CSS variables
 */
function generateBaseThemeCss(theme: CustomerPortalThemeConfig): string {
  const spacing = getSpacingValues(theme.spacing)
  const headingFont = theme.headingFontFamily || theme.fontFamily

  return `
:root {
  /* Base Colors */
  --portal-primary: ${hexToHSL(theme.primaryColor)};
  --portal-primary-foreground: 0 0% 100%;
  --portal-secondary: ${hexToHSL(theme.secondaryColor)};
  --portal-secondary-foreground: 0 0% 100%;
  --portal-background: ${hexToHSL(theme.backgroundColor)};
  --portal-foreground: ${hexToHSL(theme.foregroundColor)};
  --portal-card: ${hexToHSL(theme.cardBackgroundColor)};
  --portal-card-foreground: ${hexToHSL(theme.foregroundColor)};
  --portal-border: ${hexToHSL(theme.borderColor)};
  --portal-muted: ${hexToHSL(theme.backgroundColor)};
  --portal-muted-foreground: ${hexToHSL(theme.mutedForegroundColor)};
  --portal-accent: ${hexToHSL(theme.accentColor)};
  --portal-accent-foreground: 0 0% 100%;
  --portal-destructive: ${hexToHSL(theme.errorColor)};
  --portal-destructive-foreground: 0 0% 100%;
  --portal-success: ${hexToHSL(theme.successColor)};
  --portal-success-foreground: 0 0% 100%;
  --portal-warning: ${hexToHSL(theme.warningColor)};
  --portal-warning-foreground: 0 0% 0%;
  --portal-ring: ${hexToHSL(theme.primaryColor)};
  --portal-input: ${hexToHSL(theme.borderColor)};

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

  /* Logo */
  --portal-logo-height: ${theme.logoHeight}px;
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
`
}

/**
 * Generate complete portal theme CSS
 *
 * This generates portal-specific CSS that extends the base theme.
 */
export function generatePortalThemeCss(theme: CustomerPortalThemeConfig): string {
  // Start with base theme CSS
  const baseCss = generateBaseThemeCss(theme)

  // Add portal-specific variables
  const portalVars = [
    '/* Portal Sidebar */',
    generateSidebarVariables(theme),
    '',
    '/* Portal Header */',
    generateHeaderVariables(theme),
    '',
    '/* Portal Cards */',
    generateCardVariables(theme),
    '',
    '/* Portal Navigation */',
    generateNavVariables(theme),
    '',
    '/* Portal Buttons */',
    generateButtonVariables(theme),
    '',
    '/* Portal Spacing */',
    generateSpacingVariables(theme),
  ].join('\n')

  // Portal-specific component styles
  const componentStyles = `
/* Portal Shell Layout */
.portal-shell {
  display: flex;
  min-height: 100vh;
  background: hsl(var(--portal-background));
}

/* Portal Sidebar */
.portal-sidebar {
  width: var(--portal-sidebar-width);
  background: hsl(var(--portal-sidebar-bg) / var(--portal-sidebar-bg-opacity));
  backdrop-filter: var(--portal-sidebar-backdrop);
  -webkit-backdrop-filter: var(--portal-sidebar-backdrop);
  border-radius: var(--portal-sidebar-radius);
  padding: var(--portal-sidebar-padding);
  transition: width 200ms ease, transform 200ms ease;
}

.portal-sidebar--floating {
  margin: 16px;
  height: calc(100vh - 32px);
  position: sticky;
  top: 16px;
}

.portal-sidebar--attached {
  border-right: 1px solid hsl(var(--portal-border));
}

/* Portal Header */
.portal-header {
  height: var(--portal-header-height);
  background: hsl(var(--portal-header-bg) / var(--portal-header-bg-opacity));
  backdrop-filter: var(--portal-header-backdrop);
  -webkit-backdrop-filter: var(--portal-header-backdrop);
  display: flex;
  align-items: center;
  padding: 0 24px;
}

.portal-header--sticky {
  position: sticky;
  top: 0;
  z-index: 40;
}

.portal-header--bordered {
  border-bottom: 1px solid hsl(var(--portal-border));
}

/* Portal Navigation Items */
.portal-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--portal-card-radius);
  color: hsl(var(--portal-sidebar-fg));
  font-weight: var(--portal-font-weight-medium);
  transition: all 150ms ease;
  position: relative;
}

.portal-nav-item:hover {
  background: hsl(var(--portal-muted));
}

.portal-nav-item--active {
  background: var(--portal-nav-item-active-bg);
  color: hsl(var(--portal-sidebar-active-fg));
  border-left: var(--portal-nav-active-indicator);
}

/* Portal Cards */
.portal-card {
  background: hsl(var(--portal-card));
  border-radius: var(--portal-card-radius);
  padding: var(--portal-card-padding);
  box-shadow: var(--portal-card-shadow);
  border: var(--portal-card-border-width) solid hsl(var(--portal-border));
  transition: box-shadow 200ms ease, transform 200ms ease, border-color 200ms ease;
}

.portal-card:hover {
  box-shadow: var(--portal-card-shadow-hover);
  transform: var(--portal-card-hover-transform);
}

.portal-card--flat {
  box-shadow: none;
  border: none;
}

.portal-card--outlined {
  box-shadow: none;
}

.portal-card--outlined:hover {
  border-color: hsl(var(--portal-primary));
}

/* Portal Content Area */
.portal-content {
  flex: 1;
  padding: var(--portal-page-gap);
  max-width: var(--portal-max-width);
  margin: 0 auto;
  width: 100%;
}

/* Portal Section */
.portal-section {
  margin-bottom: var(--portal-section-gap);
}

.portal-section:last-child {
  margin-bottom: 0;
}

/* Portal Button */
.portal-button {
  font-weight: var(--portal-button-font-weight);
  letter-spacing: var(--portal-button-letter-spacing);
  text-transform: var(--portal-button-text-transform);
  padding: var(--portal-button-padding);
  border-radius: var(--portal-button-radius);
  transition: all 150ms ease;
}

/* Portal Empty State */
.portal-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.portal-empty-state-icon {
  color: hsl(var(--portal-muted-foreground));
  margin-bottom: 16px;
}

/* Portal Loading */
.portal-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  color: hsl(var(--portal-muted-foreground));
}

/* Responsive - Mobile */
@media (max-width: 1024px) {
  .portal-sidebar {
    position: fixed;
    left: 0;
    top: 0;
    height: 100vh;
    z-index: 50;
    transform: translateX(-100%);
  }

  .portal-sidebar--open {
    transform: translateX(0);
  }

  .portal-sidebar--floating {
    margin: 0;
    height: 100vh;
    border-radius: 0 16px 16px 0;
  }

  .portal-content {
    padding: 16px;
  }
}
`

  // Combine all CSS
  return `${baseCss}

:root {
${portalVars}
}

${componentStyles}

${theme.customCss || ''}
`
}

/**
 * Generate inline style object for SSR
 */
export function generatePortalStyleObject(
  theme: CustomerPortalThemeConfig
): Record<string, string> {
  return {
    '--portal-sidebar-width': theme.sidebar.width,
    '--portal-header-height': theme.header.height,
    '--portal-page-gap': theme.pageGap,
    '--portal-section-gap': theme.sectionGap,
    '--portal-card-gap': theme.cardGap,
  }
}
