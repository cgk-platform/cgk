/**
 * Portal Theme Module
 *
 * Exports all theme-related functionality for the customer portal.
 */

// Types
export type {
  PortalThemeConfig,
  PortalThemeConfigRow,
  PortalThemeConfigUpdate,
  SpacingDensity,
  SpacingValues,
  ColorMode,
  ResolvedPortalTheme,
  ThemeContextValue,
} from './types.js'

// Defaults
export {
  DEFAULT_THEME,
  SPACING_PRESETS,
  DEFAULT_DARK_COLORS,
  mergeWithDefaults,
  getSpacingValues,
  createTheme,
} from './defaults.js'

// CSS Generator
export {
  generateThemeCss,
  generateThemeStyleObject,
} from './generator.js'

// Loader
export {
  loadThemeConfig,
  loadThemeFromDatabase,
  loadThemeForSSR,
  invalidateThemeCache,
} from './loader.js'
