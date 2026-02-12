/**
 * Storefront Theme Defaults
 *
 * Self-contained defaults for storefront-specific settings.
 * Provides sensible defaults for headers, footers, and store configuration.
 */

import type {
  StorefrontThemeConfig,
  StorefrontHeaderConfig,
  StorefrontFooterConfig,
  PortalThemeConfig,
  SpacingDensity,
  SpacingValues,
} from './types'

/**
 * Default portal theme values
 * Based on RAWDOG design system with neutral, professional palette
 */
export const DEFAULT_PORTAL_THEME: Omit<PortalThemeConfig, 'tenantId'> = {
  // Colors - Light mode base
  primaryColor: '#374d42',
  secondaryColor: '#828282',
  backgroundColor: '#f5f5f4',
  cardBackgroundColor: '#ffffff',
  borderColor: '#e5e5e5',
  accentColor: '#374d42',
  errorColor: '#dc2626',
  successColor: '#16a34a',
  warningColor: '#ca8a04',

  // Colors - Text
  foregroundColor: '#171717',
  mutedForegroundColor: '#737373',

  // Typography
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  headingFontFamily: null,
  baseFontSize: 16,
  lineHeight: 1.5,
  headingLineHeight: 1.2,
  fontWeightNormal: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,

  // Layout
  maxContentWidth: '1200px',
  cardBorderRadius: '8px',
  buttonBorderRadius: '6px',
  inputBorderRadius: '6px',
  spacing: 'normal',

  // Branding
  logoUrl: null,
  logoHeight: 40,
  logoDarkUrl: null,
  faviconUrl: null,

  // Dark mode
  darkModeEnabled: false,
  darkModeDefault: false,

  // Dark mode colors
  darkPrimaryColor: null,
  darkSecondaryColor: null,
  darkBackgroundColor: null,
  darkCardBackgroundColor: null,
  darkBorderColor: null,
  darkForegroundColor: null,
  darkMutedForegroundColor: null,

  // Advanced
  customCss: null,
  customFontsUrl: null,
}

/**
 * Spacing values by density setting
 */
export const SPACING_PRESETS: Record<SpacingDensity, SpacingValues> = {
  compact: {
    card: '12px',
    section: '20px',
    gap: '8px',
    buttonPadding: '8px 12px',
    inputPadding: '8px 10px',
  },
  normal: {
    card: '20px',
    section: '32px',
    gap: '16px',
    buttonPadding: '10px 16px',
    inputPadding: '10px 14px',
  },
  relaxed: {
    card: '28px',
    section: '48px',
    gap: '24px',
    buttonPadding: '14px 24px',
    inputPadding: '14px 18px',
  },
}

/**
 * Default dark mode colors
 */
export const DEFAULT_DARK_COLORS = {
  backgroundColor: '#0a0a0a',
  cardBackgroundColor: '#171717',
  borderColor: '#262626',
  foregroundColor: '#fafafa',
  mutedForegroundColor: '#a3a3a3',
}

/**
 * Get spacing values for a density setting
 */
export function getSpacingValues(density: SpacingDensity): SpacingValues {
  return SPACING_PRESETS[density] || SPACING_PRESETS.normal
}

/**
 * Create a minimal theme with required overrides
 */
export function createTheme(
  tenantId: string,
  overrides: Partial<Omit<PortalThemeConfig, 'tenantId'>> = {}
): PortalThemeConfig {
  return {
    ...DEFAULT_PORTAL_THEME,
    ...overrides,
    tenantId,
  }
}

/**
 * Generate CSS variables string from theme config
 */
export function generateThemeCss(theme: PortalThemeConfig): string {
  const spacingVals = getSpacingValues(theme.spacing)

  const cssVars = `
    --portal-primary: ${theme.primaryColor};
    --portal-secondary: ${theme.secondaryColor};
    --portal-background: ${theme.backgroundColor};
    --portal-card-background: ${theme.cardBackgroundColor};
    --portal-border: ${theme.borderColor};
    --portal-accent: ${theme.accentColor};
    --portal-error: ${theme.errorColor};
    --portal-success: ${theme.successColor};
    --portal-warning: ${theme.warningColor};
    --portal-foreground: ${theme.foregroundColor};
    --portal-muted-foreground: ${theme.mutedForegroundColor};
    --portal-font-family: ${theme.fontFamily};
    --portal-heading-font-family: ${theme.headingFontFamily || theme.fontFamily};
    --portal-base-font-size: ${theme.baseFontSize}px;
    --portal-line-height: ${theme.lineHeight};
    --portal-heading-line-height: ${theme.headingLineHeight};
    --portal-font-weight-normal: ${theme.fontWeightNormal};
    --portal-font-weight-medium: ${theme.fontWeightMedium};
    --portal-font-weight-bold: ${theme.fontWeightBold};
    --portal-max-width: ${theme.maxContentWidth};
    --portal-card-radius: ${theme.cardBorderRadius};
    --portal-button-radius: ${theme.buttonBorderRadius};
    --portal-input-radius: ${theme.inputBorderRadius};
    --portal-spacing-card: ${spacingVals.card};
    --portal-spacing-section: ${spacingVals.section};
    --portal-spacing-gap: ${spacingVals.gap};
    --portal-button-padding: ${spacingVals.buttonPadding};
    --portal-input-padding: ${spacingVals.inputPadding};
    --portal-logo-height: ${theme.logoHeight}px;
  `.trim()

  return `:root {\n  ${cssVars}\n}`
}

/**
 * Load theme for SSR (returns default for now)
 */
export async function loadThemeForSSR(tenantSlug: string): Promise<PortalThemeConfig> {
  // For now, return default theme. In production, this would load from DB.
  return createTheme(tenantSlug)
}

/**
 * Default header configuration
 */
export const DEFAULT_HEADER: StorefrontHeaderConfig = {
  style: 'standard',
  background: 'solid',
  showAnnouncementBar: false,
  sticky: true,
  navLinks: [
    { label: 'Products', href: '/products' },
    { label: 'Collections', href: '/collections' },
  ],
}

/**
 * Default footer configuration
 */
export const DEFAULT_FOOTER: StorefrontFooterConfig = {
  style: 'standard',
  showNewsletter: true,
  newsletterHeading: 'Stay in the loop',
  newsletterDescription: 'Subscribe to get updates on new products and exclusive offers.',
  showSocialLinks: true,
  columns: [
    {
      title: 'Shop',
      links: [
        { label: 'All Products', href: '/products' },
        { label: 'Collections', href: '/collections' },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'Contact Us', href: '/contact' },
        { label: 'FAQ', href: '/faq' },
        { label: 'Shipping', href: '/shipping' },
        { label: 'Returns', href: '/returns' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
      ],
    },
  ],
}

/**
 * Default storefront theme configuration
 * Extends portal theme with storefront-specific settings
 */
export const DEFAULT_STOREFRONT_THEME: StorefrontThemeConfig = {
  ...DEFAULT_PORTAL_THEME,
  tenantId: 'default',
  header: DEFAULT_HEADER,
  footer: DEFAULT_FOOTER,
  storeName: 'Store',
  showDarkModeToggle: true,
}

/**
 * Merge partial theme with defaults
 */
export function mergeStorefrontTheme(
  partial: Partial<StorefrontThemeConfig>
): StorefrontThemeConfig {
  return {
    ...DEFAULT_STOREFRONT_THEME,
    ...partial,
    header: {
      ...DEFAULT_HEADER,
      ...(partial.header || {}),
      navLinks: partial.header?.navLinks || DEFAULT_HEADER.navLinks,
    },
    footer: {
      ...DEFAULT_FOOTER,
      ...(partial.footer || {}),
      socialLinks: partial.footer?.socialLinks || DEFAULT_FOOTER.socialLinks,
      columns: partial.footer?.columns || DEFAULT_FOOTER.columns,
    },
  }
}

/**
 * Create a minimal header configuration
 */
export const MINIMAL_HEADER: StorefrontHeaderConfig = {
  ...DEFAULT_HEADER,
  style: 'minimal',
  showAnnouncementBar: false,
}

/**
 * Create a minimal footer configuration
 */
export const MINIMAL_FOOTER: StorefrontFooterConfig = {
  ...DEFAULT_FOOTER,
  style: 'minimal',
  showNewsletter: false,
  columns: [],
}
