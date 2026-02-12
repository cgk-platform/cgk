/**
 * Portal Theme Defaults
 *
 * Provides sensible defaults for customer portal theming.
 * Inspired by Swiss design principles with a focus on clarity and function.
 */

import type {
  CustomerPortalThemeConfig,
  PortalSidebarConfig,
  PortalHeaderConfig,
  PortalNavConfig,
  PortalCardConfig,
  PortalButtonConfig,
  PortalEmptyStateConfig,
  PortalLoadingConfig,
} from './types'

/**
 * Default base theme values
 * Based on RAWDOG design system with neutral, professional palette
 */
const DEFAULT_BASE_THEME = {
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
  spacing: 'normal' as const,

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
 * Default sidebar configuration
 */
export const DEFAULT_SIDEBAR: PortalSidebarConfig = {
  style: 'attached',
  position: 'left',
  width: '280px',
  showIcons: true,
  activeIndicator: 'fill',
  backgroundMode: 'solid',
  showBorder: true,
  mobileCollapse: 'drawer',
}

/**
 * Default header configuration
 */
export const DEFAULT_HEADER: PortalHeaderConfig = {
  style: 'standard',
  height: '72px',
  showAvatar: true,
  showWelcome: true,
  welcomeTemplate: 'Welcome back, {{firstName}}',
  showBreadcrumbs: false,
  backgroundMode: 'solid',
  showBorder: true,
  sticky: true,
}

/**
 * Default navigation configuration
 */
export const DEFAULT_NAV: PortalNavConfig = {
  items: [
    {
      key: 'dashboard',
      label: 'Dashboard',
      href: '/account',
      iconKey: 'dashboard',
      visible: true,
    },
    {
      key: 'orders',
      label: 'Orders',
      href: '/account/orders',
      iconKey: 'orders',
      visible: true,
      featureFlag: 'ordersEnabled',
    },
    {
      key: 'subscriptions',
      label: 'Subscriptions',
      href: '/account/subscriptions',
      iconKey: 'subscriptions',
      visible: true,
      featureFlag: 'subscriptionsEnabled',
    },
    {
      key: 'addresses',
      label: 'Addresses',
      href: '/account/addresses',
      iconKey: 'addresses',
      visible: true,
    },
    {
      key: 'profile',
      label: 'Profile',
      href: '/account/profile',
      iconKey: 'profile',
      visible: true,
    },
    {
      key: 'store_credit',
      label: 'Store Credit',
      href: '/account/store-credit',
      iconKey: 'store_credit',
      visible: true,
      featureFlag: 'storeCreditEnabled',
    },
    {
      key: 'rewards',
      label: 'Rewards',
      href: '/account/rewards',
      iconKey: 'rewards',
      visible: true,
      featureFlag: 'loyaltyEnabled',
    },
    {
      key: 'referrals',
      label: 'Refer a Friend',
      href: '/account/referrals',
      iconKey: 'referrals',
      visible: true,
      featureFlag: 'referralsEnabled',
    },
  ],
  showDividers: false,
  groupBySection: false,
}

/**
 * Default card configuration
 */
export const DEFAULT_CARD: PortalCardConfig = {
  style: 'elevated',
  hoverEffect: 'lift',
  shadowIntensity: 10,
  borderWidth: '1px',
  paddingScale: 'normal',
}

/**
 * Default button configuration
 */
export const DEFAULT_BUTTON: PortalButtonConfig = {
  primaryStyle: 'solid',
  defaultSize: 'md',
  textTransform: 'none',
  fontWeight: 500,
  letterSpacing: '0',
}

/**
 * Default empty state configuration
 */
export const DEFAULT_EMPTY_STATE: PortalEmptyStateConfig = {
  style: 'minimal',
  showAction: true,
  iconSize: 48,
}

/**
 * Default loading configuration
 */
export const DEFAULT_LOADING: PortalLoadingConfig = {
  spinnerStyle: 'ring',
  showText: true,
  loadingText: 'Loading...',
}

/**
 * Complete default portal theme
 */
export const DEFAULT_PORTAL_THEME: Omit<CustomerPortalThemeConfig, 'tenantId'> = {
  ...DEFAULT_BASE_THEME,
  sidebar: DEFAULT_SIDEBAR,
  header: DEFAULT_HEADER,
  nav: DEFAULT_NAV,
  card: DEFAULT_CARD,
  button: DEFAULT_BUTTON,
  emptyState: DEFAULT_EMPTY_STATE,
  loading: DEFAULT_LOADING,

  // Portal-specific colors (null = inherit from base theme)
  sidebarBackgroundColor: null,
  sidebarForegroundColor: null,
  sidebarActiveColor: null,
  sidebarActiveForegroundColor: null,
  headerBackgroundColor: null,
  headerForegroundColor: null,

  // Portal-specific spacing
  pageGap: '32px',
  sectionGap: '24px',
  cardGap: '16px',
}

/**
 * Create a complete portal theme with tenant ID
 */
export function createPortalTheme(
  tenantId: string,
  overrides: Partial<Omit<CustomerPortalThemeConfig, 'tenantId'>> = {}
): CustomerPortalThemeConfig {
  return {
    ...DEFAULT_PORTAL_THEME,
    ...overrides,
    tenantId,
    sidebar: {
      ...DEFAULT_SIDEBAR,
      ...(overrides.sidebar || {}),
    },
    header: {
      ...DEFAULT_HEADER,
      ...(overrides.header || {}),
    },
    nav: {
      ...DEFAULT_NAV,
      ...(overrides.nav || {}),
      items: overrides.nav?.items || DEFAULT_NAV.items,
    },
    card: {
      ...DEFAULT_CARD,
      ...(overrides.card || {}),
    },
    button: {
      ...DEFAULT_BUTTON,
      ...(overrides.button || {}),
    },
    emptyState: {
      ...DEFAULT_EMPTY_STATE,
      ...(overrides.emptyState || {}),
    },
    loading: {
      ...DEFAULT_LOADING,
      ...(overrides.loading || {}),
    },
  }
}

/**
 * Theme presets for quick selection
 */
export const PORTAL_THEME_PRESETS = {
  default: {
    name: 'Default',
    description: 'Clean and professional',
    preview: DEFAULT_PORTAL_THEME,
  },
  minimal: {
    name: 'Minimal',
    description: 'Stripped back, content-focused',
    preview: {
      ...DEFAULT_PORTAL_THEME,
      sidebar: {
        ...DEFAULT_SIDEBAR,
        style: 'minimal' as const,
        showBorder: false,
        backgroundMode: 'transparent' as const,
      },
      header: {
        ...DEFAULT_HEADER,
        style: 'minimal' as const,
        showBorder: false,
      },
      card: {
        ...DEFAULT_CARD,
        style: 'flat' as const,
        hoverEffect: 'none' as const,
        shadowIntensity: 0,
      },
    },
  },
  modern: {
    name: 'Modern',
    description: 'Bold with floating elements',
    preview: {
      ...DEFAULT_PORTAL_THEME,
      sidebar: {
        ...DEFAULT_SIDEBAR,
        style: 'floating' as const,
        activeIndicator: 'bar' as const,
        backgroundMode: 'blur' as const,
      },
      header: {
        ...DEFAULT_HEADER,
        backgroundMode: 'blur' as const,
      },
      card: {
        ...DEFAULT_CARD,
        style: 'elevated' as const,
        hoverEffect: 'glow' as const,
        shadowIntensity: 20,
      },
      cardBorderRadius: '16px',
      buttonBorderRadius: '12px',
    },
  },
  classic: {
    name: 'Classic',
    description: 'Traditional with strong borders',
    preview: {
      ...DEFAULT_PORTAL_THEME,
      sidebar: {
        ...DEFAULT_SIDEBAR,
        style: 'attached' as const,
        activeIndicator: 'fill' as const,
      },
      card: {
        ...DEFAULT_CARD,
        style: 'outlined' as const,
        hoverEffect: 'border' as const,
        shadowIntensity: 0,
        borderWidth: '2px',
      },
      cardBorderRadius: '0px',
      buttonBorderRadius: '0px',
    },
  },
} as const

export type PortalThemePresetKey = keyof typeof PORTAL_THEME_PRESETS
