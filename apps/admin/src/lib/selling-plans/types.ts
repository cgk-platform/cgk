/**
 * Types for selling plan management
 * Selling plans define subscription intervals and discount structures
 */

export type SellingPlanIntervalUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'

export type SellingPlanDiscountType = 'percentage' | 'fixed_amount' | 'explicit_price'

/** Selling plan from database */
export interface SellingPlan {
  id: string
  name: string
  internal_name: string | null
  selector_title: string
  priority: number
  interval_unit: SellingPlanIntervalUnit
  interval_count: number
  discount_type: SellingPlanDiscountType
  discount_value: number
  discount_after_payment: number | null
  discount_after_type: SellingPlanDiscountType | null
  discount_after_value: number | null
  shopify_selling_plan_id: string | null
  shopify_selling_plan_group_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/** Selling plan with product/collection assignments */
export interface SellingPlanWithAssignments extends SellingPlan {
  product_ids: string[]
  collection_ids: string[]
}

/** Input for creating a selling plan */
export interface CreateSellingPlanInput {
  name: string
  internal_name?: string
  selector_title: string
  priority?: number
  interval_unit: SellingPlanIntervalUnit
  interval_count: number
  discount_type: SellingPlanDiscountType
  discount_value: number
  discount_after_payment?: number
  discount_after_type?: SellingPlanDiscountType
  discount_after_value?: number
  product_ids?: string[]
  collection_ids?: string[]
  is_active?: boolean
}

/** Input for updating a selling plan */
export interface UpdateSellingPlanInput {
  name?: string
  internal_name?: string | null
  selector_title?: string
  priority?: number
  interval_unit?: SellingPlanIntervalUnit
  interval_count?: number
  discount_type?: SellingPlanDiscountType
  discount_value?: number
  discount_after_payment?: number | null
  discount_after_type?: SellingPlanDiscountType | null
  discount_after_value?: number | null
  product_ids?: string[]
  collection_ids?: string[]
  is_active?: boolean
}

/** Product assignment */
export interface SellingPlanProduct {
  id: string
  selling_plan_id: string
  product_id: string
  created_at: string
}

/** Collection assignment */
export interface SellingPlanCollection {
  id: string
  selling_plan_id: string
  collection_id: string
  created_at: string
}

/** Human-readable interval description */
export function formatInterval(unit: SellingPlanIntervalUnit, count: number): string {
  const unitLabels: Record<SellingPlanIntervalUnit, { singular: string; plural: string }> = {
    DAY: { singular: 'day', plural: 'days' },
    WEEK: { singular: 'week', plural: 'weeks' },
    MONTH: { singular: 'month', plural: 'months' },
    YEAR: { singular: 'year', plural: 'years' },
  }

  const label = count === 1 ? unitLabels[unit].singular : unitLabels[unit].plural
  return `Every ${count} ${label}`
}

/** Human-readable discount description */
export function formatDiscount(type: SellingPlanDiscountType, value: number): string {
  switch (type) {
    case 'percentage':
      return `${value}% off`
    case 'fixed_amount':
      return `$${(value / 100).toFixed(2)} off`
    case 'explicit_price':
      return `$${(value / 100).toFixed(2)}`
    default:
      return String(value)
  }
}
