/**
 * Default Theme Configuration
 *
 * Provides sensible defaults for portal theming. Inspired by RAWDOG's
 * aesthetic: clean, professional, with a focus on content readability.
 */

import type { PortalThemeConfig, SpacingValues, SpacingDensity } from './types.js'

/**
 * Default theme values
 * Based on RAWDOG design system with neutral, professional palette
 */
export const DEFAULT_THEME: Omit<PortalThemeConfig, 'tenantId'> = {
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
  headingFontFamily: null, // Falls back to fontFamily
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

  // Dark mode colors - null means derive from light mode
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
 * Used when tenant doesn't specify custom dark mode colors
 */
export const DEFAULT_DARK_COLORS = {
  backgroundColor: '#0a0a0a',
  cardBackgroundColor: '#171717',
  borderColor: '#262626',
  foregroundColor: '#fafafa',
  mutedForegroundColor: '#a3a3a3',
}

/**
 * Merge partial theme config with defaults
 */
export function mergeWithDefaults(
  partial: Partial<PortalThemeConfig> & { tenantId: string }
): PortalThemeConfig {
  return {
    ...DEFAULT_THEME,
    ...partial,
    tenantId: partial.tenantId,
  }
}

/**
 * Get spacing values for a density setting
 */
export function getSpacingValues(density: SpacingDensity): SpacingValues {
  return SPACING_PRESETS[density] || SPACING_PRESETS.normal
}

/**
 * Create a minimal theme with just required overrides
 */
export function createTheme(
  tenantId: string,
  overrides: Partial<Omit<PortalThemeConfig, 'tenantId'>> = {}
): PortalThemeConfig {
  return mergeWithDefaults({ tenantId, ...overrides })
}
