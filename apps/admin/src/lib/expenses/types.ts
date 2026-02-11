/**
 * Expense-related types for the admin portal
 * Phase 2H: Financial Expenses & P&L
 */

// ============================================================
// Expense Category Types
// ============================================================

export type ExpenseCategoryType = 'cogs' | 'variable' | 'marketing' | 'operating' | 'other'

export interface ExpenseCategory {
  id: string
  tenant_id: string
  category_id: string
  name: string
  expense_type: ExpenseCategoryType
  is_system: boolean
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface CreateExpenseCategoryInput {
  category_id: string
  name: string
  expense_type: ExpenseCategoryType
  display_order?: number
}

export interface UpdateExpenseCategoryInput {
  name?: string
  expense_type?: ExpenseCategoryType
  is_active?: boolean
  display_order?: number
}

// ============================================================
// Operating Expense Types
// ============================================================

export interface OperatingExpense {
  id: string
  tenant_id: string
  date: string
  category_id: string
  description: string
  amount_cents: number
  vendor_name: string | null
  notes: string | null
  receipt_url: string | null
  count_for_pnl: boolean
  pnl_exclusion_reason: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CreateOperatingExpenseInput {
  date: string
  category_id: string
  description: string
  amount_cents: number
  vendor_name?: string
  notes?: string
  receipt_url?: string
  count_for_pnl?: boolean
}

export interface UpdateOperatingExpenseInput {
  date?: string
  category_id?: string
  description?: string
  amount_cents?: number
  vendor_name?: string
  notes?: string
  receipt_url?: string
  count_for_pnl?: boolean
  pnl_exclusion_reason?: string
}

// ============================================================
// Budget Types
// ============================================================

export interface ExpenseBudget {
  id: string
  tenant_id: string
  category_id: string
  year: number
  month: number
  budgeted_cents: number
  created_at: string
  updated_at: string
}

export interface BudgetComparison {
  category_id: string
  category_name: string
  expense_type: ExpenseCategoryType
  budgeted_cents: number
  actual_cents: number
  variance_cents: number
  variance_percent: number
  is_over_budget: boolean
}

export interface SetBudgetInput {
  category_id: string
  year: number
  month: number
  budgeted_cents: number
}

// ============================================================
// Ad Spend Types
// ============================================================

export type AdPlatform = 'meta' | 'google' | 'tiktok' | 'other'

export interface AdSpend {
  id: string
  tenant_id: string
  platform: AdPlatform
  date: string
  account_id: string | null
  account_name: string | null
  campaign_id: string | null
  campaign_name: string | null
  spend_cents: number
  currency: string
  impressions: number | null
  clicks: number | null
  conversions: number | null
  conversion_value_cents: number | null
  count_for_pnl: boolean
  synced_at: string
}

export interface AdSpendSummary {
  platform: AdPlatform
  total_spend_cents: number
  total_impressions: number
  total_clicks: number
  total_conversions: number
}

// ============================================================
// Vendor & Contractor Payout Types
// ============================================================

export interface VendorPayout {
  id: string
  tenant_id: string
  vendor_name: string
  vendor_id: string | null
  amount_cents: number
  currency: string
  payment_date: string
  payment_method: string | null
  reference_number: string | null
  description: string | null
  notes: string | null
  count_for_pnl: boolean
  pnl_exclusion_reason: string | null
  category_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ContractorPayout {
  id: string
  tenant_id: string
  contractor_name: string
  contractor_id: string | null
  amount_cents: number
  currency: string
  payment_date: string
  payment_method: string | null
  reference_number: string | null
  description: string | null
  notes: string | null
  count_for_pnl: boolean
  pnl_exclusion_reason: string | null
  category_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// Unified Expense Types
// ============================================================

export type ExpenseSource =
  | 'ad_spend'
  | 'creator_payout'
  | 'vendor_payout'
  | 'contractor_payout'
  | 'operating_expense'

export interface UnifiedExpense {
  id: string
  source: ExpenseSource
  date: string
  description: string
  amount_cents: number
  category_id: string | null
  category_name: string | null
  category_type: ExpenseCategoryType | null
  vendor_name: string | null
  count_for_pnl: boolean
  pnl_exclusion_reason: string | null
  metadata: Record<string, unknown>
}

export interface UnifiedExpenseSummary {
  total_cents: number
  total_included_cents: number
  total_excluded_cents: number
  by_source: Array<{
    source: ExpenseSource
    total_cents: number
    count: number
  }>
  by_category_type: Array<{
    category_type: ExpenseCategoryType
    total_cents: number
    count: number
  }>
}

export interface UnifiedExpenseFilters {
  page: number
  limit: number
  offset: number
  start_date: string
  end_date: string
  source?: ExpenseSource
  category_type?: ExpenseCategoryType
  search?: string
  count_for_pnl?: boolean
}

// ============================================================
// P&L Statement Types
// ============================================================

export interface PLLineItem {
  id: string
  label: string
  amount_cents: number
  percentage?: number
  is_subtotal?: boolean
  is_negative?: boolean
  tooltip?: string
  expandable?: boolean
  children?: PLLineItem[]
}

export interface PLSection {
  id: string
  label: string
  items: PLLineItem[]
  subtotal: PLLineItem
}

export interface PLStatement {
  period: {
    start_date: string
    end_date: string
    label: string
  }
  comparison?: {
    start_date: string
    end_date: string
    label: string
  }

  // Revenue
  revenue: {
    gross_sales_cents: number
    discounts_cents: number
    returns_cents: number
    shipping_revenue_cents: number
    net_revenue_cents: number
    net_revenue_change_percent?: number
  }

  // COGS
  cogs: {
    product_cost_cents: number
    gross_profit_cents: number
    gross_margin_percent: number
    gross_profit_change_percent?: number
  }

  // Variable Costs
  variable_costs: {
    payment_processing_cents: number
    shipping_costs_cents: number
    fulfillment_cents: number
    other_cents: number
    total_cents: number
    contribution_margin_cents: number
    contribution_margin_percent: number
  }

  // Marketing & Sales
  marketing: {
    ad_spend_by_platform: Array<{
      platform: AdPlatform
      spend_cents: number
    }>
    total_ad_spend_cents: number
    creator_payouts_cents: number
    total_cents: number
    contribution_profit_cents: number
  }

  // Operating Expenses
  operating: {
    by_category: Array<{
      category_id: string
      category_name: string
      total_cents: number
      items_count: number
    }>
    vendor_payouts_cents: number
    contractor_payouts_cents: number
    total_cents: number
    operating_income_cents: number
  }

  // Net Profit
  net_profit_cents: number
  net_margin_percent: number
  net_profit_change_percent?: number
}

export interface PLComparisonData {
  current: PLStatement
  comparison: PLStatement | null
  changes: {
    net_revenue_change_cents: number
    net_revenue_change_percent: number
    gross_profit_change_cents: number
    gross_profit_change_percent: number
    net_profit_change_cents: number
    net_profit_change_percent: number
  } | null
}

// ============================================================
// P&L Toggle Types
// ============================================================

export type ToggleableItemType =
  | 'operating_expense'
  | 'vendor_payout'
  | 'contractor_payout'
  | 'creator_payout'

export interface TogglePnlInput {
  item_type: ToggleableItemType
  item_id: string
  count_for_pnl: boolean
  exclusion_reason?: string
}

// ============================================================
// Legacy Types (for backward compatibility)
// ============================================================

export type ExpenseCategory_Legacy =
  | 'advertising'
  | 'creator_payments'
  | 'software'
  | 'shipping'
  | 'supplies'
  | 'services'
  | 'taxes'
  | 'other'

export interface Expense {
  id: string
  category: ExpenseCategory_Legacy
  vendor: string
  description: string
  amount_cents: number
  currency: string
  receipt_url: string | null
  expense_date: string
  is_recurring: boolean
  recurrence_interval: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface ExpenseFilters {
  page: number
  limit: number
  offset: number
  category: string
  dateFrom: string
  dateTo: string
  search: string
}

export interface ExpenseSummary {
  total_this_month_cents: number
  total_this_year_cents: number
  by_category: Array<{
    category: ExpenseCategory_Legacy
    total_cents: number
    count: number
  }>
}

export const EXPENSE_CATEGORIES: ExpenseCategory_Legacy[] = [
  'advertising',
  'creator_payments',
  'software',
  'shipping',
  'supplies',
  'services',
  'taxes',
  'other',
]

// ============================================================
// PDF Export Types
// ============================================================

export interface PLPdfOptions {
  include_comparison: boolean
  include_details: boolean
  tenant_name: string
  generated_by: string
}
