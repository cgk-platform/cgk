/**
 * P&L Configuration & Cost Management Types
 *
 * Types for variable costs, COGS, expense categories, and P&L formula configuration.
 * All configurations are tenant-scoped.
 */

// ============================================================
// Payment Processing
// ============================================================

export type PaymentProcessor = 'shopify_payments' | 'stripe' | 'paypal' | 'custom'

export interface AdditionalProcessor {
  id: string
  name: string
  percentageRate: number
  fixedFeeCents: number
  volumePercent: number
}

export interface PaymentProcessingConfig {
  primaryProcessor: PaymentProcessor
  percentageRate: number
  fixedFeeCents: number
  additionalProcessors: AdditionalProcessor[]
}

// ============================================================
// Fulfillment Costs
// ============================================================

export type FulfillmentCostModel = 'per_order' | 'per_item' | 'weight_based' | 'manual'

export interface WeightTier {
  id: string
  minOunces: number
  maxOunces: number
  feeCents: number
}

export interface FulfillmentConfig {
  costModel: FulfillmentCostModel
  pickPackFeeCents: number
  pickPackPerItemCents: number
  packagingCostCents: number
  handlingFeeCents: number
  weightTiers: WeightTier[]
}

// ============================================================
// Shipping Costs
// ============================================================

export type ShippingTrackingMethod = 'actual_expense' | 'estimated_percentage' | 'flat_rate'

export interface ShippingConfig {
  trackingMethod: ShippingTrackingMethod
  estimatedPercent?: number
  flatRateCents?: number
}

// ============================================================
// Other Variable Costs
// ============================================================

export type VariableCostCalculationType = 'per_order' | 'per_item' | 'percentage_of_revenue'

export interface OtherVariableCost {
  id: string
  name: string
  amountCents: number
  calculationType: VariableCostCalculationType
  percentageRate?: number
  isActive: boolean
  createdAt: string
}

// ============================================================
// Variable Cost Config (Combined)
// ============================================================

export interface VariableCostConfig {
  id: string
  tenantId: string
  paymentProcessing: PaymentProcessingConfig
  fulfillment: FulfillmentConfig
  shipping: ShippingConfig
  otherVariableCosts: OtherVariableCost[]
  version: number
  updatedAt: string
  updatedBy: string | null
}

export interface VariableCostConfigUpdate {
  paymentProcessing?: Partial<PaymentProcessingConfig>
  fulfillment?: Partial<FulfillmentConfig>
  shipping?: Partial<ShippingConfig>
  otherVariableCosts?: OtherVariableCost[]
}

// ============================================================
// COGS Configuration
// ============================================================

export type COGSSource = 'shopify' | 'internal'
export type COGSSyncFrequency = 'realtime' | 'hourly' | 'daily'
export type COGSFallbackBehavior = 'zero' | 'skip_pnl' | 'use_default' | 'percentage_of_price'
export type COGSImportSource = 'csv' | 'manual' | 'erp'

export interface COGSConfig {
  id: string
  tenantId: string
  source: COGSSource

  // Shopify mode settings
  shopifySyncEnabled: boolean
  shopifySyncFrequency: COGSSyncFrequency
  shopifyCostField: string
  shopifyLastSyncAt: string | null

  // Fallback behavior
  fallbackBehavior: COGSFallbackBehavior
  fallbackPercent?: number
  fallbackDefaultCogsCents?: number

  // Internal mode settings
  lastImportAt: string | null
  importSource: COGSImportSource | null

  updatedAt: string
  updatedBy: string | null
}

export interface COGSConfigUpdate {
  source?: COGSSource
  shopifySyncEnabled?: boolean
  shopifySyncFrequency?: COGSSyncFrequency
  shopifyCostField?: string
  fallbackBehavior?: COGSFallbackBehavior
  fallbackPercent?: number
  fallbackDefaultCogsCents?: number
}

// ============================================================
// Product COGS
// ============================================================

export type ProductCOGSSource = 'manual' | 'csv_import' | 'erp_sync'

export interface ProductCOGS {
  id: string
  tenantId: string
  productId: string
  variantId: string | null
  sku: string | null
  cogsCents: number
  source: ProductCOGSSource
  createdAt: string
  updatedAt: string
  updatedBy: string | null
}

export interface ProductCOGSWithDetails extends ProductCOGS {
  productTitle?: string
  variantTitle?: string
  price?: number
  marginPercent?: number
}

export interface ProductCOGSUpdate {
  cogsCents: number
  source?: ProductCOGSSource
}

export interface ProductCOGSBulkUpdate {
  products: Array<{
    productId: string
    variantId?: string
    cogsCents: number
  }>
  source?: ProductCOGSSource
}

export interface ProductCOGSImportRow {
  sku?: string
  variantId?: string
  productId?: string
  cogsCents: number
}

// ============================================================
// P&L Formula Configuration
// ============================================================

export interface RevenueFormulaConfig {
  includeShippingRevenue: boolean
  includeTaxCollected: boolean
  showGrossSales: boolean
  showDiscounts: boolean
  showReturns: boolean
}

export interface COGSFormulaConfig {
  label: string
  includeFreeSamples: boolean
  showAsPercentage: boolean
}

export interface VariableCostsFormulaConfig {
  label: string
  showPaymentProcessing: boolean
  showFulfillment: boolean
  showPackaging: boolean
  showShipping: boolean
  customCostVisibility: Record<string, boolean>
  groupFulfillmentCosts: boolean
}

export interface ContributionMarginConfig {
  label: string
  showAsPercentage: boolean
  highlightNegative: boolean
}

export interface MarketingFormulaConfig {
  label: string
  showAdSpendByPlatform: boolean
  showCreatorPayouts: boolean
  showInfluencerFees: boolean
  combineAdSpendAndPayouts: boolean
}

export interface OperatingExpensesFormulaConfig {
  label: string
  showByCategory: boolean
  includeVendorPayouts: boolean
  includeContractorPayouts: boolean
  categoriesOrder: string[]
}

export interface PLFormulaConfig {
  id: string
  tenantId: string
  revenue: RevenueFormulaConfig
  cogs: COGSFormulaConfig
  variableCosts: VariableCostsFormulaConfig
  contributionMargin: ContributionMarginConfig
  marketing: MarketingFormulaConfig
  operatingExpenses: OperatingExpensesFormulaConfig
  showOperatingIncome: boolean
  showOtherIncomeExpense: boolean
  netProfitLabel: string
  updatedAt: string
  updatedBy: string | null
}

export interface PLFormulaConfigUpdate {
  revenue?: Partial<RevenueFormulaConfig>
  cogs?: Partial<COGSFormulaConfig>
  variableCosts?: Partial<VariableCostsFormulaConfig>
  contributionMargin?: Partial<ContributionMarginConfig>
  marketing?: Partial<MarketingFormulaConfig>
  operatingExpenses?: Partial<OperatingExpensesFormulaConfig>
  showOperatingIncome?: boolean
  showOtherIncomeExpense?: boolean
  netProfitLabel?: string
}

// ============================================================
// Expense Categories
// ============================================================

export type ExpenseType = 'cogs' | 'variable' | 'marketing' | 'operating' | 'other'

export interface ExpenseCategory {
  id: string
  tenantId: string
  categoryId: string
  name: string
  expenseType: ExpenseType
  isSystem: boolean
  isActive: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface ExpenseCategoryCreate {
  categoryId: string
  name: string
  expenseType: ExpenseType
  displayOrder?: number
}

export interface ExpenseCategoryUpdate {
  name?: string
  expenseType?: ExpenseType
  isActive?: boolean
  displayOrder?: number
}

// ============================================================
// Audit Log
// ============================================================

export type PLConfigType = 'variable_costs' | 'cogs_source' | 'product_cogs' | 'formula' | 'categories'
export type PLConfigAction = 'create' | 'update' | 'delete' | 'bulk_update' | 'import'

export interface PLConfigAuditLog {
  id: string
  tenantId: string
  configType: PLConfigType
  action: PLConfigAction
  fieldChanged: string | null
  oldValue: unknown
  newValue: unknown
  changedBy: string
  changedAt: string
  ipAddress: string | null
  userAgent: string | null
}

export interface PLConfigAuditLogFilters {
  configType?: PLConfigType
  startDate?: string
  endDate?: string
  changedBy?: string
  page?: number
  limit?: number
}

// ============================================================
// Formula Preview (for live calculation preview)
// ============================================================

export interface FormulaPreviewInput {
  orderTotal: number
  itemCount: number
  cogsCents: number
}

export interface FormulaPreviewResult {
  grossRevenue: number
  cogs: number
  cogsPercent: number
  paymentProcessingFee: number
  fulfillmentCost: number
  packagingCost: number
  shippingCost: number
  otherVariableCosts: number
  totalVariableCosts: number
  contributionMargin: number
  contributionMarginPercent: number
  effectiveVariableCostPerOrder: number
}

// ============================================================
// Default Values
// ============================================================

export const DEFAULT_PAYMENT_PROCESSING: PaymentProcessingConfig = {
  primaryProcessor: 'shopify_payments',
  percentageRate: 0.029,
  fixedFeeCents: 30,
  additionalProcessors: [],
}

export const DEFAULT_FULFILLMENT: FulfillmentConfig = {
  costModel: 'per_order',
  pickPackFeeCents: 200,
  pickPackPerItemCents: 0,
  packagingCostCents: 75,
  handlingFeeCents: 0,
  weightTiers: [],
}

export const DEFAULT_SHIPPING: ShippingConfig = {
  trackingMethod: 'actual_expense',
}

export const DEFAULT_VARIABLE_COST_CONFIG: Omit<VariableCostConfig, 'id' | 'tenantId' | 'updatedAt' | 'updatedBy'> = {
  paymentProcessing: DEFAULT_PAYMENT_PROCESSING,
  fulfillment: DEFAULT_FULFILLMENT,
  shipping: DEFAULT_SHIPPING,
  otherVariableCosts: [],
  version: 1,
}

export const DEFAULT_COGS_CONFIG: Omit<COGSConfig, 'id' | 'tenantId' | 'updatedAt' | 'updatedBy'> = {
  source: 'shopify',
  shopifySyncEnabled: true,
  shopifySyncFrequency: 'realtime',
  shopifyCostField: 'cost',
  shopifyLastSyncAt: null,
  fallbackBehavior: 'zero',
  lastImportAt: null,
  importSource: null,
}

export const DEFAULT_PL_FORMULA_CONFIG: Omit<PLFormulaConfig, 'id' | 'tenantId' | 'updatedAt' | 'updatedBy'> = {
  revenue: {
    includeShippingRevenue: false,
    includeTaxCollected: false,
    showGrossSales: true,
    showDiscounts: true,
    showReturns: true,
  },
  cogs: {
    label: 'Cost of Goods Sold',
    includeFreeSamples: false,
    showAsPercentage: true,
  },
  variableCosts: {
    label: 'Variable Costs',
    showPaymentProcessing: true,
    showFulfillment: true,
    showPackaging: true,
    showShipping: true,
    customCostVisibility: {},
    groupFulfillmentCosts: false,
  },
  contributionMargin: {
    label: 'Contribution Margin',
    showAsPercentage: true,
    highlightNegative: true,
  },
  marketing: {
    label: 'Marketing',
    showAdSpendByPlatform: true,
    showCreatorPayouts: true,
    showInfluencerFees: true,
    combineAdSpendAndPayouts: false,
  },
  operatingExpenses: {
    label: 'Operating Expenses',
    showByCategory: true,
    includeVendorPayouts: true,
    includeContractorPayouts: true,
    categoriesOrder: [],
  },
  showOperatingIncome: true,
  showOtherIncomeExpense: true,
  netProfitLabel: 'Net Profit',
}

export const DEFAULT_EXPENSE_CATEGORIES: Array<Omit<ExpenseCategory, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>> = [
  { categoryId: 'cogs_product', name: 'Product Cost', expenseType: 'cogs', isSystem: true, isActive: true, displayOrder: 1 },
  { categoryId: 'var_payment', name: 'Payment Processing', expenseType: 'variable', isSystem: true, isActive: true, displayOrder: 10 },
  { categoryId: 'var_fulfillment', name: 'Fulfillment', expenseType: 'variable', isSystem: true, isActive: true, displayOrder: 11 },
  { categoryId: 'var_shipping', name: 'Shipping', expenseType: 'variable', isSystem: true, isActive: true, displayOrder: 12 },
  { categoryId: 'var_packaging', name: 'Packaging', expenseType: 'variable', isSystem: true, isActive: true, displayOrder: 13 },
  { categoryId: 'mkt_meta', name: 'Meta Ads', expenseType: 'marketing', isSystem: true, isActive: true, displayOrder: 20 },
  { categoryId: 'mkt_google', name: 'Google Ads', expenseType: 'marketing', isSystem: true, isActive: true, displayOrder: 21 },
  { categoryId: 'mkt_tiktok', name: 'TikTok Ads', expenseType: 'marketing', isSystem: true, isActive: true, displayOrder: 22 },
  { categoryId: 'mkt_creator', name: 'Creator Commissions', expenseType: 'marketing', isSystem: true, isActive: true, displayOrder: 23 },
  { categoryId: 'mkt_influencer', name: 'Influencer Fees', expenseType: 'marketing', isSystem: true, isActive: true, displayOrder: 24 },
  { categoryId: 'op_salaries', name: 'Salaries & Wages', expenseType: 'operating', isSystem: false, isActive: true, displayOrder: 30 },
  { categoryId: 'op_rent', name: 'Rent & Facilities', expenseType: 'operating', isSystem: false, isActive: true, displayOrder: 31 },
  { categoryId: 'op_software', name: 'Software & Tools', expenseType: 'operating', isSystem: false, isActive: true, displayOrder: 32 },
  { categoryId: 'op_professional', name: 'Professional Services', expenseType: 'operating', isSystem: false, isActive: true, displayOrder: 33 },
  { categoryId: 'op_insurance', name: 'Insurance', expenseType: 'operating', isSystem: false, isActive: true, displayOrder: 34 },
  { categoryId: 'op_vendors', name: 'Vendor Payments', expenseType: 'operating', isSystem: true, isActive: true, displayOrder: 35 },
  { categoryId: 'op_contractors', name: 'Contractor Payments', expenseType: 'operating', isSystem: true, isActive: true, displayOrder: 36 },
  { categoryId: 'other_misc', name: 'Miscellaneous', expenseType: 'other', isSystem: false, isActive: true, displayOrder: 100 },
]

// ============================================================
// Processor Options
// ============================================================

export const PAYMENT_PROCESSOR_OPTIONS = [
  { value: 'shopify_payments', label: 'Shopify Payments' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'custom', label: 'Custom' },
] as const

export const FULFILLMENT_MODEL_OPTIONS = [
  { value: 'per_order', label: 'Per Order' },
  { value: 'per_item', label: 'Per Item' },
  { value: 'weight_based', label: 'Weight Based' },
  { value: 'manual', label: 'Manual Entry' },
] as const

export const SHIPPING_METHOD_OPTIONS = [
  { value: 'actual_expense', label: 'Track via Treasury Operating Expenses' },
  { value: 'estimated_percentage', label: 'Estimated Percentage of Order' },
  { value: 'flat_rate', label: 'Flat Rate per Order' },
] as const

export const COGS_SOURCE_OPTIONS = [
  { value: 'shopify', label: 'Shopify Sync' },
  { value: 'internal', label: 'Manual Entry' },
] as const

export const COGS_SYNC_FREQUENCY_OPTIONS = [
  { value: 'realtime', label: 'Real-time' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
] as const

export const COGS_FALLBACK_OPTIONS = [
  { value: 'zero', label: 'Use $0 (exclude from COGS)' },
  { value: 'skip_pnl', label: 'Skip from P&L calculations' },
  { value: 'use_default', label: 'Use default COGS value' },
  { value: 'percentage_of_price', label: 'Calculate as percentage of price' },
] as const

export const EXPENSE_TYPE_OPTIONS = [
  { value: 'cogs', label: 'Cost of Goods Sold' },
  { value: 'variable', label: 'Variable Cost' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operating', label: 'Operating Expense' },
  { value: 'other', label: 'Other' },
] as const
