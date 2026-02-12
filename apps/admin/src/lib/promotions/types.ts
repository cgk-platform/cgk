/**
 * Types for scheduled promotions and sales
 */

export type PromotionStatus = 'scheduled' | 'active' | 'ended' | 'disabled'

/** Product override configuration */
export interface ProductOverride {
  product_id: string
  price_cents?: number
  discount_percent?: number
}

/** Selling plan override configuration */
export interface SellingPlanOverride {
  selling_plan_id: string
  discount_percent: number
}

/** Collection override configuration */
export interface CollectionOverride {
  collection_id: string
  discount_percent: number
}

/** Scheduled promotion from database */
export interface ScheduledPromotion {
  id: string
  name: string
  description: string | null
  status: PromotionStatus
  starts_at: string
  ends_at: string
  timezone_start: string
  timezone_end: string
  sitewide_discount_percent: number | null
  subscription_discount_percent: number | null
  bundle_discount_percent: number | null
  onetime_discount_percent: number | null
  banner_text: string | null
  banner_background_color: string
  banner_text_color: string
  badge_text: string | null
  promo_code: string | null
  product_overrides: Record<string, ProductOverride> | null
  selling_plan_overrides: Record<string, SellingPlanOverride> | null
  collection_overrides: Record<string, CollectionOverride> | null
  created_at: string
  updated_at: string
}

/** Input for creating a scheduled promotion */
export interface CreatePromotionInput {
  name: string
  description?: string
  starts_at: string
  ends_at: string
  timezone_start?: string
  timezone_end?: string
  sitewide_discount_percent?: number
  subscription_discount_percent?: number
  bundle_discount_percent?: number
  onetime_discount_percent?: number
  banner_text?: string
  banner_background_color?: string
  banner_text_color?: string
  badge_text?: string
  promo_code?: string
  product_overrides?: Record<string, ProductOverride>
  selling_plan_overrides?: Record<string, SellingPlanOverride>
  collection_overrides?: Record<string, CollectionOverride>
}

/** Input for updating a scheduled promotion */
export interface UpdatePromotionInput {
  name?: string
  description?: string | null
  status?: PromotionStatus
  starts_at?: string
  ends_at?: string
  timezone_start?: string
  timezone_end?: string
  sitewide_discount_percent?: number | null
  subscription_discount_percent?: number | null
  bundle_discount_percent?: number | null
  onetime_discount_percent?: number | null
  banner_text?: string | null
  banner_background_color?: string
  banner_text_color?: string
  badge_text?: string | null
  promo_code?: string | null
  product_overrides?: Record<string, ProductOverride> | null
  selling_plan_overrides?: Record<string, SellingPlanOverride> | null
  collection_overrides?: Record<string, CollectionOverride> | null
}

/** Calendar event representation of a promotion */
export interface PromotionCalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  status: PromotionStatus
  sitewide_discount_percent: number | null
  badge_text: string | null
}

/** Common promotion presets */
export const PROMOTION_PRESETS = {
  BLACK_FRIDAY: {
    name: 'Black Friday Sale',
    badge_text: 'BLACK FRIDAY',
    banner_background_color: '#000000',
    banner_text_color: '#ffffff',
    sitewide_discount_percent: 25,
  },
  CYBER_MONDAY: {
    name: 'Cyber Monday Sale',
    badge_text: 'CYBER MONDAY',
    banner_background_color: '#1e40af',
    banner_text_color: '#ffffff',
    sitewide_discount_percent: 30,
  },
  HOLIDAY_SALE: {
    name: 'Holiday Sale',
    badge_text: 'HOLIDAY SALE',
    banner_background_color: '#166534',
    banner_text_color: '#ffffff',
    sitewide_discount_percent: 20,
  },
  FLASH_SALE: {
    name: 'Flash Sale',
    badge_text: 'FLASH SALE',
    banner_background_color: '#ef4444',
    banner_text_color: '#ffffff',
    sitewide_discount_percent: 15,
  },
  SUMMER_SALE: {
    name: 'Summer Sale',
    badge_text: 'SUMMER SALE',
    banner_background_color: '#f59e0b',
    banner_text_color: '#000000',
    sitewide_discount_percent: 20,
  },
} as const

export type PromotionPreset = keyof typeof PROMOTION_PRESETS

/**
 * Check if two date ranges overlap
 */
export function dateRangesOverlap(
  start1: Date | string,
  end1: Date | string,
  start2: Date | string,
  end2: Date | string,
): boolean {
  const s1 = new Date(start1).getTime()
  const e1 = new Date(end1).getTime()
  const s2 = new Date(start2).getTime()
  const e2 = new Date(end2).getTime()

  return s1 < e2 && s2 < e1
}

/**
 * Get status based on current time and promotion dates
 */
export function calculatePromotionStatus(
  startsAt: Date | string,
  endsAt: Date | string,
  currentStatus: PromotionStatus,
): PromotionStatus {
  if (currentStatus === 'disabled') return 'disabled'

  const now = Date.now()
  const start = new Date(startsAt).getTime()
  const end = new Date(endsAt).getTime()

  if (now < start) return 'scheduled'
  if (now >= start && now <= end) return 'active'
  return 'ended'
}
