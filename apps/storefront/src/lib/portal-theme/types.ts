/**
 * Portal Theme Configuration Types
 *
 * Extends the base PortalThemeConfig with customer portal-specific settings
 * for layout, navigation, and specialized component styling.
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
 * Theme context value provided by ThemeProvider
 */
export interface ThemeContextValue {
  theme: BasePortalThemeConfig
  isDarkMode: boolean
  toggleDarkMode: () => void
  setDarkMode: (enabled: boolean) => void
}

/**
 * Base portal theme properties
 * These are defined in @cgk-platform/portal/theme but we include them here
 * to ensure type safety even if module resolution has issues
 */
interface BasePortalThemeConfig {
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
 * Portal sidebar configuration
 */
export interface PortalSidebarConfig {
  /** Sidebar style variant */
  style: 'floating' | 'attached' | 'minimal'
  /** Sidebar position */
  position: 'left' | 'right'
  /** Sidebar width on desktop */
  width: string
  /** Show icons in navigation */
  showIcons: boolean
  /** Show active indicator style */
  activeIndicator: 'bar' | 'dot' | 'fill' | 'none'
  /** Sidebar background mode */
  backgroundMode: 'solid' | 'transparent' | 'blur'
  /** Show sidebar border */
  showBorder: boolean
  /** Collapse behavior on mobile */
  mobileCollapse: 'drawer' | 'bottom-nav' | 'hidden'
}

/**
 * Portal header configuration
 */
export interface PortalHeaderConfig {
  /** Header style variant */
  style: 'standard' | 'minimal' | 'branded'
  /** Header height */
  height: string
  /** Show user avatar */
  showAvatar: boolean
  /** Show welcome message */
  showWelcome: boolean
  /** Welcome message template (supports {{firstName}}) */
  welcomeTemplate: string
  /** Show breadcrumbs */
  showBreadcrumbs: boolean
  /** Header background mode */
  backgroundMode: 'solid' | 'transparent' | 'blur'
  /** Show header border */
  showBorder: boolean
  /** Sticky header behavior */
  sticky: boolean
}

/**
 * Portal navigation item configuration
 */
export interface PortalNavItem {
  /** Navigation item key (must be unique) */
  key: string
  /** Display label */
  label: string
  /** Target href */
  href: string
  /** Icon key from portal icon system */
  iconKey: string
  /** Whether item is visible */
  visible: boolean
  /** Feature flag that controls visibility */
  featureFlag?: string
  /** Badge text (e.g., "3" for unread count) */
  badge?: string
  /** Badge variant */
  badgeVariant?: 'default' | 'success' | 'warning' | 'error'
}

/**
 * Portal navigation configuration
 */
export interface PortalNavConfig {
  /** Primary navigation items */
  items: PortalNavItem[]
  /** Show section dividers */
  showDividers: boolean
  /** Group items by section */
  groupBySection: boolean
  /** Navigation sections */
  sections?: Array<{
    key: string
    label: string
    items: string[] // keys of items in this section
  }>
}

/**
 * Portal card styling configuration
 */
export interface PortalCardConfig {
  /** Card style variant */
  style: 'elevated' | 'outlined' | 'flat'
  /** Card hover effect */
  hoverEffect: 'lift' | 'glow' | 'border' | 'none'
  /** Card shadow intensity (0-100) */
  shadowIntensity: number
  /** Card border width */
  borderWidth: string
  /** Card padding scale */
  paddingScale: SpacingDensity
}

/**
 * Portal button configuration
 */
export interface PortalButtonConfig {
  /** Primary button style */
  primaryStyle: 'solid' | 'outline' | 'ghost'
  /** Button size default */
  defaultSize: 'sm' | 'md' | 'lg'
  /** Button text transform */
  textTransform: 'none' | 'uppercase' | 'capitalize'
  /** Button font weight */
  fontWeight: number
  /** Button letter spacing */
  letterSpacing: string
}

/**
 * Portal empty state configuration
 */
export interface PortalEmptyStateConfig {
  /** Empty state style */
  style: 'minimal' | 'illustrated' | 'branded'
  /** Show action button */
  showAction: boolean
  /** Icon size for empty states */
  iconSize: number
}

/**
 * Portal loading state configuration
 */
export interface PortalLoadingConfig {
  /** Loading spinner style */
  spinnerStyle: 'dots' | 'ring' | 'pulse' | 'skeleton'
  /** Show loading text */
  showText: boolean
  /** Loading text */
  loadingText: string
}

/**
 * Complete portal theme configuration
 * Extends base PortalThemeConfig with portal-specific settings
 */
export interface CustomerPortalThemeConfig extends BasePortalThemeConfig {
  /** Portal sidebar configuration */
  sidebar: PortalSidebarConfig
  /** Portal header configuration */
  header: PortalHeaderConfig
  /** Portal navigation configuration */
  nav: PortalNavConfig
  /** Portal card configuration */
  card: PortalCardConfig
  /** Portal button configuration */
  button: PortalButtonConfig
  /** Portal empty state configuration */
  emptyState: PortalEmptyStateConfig
  /** Portal loading configuration */
  loading: PortalLoadingConfig

  /** Portal-specific colors */
  sidebarBackgroundColor: string | null
  sidebarForegroundColor: string | null
  sidebarActiveColor: string | null
  sidebarActiveForegroundColor: string | null
  headerBackgroundColor: string | null
  headerForegroundColor: string | null

  /** Portal-specific spacing */
  pageGap: string
  sectionGap: string
  cardGap: string
}

/**
 * Partial update type for portal theme
 */
export type CustomerPortalThemeUpdate = Partial<
  Omit<CustomerPortalThemeConfig, 'tenantId'>
>

/**
 * Theme preview state for admin
 */
export interface ThemePreviewState {
  /** Current preview theme */
  theme: CustomerPortalThemeConfig
  /** Whether preview is active */
  isActive: boolean
  /** Whether changes are unsaved */
  isDirty: boolean
  /** Original theme for reset */
  originalTheme: CustomerPortalThemeConfig
}

/**
 * Admin theme control category
 */
export type ThemeControlCategory =
  | 'colors'
  | 'typography'
  | 'layout'
  | 'sidebar'
  | 'header'
  | 'cards'
  | 'buttons'
  | 'advanced'

/**
 * Theme control definition for admin panel
 */
export interface ThemeControl {
  key: string
  label: string
  description?: string
  category: ThemeControlCategory
  type: 'color' | 'select' | 'number' | 'text' | 'toggle' | 'range' | 'font'
  options?: Array<{ value: string; label: string }>
  min?: number
  max?: number
  step?: number
  unit?: string
  defaultValue: unknown
  cssVariable?: string
}
