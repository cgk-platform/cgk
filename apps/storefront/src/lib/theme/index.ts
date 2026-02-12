/**
 * Theme Module for Storefront
 *
 * Self-contained theme system for the storefront.
 * Re-exports theme components, hooks, and utilities.
 */

// Provider and hooks
export { ThemeProvider, useTheme, useIsDarkMode } from './ThemeProvider'

// Server components
export { ThemeStyles, ThemeFontPreload, ThemeFavicon, ThemeHead } from './ThemeStyles'

// Client components
export { DarkModeToggle, DarkModeToggleWithLabel } from './DarkModeToggle'
export { BrandLogo, ServerBrandLogo } from './BrandLogo'

// Types
export type {
  PortalThemeConfig,
  ThemeContextValue,
  SpacingDensity,
  SpacingValues,
  ColorMode,
  StorefrontThemeConfig,
  StorefrontHeaderConfig,
  StorefrontFooterConfig,
  StorefrontThemeUpdate,
  LandingPageSettings,
  LandingPageSEO,
  LandingPageStatus,
  LandingPageConfig,
  LandingPageBlock,
  BlockType,
  BlockConfig,
  BlockCategory,
  BlockDefinition,
} from './types'

// Defaults and utilities
export {
  generateThemeCss,
  loadThemeForSSR,
  createTheme,
  getSpacingValues,
  DEFAULT_PORTAL_THEME,
  DEFAULT_DARK_COLORS,
  DEFAULT_HEADER,
  DEFAULT_FOOTER,
  DEFAULT_STOREFRONT_THEME,
  SPACING_PRESETS,
  MINIMAL_HEADER,
  MINIMAL_FOOTER,
  mergeStorefrontTheme,
} from './defaults'
