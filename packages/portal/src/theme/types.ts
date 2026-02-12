/**
 * Portal Theme Configuration Types
 *
 * Defines the complete theming schema for white-label customer portals.
 * Each tenant can customize colors, typography, layout, and branding.
 */

/**
 * Spacing density options for portal layout
 */
export type SpacingDensity = 'compact' | 'normal' | 'relaxed'

/**
 * Color mode preference
 */
export type ColorMode = 'light' | 'dark' | 'system'

/**
 * Complete portal theme configuration
 */
export interface PortalThemeConfig {
  tenantId: string

  // Colors - Core palette
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  cardBackgroundColor: string
  borderColor: string
  accentColor: string
  errorColor: string
  successColor: string
  warningColor: string

  // Colors - Text
  foregroundColor: string
  mutedForegroundColor: string

  // Typography
  fontFamily: string
  headingFontFamily: string | null
  baseFontSize: number
  lineHeight: number
  headingLineHeight: number
  fontWeightNormal: number
  fontWeightMedium: number
  fontWeightBold: number

  // Layout
  maxContentWidth: string
  cardBorderRadius: string
  buttonBorderRadius: string
  inputBorderRadius: string
  spacing: SpacingDensity

  // Branding
  logoUrl: string | null
  logoHeight: number
  logoDarkUrl: string | null
  faviconUrl: string | null

  // Dark mode
  darkModeEnabled: boolean
  darkModeDefault: boolean

  // Dark mode colors (optional overrides)
  darkPrimaryColor: string | null
  darkSecondaryColor: string | null
  darkBackgroundColor: string | null
  darkCardBackgroundColor: string | null
  darkBorderColor: string | null
  darkForegroundColor: string | null
  darkMutedForegroundColor: string | null

  // Advanced
  customCss: string | null
  customFontsUrl: string | null
}

/**
 * Database row type for portal_theme_config table
 */
export interface PortalThemeConfigRow {
  tenant_id: string
  primary_color: string
  secondary_color: string
  background_color: string
  card_background_color: string
  border_color: string
  accent_color: string
  error_color: string
  success_color: string
  warning_color: string
  foreground_color: string
  muted_foreground_color: string
  font_family: string
  heading_font_family: string | null
  base_font_size: number
  line_height: string
  heading_line_height: string
  font_weight_normal: number
  font_weight_medium: number
  font_weight_bold: number
  max_content_width: string
  card_border_radius: string
  button_border_radius: string
  input_border_radius: string
  spacing: string
  logo_url: string | null
  logo_height: number
  logo_dark_url: string | null
  favicon_url: string | null
  dark_mode_enabled: boolean
  dark_mode_default: boolean
  dark_primary_color: string | null
  dark_secondary_color: string | null
  dark_background_color: string | null
  dark_card_background_color: string | null
  dark_border_color: string | null
  dark_foreground_color: string | null
  dark_muted_foreground_color: string | null
  custom_css: string | null
  custom_fonts_url: string | null
  created_at: Date
  updated_at: Date
}

/**
 * Computed spacing values based on density setting
 */
export interface SpacingValues {
  card: string
  section: string
  gap: string
  buttonPadding: string
  inputPadding: string
}

/**
 * Resolved theme with all computed values
 */
export interface ResolvedPortalTheme extends PortalThemeConfig {
  spacingValues: SpacingValues
  cssVariables: string
  isDarkMode: boolean
}

/**
 * Theme context value provided by ThemeProvider
 */
export interface ThemeContextValue {
  theme: PortalThemeConfig
  isDarkMode: boolean
  toggleDarkMode: () => void
  setDarkMode: (enabled: boolean) => void
}

/**
 * Partial theme for updates
 */
export type PortalThemeConfigUpdate = Partial<Omit<PortalThemeConfig, 'tenantId'>>
