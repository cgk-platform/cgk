/**
 * Portal Theme Module
 *
 * Complete theming system for the customer portal.
 * Extends @cgk/portal/theme with portal-specific configuration.
 *
 * @example
 * ```tsx
 * import {
 *   PortalThemeProvider,
 *   PortalShell,
 *   usePortalTheme,
 *   loadPortalTheme,
 * } from '@/lib/portal-theme'
 *
 * // In your layout:
 * const theme = await loadPortalTheme(tenantId)
 *
 * <PortalThemeProvider theme={theme}>
 *   <PortalShell customer={customer}>
 *     {children}
 *   </PortalShell>
 * </PortalThemeProvider>
 * ```
 */

// Types
export type {
  CustomerPortalThemeConfig,
  CustomerPortalThemeUpdate,
  PortalSidebarConfig,
  PortalHeaderConfig,
  PortalNavConfig,
  PortalNavItem,
  PortalCardConfig,
  PortalButtonConfig,
  PortalEmptyStateConfig,
  PortalLoadingConfig,
  ThemePreviewState,
  ThemeControlCategory,
  ThemeControl,
} from './types'

// Defaults
export {
  DEFAULT_PORTAL_THEME,
  DEFAULT_SIDEBAR,
  DEFAULT_HEADER,
  DEFAULT_NAV,
  DEFAULT_CARD,
  DEFAULT_BUTTON,
  DEFAULT_EMPTY_STATE,
  DEFAULT_LOADING,
  createPortalTheme,
  PORTAL_THEME_PRESETS,
  type PortalThemePresetKey,
} from './defaults'

// CSS Generator
export {
  generatePortalThemeCss,
  generatePortalStyleObject,
} from './generator'

// Loader
export {
  loadPortalTheme,
  loadPortalThemeForSSR,
  savePortalTheme,
  resetPortalTheme,
  invalidatePortalThemeCache,
  getThemeWithPreview,
} from './loader'

// Components
export {
  // Provider and hooks
  PortalThemeProvider,
  usePortalTheme,
  usePortalDarkMode,
  usePortalThemeConfig,
  // Layout
  PortalSidebar,
  PortalSidebarTrigger,
  PortalHeader,
  PortalBreadcrumbs,
  PortalPageHeader,
  PortalShell,
  PortalSection,
  PortalCard,
  PortalGrid,
  PortalEmptyState,
  PortalLoading,
  // Icons
  PortalIcon,
  getAvailableIconKeys,
  hasIcon,
  // Admin
  ThemeControls,
  THEME_CONTROLS,
  ThemePreview,
  ThemePreviewCompact,
  ThemeEditor,
  InlineThemeEditor,
} from './components'
