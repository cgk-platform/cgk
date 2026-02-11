/**
 * Tenant Settings Types
 *
 * Types for AI Settings, Payout Settings, and Site Configuration.
 */

// ============================================================
// AI Settings
// ============================================================

export type AIModelPreference = 'auto' | 'claude' | 'gpt4'

export interface AISettings {
  id: string
  tenantId: string

  // Feature toggles
  aiEnabled: boolean
  briiEnabled: boolean
  aiContentEnabled: boolean
  aiInsightsEnabled: boolean

  // Model preferences
  aiModelPreference: AIModelPreference

  // Limits
  aiMonthlyBudgetUsd: number | null
  aiCurrentMonthUsageUsd: number

  // Content settings
  aiContentAutoApprove: boolean

  // Memory settings
  aiMemoryEnabled: boolean
  aiMemoryRetentionDays: number

  updatedAt: string
  updatedBy: string | null
}

export interface AISettingsUpdate {
  aiEnabled?: boolean
  briiEnabled?: boolean
  aiContentEnabled?: boolean
  aiInsightsEnabled?: boolean
  aiModelPreference?: AIModelPreference
  aiMonthlyBudgetUsd?: number | null
  aiContentAutoApprove?: boolean
  aiMemoryEnabled?: boolean
  aiMemoryRetentionDays?: number
}

// ============================================================
// Payout Settings
// ============================================================

export type PaymentMethod = 'stripe_connect' | 'paypal' | 'wise' | 'check' | 'venmo'
export type PayoutSchedule = 'weekly' | 'bi_weekly' | 'monthly' | 'on_demand'
export type PayoutFeeType = 'none' | 'flat' | 'percentage'

export interface PayoutSettings {
  id: string
  tenantId: string

  // Method preferences
  defaultPaymentMethod: PaymentMethod
  stripeConnectEnabled: boolean
  paypalEnabled: boolean
  wiseEnabled: boolean
  checkEnabled: boolean
  venmoEnabled: boolean

  // Schedule
  payoutSchedule: PayoutSchedule
  payoutDay: number

  // Thresholds
  minPayoutThresholdUsd: number
  maxPendingWithdrawals: number
  holdPeriodDays: number

  // Auto-payout
  autoPayoutEnabled: boolean

  // Fees
  payoutFeeType: PayoutFeeType
  payoutFeeAmount: number

  // Compliance
  requireTaxInfo: boolean

  updatedAt: string
  updatedBy: string | null
}

export interface PayoutSettingsUpdate {
  defaultPaymentMethod?: PaymentMethod
  stripeConnectEnabled?: boolean
  paypalEnabled?: boolean
  wiseEnabled?: boolean
  checkEnabled?: boolean
  venmoEnabled?: boolean
  payoutSchedule?: PayoutSchedule
  payoutDay?: number
  minPayoutThresholdUsd?: number
  maxPendingWithdrawals?: number
  holdPeriodDays?: number
  autoPayoutEnabled?: boolean
  payoutFeeType?: PayoutFeeType
  payoutFeeAmount?: number
  requireTaxInfo?: boolean
}

// ============================================================
// Site Configuration
// ============================================================

export interface PricingProductConfig {
  msrp: number
  discount?: number
  label?: string
}

export interface PricingTierConfig {
  discount: number
  label?: string
}

export interface PricingConfig {
  subscription?: {
    individual?: PricingTierConfig
    bundle?: PricingTierConfig
  }
  oneTime?: {
    individual?: PricingTierConfig
    bundle?: PricingTierConfig
  }
  products?: Record<string, PricingProductConfig>
}

export interface SaleConfig {
  discountType?: 'percentage' | 'fixed'
  discountValue?: number
  appliesTo?: 'all' | 'subscription' | 'one_time'
  excludeProducts?: string[]
}

export interface PromoBanner {
  id: string
  imageUrl: string
  linkUrl?: string
  altText: string
  startDate?: string
  endDate?: string
  position: number
  active: boolean
}

export interface NavItem {
  id: string
  label: string
  href: string
  children?: NavItem[]
}

export interface FooterNav {
  columns?: {
    title: string
    links: { label: string; href: string }[]
  }[]
  copyright?: string
  showSocial?: boolean
}

export interface BrandColors {
  primary: string
  secondary: string
  accent?: string
  background?: string
  foreground?: string
}

export interface BrandFonts {
  heading: string
  body: string
}

export interface SocialLinks {
  facebook?: string
  instagram?: string
  twitter?: string
  tiktok?: string
  youtube?: string
  linkedin?: string
  pinterest?: string
}

export interface SiteConfig {
  id: string
  tenantId: string

  // Pricing
  pricingConfig: PricingConfig

  // Promotions
  saleActive: boolean
  saleName: string | null
  saleStartDate: string | null
  saleEndDate: string | null
  saleConfig: SaleConfig

  // Banners
  announcementBarEnabled: boolean
  announcementBarText: string | null
  announcementBarLink: string | null
  announcementBarBgColor: string
  announcementBarTextColor: string
  promoBanners: PromoBanner[]

  // Branding
  logoUrl: string | null
  logoDarkUrl: string | null
  faviconUrl: string | null
  brandColors: BrandColors
  brandFonts: BrandFonts

  // Navigation
  headerNav: NavItem[]
  footerNav: FooterNav

  // Social & Meta
  socialLinks: SocialLinks
  defaultMetaTitle: string | null
  defaultMetaDescription: string | null

  // Analytics
  ga4MeasurementId: string | null
  fbPixelId: string | null
  tiktokPixelId: string | null

  updatedAt: string
  updatedBy: string | null
}

export interface SiteConfigUpdate {
  pricingConfig?: PricingConfig
  saleActive?: boolean
  saleName?: string | null
  saleStartDate?: string | null
  saleEndDate?: string | null
  saleConfig?: SaleConfig
  announcementBarEnabled?: boolean
  announcementBarText?: string | null
  announcementBarLink?: string | null
  announcementBarBgColor?: string
  announcementBarTextColor?: string
  promoBanners?: PromoBanner[]
  logoUrl?: string | null
  logoDarkUrl?: string | null
  faviconUrl?: string | null
  brandColors?: BrandColors
  brandFonts?: BrandFonts
  headerNav?: NavItem[]
  footerNav?: FooterNav
  socialLinks?: SocialLinks
  defaultMetaTitle?: string | null
  defaultMetaDescription?: string | null
  ga4MeasurementId?: string | null
  fbPixelId?: string | null
  tiktokPixelId?: string | null
}

// ============================================================
// Settings Audit Log
// ============================================================

export type SettingType = 'ai' | 'payout' | 'site_config'

export interface SettingsAuditLog {
  id: string
  tenantId: string
  userId: string | null
  settingType: SettingType
  changes: Record<string, unknown>
  previousValues: Record<string, unknown> | null
  createdAt: string
}
