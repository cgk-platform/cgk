/**
 * Storefront Theme Configuration Types
 *
 * Self-contained theme types for the storefront.
 * All properties map to CSS custom properties for runtime switching.
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
 * Theme context value provided by ThemeProvider
 */
export interface ThemeContextValue {
  theme: PortalThemeConfig
  isDarkMode: boolean
  toggleDarkMode: () => void
  setDarkMode: (enabled: boolean) => void
}

/**
 * Header style configuration for storefront
 */
export interface StorefrontHeaderConfig {
  /** Header style variant */
  style: 'minimal' | 'standard' | 'centered' | 'mega'
  /** Header background (transparent, solid, blur) */
  background: 'transparent' | 'solid' | 'blur'
  /** Show announcement bar */
  showAnnouncementBar: boolean
  /** Announcement bar text */
  announcementText?: string
  /** Announcement bar link */
  announcementLink?: string
  /** Announcement bar background color */
  announcementBarBg?: string
  /** Announcement bar text color */
  announcementBarFg?: string
  /** Sticky header behavior */
  sticky: boolean
  /** Navigation links */
  navLinks?: Array<{
    label: string
    href: string
    children?: Array<{ label: string; href: string }>
  }>
}

/**
 * Footer style configuration for storefront
 */
export interface StorefrontFooterConfig {
  /** Footer style variant */
  style: 'minimal' | 'standard' | 'expanded'
  /** Show newsletter signup */
  showNewsletter: boolean
  /** Newsletter heading */
  newsletterHeading?: string
  /** Newsletter description */
  newsletterDescription?: string
  /** Show social links */
  showSocialLinks: boolean
  /** Social media links */
  socialLinks?: Array<{
    platform: 'instagram' | 'facebook' | 'twitter' | 'tiktok' | 'youtube' | 'linkedin'
    url: string
  }>
  /** Footer columns with links */
  columns?: Array<{
    title: string
    links: Array<{ label: string; href: string }>
  }>
  /** Footer background color override */
  backgroundColor?: string
  /** Copyright text */
  copyrightText?: string
  /** Trust signals/badges */
  trustSignals?: Array<{
    icon: string
    text: string
  }>
}

/**
 * Extended storefront theme configuration
 * Builds on PortalThemeConfig with storefront-specific settings
 */
export interface StorefrontThemeConfig extends PortalThemeConfig {
  /** Header configuration */
  header: StorefrontHeaderConfig
  /** Footer configuration */
  footer: StorefrontFooterConfig
  /** Store name */
  storeName: string
  /** Store description */
  storeDescription?: string
  /** Enable dark mode toggle in storefront */
  showDarkModeToggle: boolean
}

/**
 * Partial storefront theme for updates
 */
export type StorefrontThemeUpdate = Partial<Omit<StorefrontThemeConfig, 'tenantId'>>

/**
 * Landing page settings from database
 */
export interface LandingPageSettings {
  /** Background color override */
  backgroundColor?: string
  /** Show navigation */
  showNavigation?: boolean
  /** Show footer */
  showFooter?: boolean
  /** Use global promo config from site settings */
  useGlobalPromoConfig?: boolean
  /** Custom page theme overrides */
  theme?: Partial<StorefrontThemeConfig>
}

/**
 * SEO metadata for landing pages
 */
export interface LandingPageSEO {
  /** Meta title */
  metaTitle?: string
  /** Meta description */
  metaDescription?: string
  /** Canonical URL */
  canonicalUrl?: string
  /** Open Graph image */
  ogImage?: string
  /** No-index flag */
  noIndex?: boolean
}

/**
 * Landing page status
 */
export type LandingPageStatus = 'draft' | 'published' | 'archived'

/**
 * Landing page configuration from database
 */
export interface LandingPageConfig {
  /** Page ID */
  id: string
  /** Page slug (URL path) */
  slug: string
  /** Page title */
  title: string
  /** Page status */
  status: LandingPageStatus
  /** Page settings */
  settings: LandingPageSettings
  /** SEO metadata */
  seo: LandingPageSEO
  /** Page blocks */
  blocks: LandingPageBlock[]
  /** Created timestamp */
  createdAt: Date
  /** Updated timestamp */
  updatedAt: Date
}

/**
 * Landing page block configuration
 */
export interface LandingPageBlock {
  /** Block ID */
  id: string
  /** Block type */
  type: BlockType
  /** Block order/position */
  order: number
  /** Block configuration */
  config: BlockConfig
}

/**
 * All available block types
 */
export type BlockType =
  // Core blocks
  | 'hero'
  | 'benefits'
  | 'reviews'
  | 'markdown'
  | 'cta-banner'
  | 'ugc-banner'
  | 'trust-signals'
  | 'product-lineup'
  | 'blog-grid'
  | 'thank-you-content'
  // Interactive blocks
  | 'faq'
  | 'countdown'
  | 'community'
  | 'contact-form'
  // Layout blocks
  | 'image-text'
  | 'video-embed'
  | 'testimonial'
  | 'icon-grid'
  | 'spacer'
  | 'divider'
  // Promo blocks
  | 'promo-countdown'
  | 'promo-hero'
  | 'text-banner'
  | 'split-text-banner'
  | 'centered-text'
  | 'feature-cards'
  | 'promo-buy-box'
  | 'dynamic-reviews'
  | 'bundle-builder'
  | 'faq-lifestyle'
  // PDP blocks
  | 'pdp-hero'
  | 'pdp-trust-badges'
  | 'pdp-ready-to-buy'
  | 'pdp-recommendations'
  | 'pdp-before-after'
  | 'pdp-science-section'
  | 'pdp-usage-guide'
  | 'pdp-ingredient-deep-dive'
  | 'pdp-bundle-why'
  | 'pdp-bundle-included'
  | 'pdp-bundle-pricing'
  | 'pdp-featured-reviews'
  | 'pdp-yotpo-reviews'
  | 'pdp-lifestyle-image'
  // Shop blocks
  | 'shop-all-hero'
  | 'shop-all-countdown'
  | 'shop-all-why-choose'
  | 'shop-all-testimonials'
  | 'shop-all-cta'
  // Policy blocks
  | 'policy-header'
  | 'policy-content'
  | 'policy-contact'
  | 'policy-notice'
  | 'text-content'
  // About blocks
  | 'about-hero'
  | 'brand-story'
  | 'founder-section'
  | 'mission-values'
  | 'team-section'
  | 'manifesto-section'
  // Science blocks
  | 'science-hero'
  | 'philosophy-principles'
  | 'ingredient-exclusions'
  | 'biomimetic-technology'
  | 'endocrine-health'
  | 'peptide-technology'
  | 'product-deep-dive'
  | 'brand-comparison'
  | 'full-width-cta'
  // Brand-specific blocks
  | 'results'
  | 'rawdog-standard'
  | 'no-mens-brand'
  | 'new-standard'
  | 'upgrade'
  | 'science'
  | 'health-matrix'

/**
 * Block configuration type - varies by block type
 * Each block type has its own config interface
 */
export type BlockConfig = Record<string, unknown>

/**
 * Block category for organizing in palette
 */
export type BlockCategory =
  | 'core'
  | 'brand'
  | 'interactive'
  | 'layout'
  | 'promo'
  | 'pdp'
  | 'shop'
  | 'policy'
  | 'about'
  | 'science'

/**
 * Block definition for palette
 */
export interface BlockDefinition {
  type: BlockType
  label: string
  description: string
  category: BlockCategory
  defaultConfig?: BlockConfig
}
