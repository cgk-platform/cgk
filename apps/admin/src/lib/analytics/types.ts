/**
 * Commerce Analytics Types
 *
 * Types for the complete analytics system including dashboards, reports,
 * P&L breakdown, BRI analytics, pipeline tracking, and Slack notifications.
 */

// ============================================================
// Common Types
// ============================================================

export type DateRangePreset = '7d' | '14d' | '28d' | '30d' | '90d' | 'ytd' | 'custom'

export interface DateRange {
  preset: DateRangePreset
  startDate: string
  endDate: string
}

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export type TrendDirection = 'up' | 'down' | 'stable'

export interface MetricWithTrend {
  value: number
  previousValue: number
  change: number
  changePercent: number
  trend: TrendDirection
}

// ============================================================
// Unit Economics Types (Tab 1)
// ============================================================

export interface CustomerAcquisitionMetrics {
  cac: MetricWithTrend
  cacByChannel: Array<{
    channel: string
    cac: number
    customers: number
    spend: number
  }>
  cacTrend: Array<{ date: string; cac: number }>
}

export interface CustomerValueMetrics {
  ltv: MetricWithTrend
  ltvCacRatio: MetricWithTrend
  aov: MetricWithTrend
  purchaseFrequency: MetricWithTrend
  retentionRate: MetricWithTrend
}

export interface ProductEconomics {
  productId: string
  productName: string
  cogs: number
  grossMargin: number
  grossMarginPercent: number
  contributionMargin: number
  contributionMarginPercent: number
  unitsSold: number
  revenue: number
}

export interface CohortEconomics {
  cohortMonth: string
  customerCount: number
  ltv: number
  cac: number
  paybackPeriodDays: number | null
  revenueByMonth: Array<{ month: number; revenue: number }>
  retentionByMonth: Array<{ month: number; retentionRate: number }>
}

export interface UnitEconomicsData {
  acquisition: CustomerAcquisitionMetrics
  value: CustomerValueMetrics
  products: ProductEconomics[]
  cohorts: CohortEconomics[]
}

// ============================================================
// Spend Sensitivity Types (Tab 2)
// ============================================================

export type AdChannel = 'meta' | 'google' | 'tiktok' | 'other'

export interface SpendOverview {
  totalSpend: MetricWithTrend
  spendByChannel: Array<{
    channel: AdChannel
    spend: number
    previousSpend: number
    change: number
  }>
  spendTrend: Array<{ date: string; spend: number; revenue: number }>
}

export interface EfficiencyMetrics {
  roas: MetricWithTrend
  blendedRoas: MetricWithTrend
  cpo: MetricWithTrend // Cost per order
  cpa: MetricWithTrend // Cost per acquisition
}

export interface SensitivityAnalysis {
  marginalRoasCurve: Array<{ spend: number; marginalRoas: number }>
  optimalSpendRange: { min: number; max: number }
  diminishingReturnsThreshold: number
  currentPosition: 'below_optimal' | 'optimal' | 'above_optimal'
}

export interface ChannelComparison {
  channel: AdChannel
  spend: number
  revenue: number
  roas: number
  cpa: number
  conversions: number
  efficiencyRank: number
}

export interface SpendSensitivityData {
  overview: SpendOverview
  efficiency: EfficiencyMetrics
  sensitivity: SensitivityAnalysis
  channelComparison: ChannelComparison[]
}

// ============================================================
// Geography Types (Tab 3)
// ============================================================

export interface RegionMetrics {
  country: string
  countryName: string
  region?: string
  city?: string
  revenue: number
  orders: number
  customers: number
  newCustomers: number
  returningCustomers: number
  aov: number
  subscriptionRate: number
}

export interface ShippingAnalysis {
  zone: string
  avgShippingCost: number
  avgDeliveryDays: number
  orders: number
  preferredMethods: Array<{ method: string; percent: number }>
}

export interface ProductByRegion {
  productId: string
  productName: string
  region: string
  revenue: number
  units: number
}

export interface GeographyData {
  revenueByCountry: RegionMetrics[]
  revenueByRegion: RegionMetrics[]
  topCities: RegionMetrics[]
  shippingAnalysis: ShippingAnalysis[]
  topProductsByRegion: ProductByRegion[]
  mapData: Array<{ lat: number; lng: number; value: number; label: string }>
}

// ============================================================
// Burn Rate Types (Tab 4)
// ============================================================

export interface CashPosition {
  currentBalance: number
  cashIn: number
  cashOut: number
  netCashFlow: number
  period: string
}

export interface BurnRateMetrics {
  monthlyBurnRate: MetricWithTrend
  burnRateTrend: Array<{ date: string; burnRate: number }>
  fixedCosts: number
  variableCosts: number
  runwayMonths: number
}

export interface BreakEvenAnalysis {
  currentRevenue: number
  breakEvenRevenue: number
  gapToBreakEven: number
  ordersNeeded: number
  pathToProfitability: Array<{ month: string; projectedRevenue: number; projectedCosts: number }>
}

export interface FinancialForecast {
  projectedRevenue: Array<{ month: string; value: number }>
  projectedExpenses: Array<{ month: string; value: number }>
  projectedRunway: Array<{ month: string; months: number }>
  confidenceLevel: 'high' | 'medium' | 'low'
}

export interface BurnRateData {
  cashPosition: CashPosition
  burnRate: BurnRateMetrics
  breakEven: BreakEvenAnalysis
  forecast: FinancialForecast
}

// ============================================================
// Platform Data Types (Tab 5)
// ============================================================

export interface StoreHealth {
  totalOrders: MetricWithTrend
  totalRevenue: MetricWithTrend
  aov: MetricWithTrend
  conversionRate: MetricWithTrend
}

export interface ProductPerformance {
  productId: string
  productName: string
  imageUrl?: string
  revenue: number
  units: number
  inventoryLevel: number
  velocityPerDay: number
  isLowStock: boolean
  daysUntilStockout: number | null
}

export interface CustomerMetrics {
  newCustomers: MetricWithTrend
  returningCustomers: MetricWithTrend
  retentionRate: MetricWithTrend
  repeatPurchaseRate: MetricWithTrend
}

export interface CartCheckoutMetrics {
  cartAbandonmentRate: MetricWithTrend
  checkoutCompletionRate: MetricWithTrend
  paymentSuccessRate: MetricWithTrend
  avgCartSize: MetricWithTrend
}

export interface PlatformDataSources {
  shopify: { connected: boolean; lastSync: string | null }
  stripe: { connected: boolean; lastSync: string | null }
  googleAnalytics: { connected: boolean; lastSync: string | null }
}

export interface PlatformData {
  storeHealth: StoreHealth
  topProducts: ProductPerformance[]
  lowStockProducts: ProductPerformance[]
  customers: CustomerMetrics
  cartCheckout: CartCheckoutMetrics
  dataSources: PlatformDataSources
}

// ============================================================
// Slack Notifications Types (Tab 6)
// ============================================================

export type SlackAlertType =
  | 'revenue_daily'
  | 'revenue_milestone'
  | 'revenue_threshold'
  | 'high_value_order'
  | 'order_spike'
  | 'order_drop'
  | 'first_time_customer'
  | 'churn_spike'
  | 'mrr_milestone'
  | 'failed_payments'
  | 'low_stock'
  | 'out_of_stock'
  | 'reorder_needed'

export type AlertFrequency = 'realtime' | 'daily' | 'weekly'

export interface SlackAlertConfig {
  threshold?: number
  frequency: AlertFrequency
  businessHoursOnly: boolean
  businessHoursStart?: string // HH:mm
  businessHoursEnd?: string // HH:mm
  businessHoursTimezone?: string
  conditions?: Record<string, unknown>
}

export interface SlackAlert {
  id: string
  alertType: SlackAlertType
  channelId: string
  channelName: string
  config: SlackAlertConfig
  isEnabled: boolean
  lastTriggeredAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SlackAlertCreate {
  alertType: SlackAlertType
  channelId: string
  channelName: string
  config: SlackAlertConfig
  isEnabled?: boolean
}

export interface SlackAlertUpdate {
  channelId?: string
  channelName?: string
  config?: Partial<SlackAlertConfig>
  isEnabled?: boolean
}

export interface SlackChannel {
  id: string
  name: string
}

// ============================================================
// BRI Analytics Types (Page 2)
// ============================================================

export type BRIChannel = 'chat' | 'voice' | 'email'

export interface BRIConversationVolume {
  totalConversations: MetricWithTrend
  byChannel: Array<{
    channel: BRIChannel
    count: number
    change: number
  }>
  peakTimes: Array<{ hour: number; count: number }>
  trend: Array<{ date: string; count: number }>
}

export interface BRIPerformanceMetrics {
  avgResponseTime: MetricWithTrend
  resolutionRate: MetricWithTrend
  escalationRate: MetricWithTrend
  csat: MetricWithTrend
}

export interface BRITopicAnalysis {
  topics: Array<{
    topic: string
    count: number
    avgResolutionTime: number
    trend: TrendDirection
  }>
  trendingIssues: Array<{ issue: string; count: number; changePercent: number }>
}

export interface BRIEfficiency {
  automatedResolutionRate: MetricWithTrend
  avgConfidenceScore: number
  humanHandoffRate: MetricWithTrend
  estimatedCostSavings: MetricWithTrend
}

export interface BRIQualityMetrics {
  accuracyRate: MetricWithTrend
  hallucinationRate: MetricWithTrend
  customerFeedback: Array<{ rating: number; count: number }>
}

export interface BRIAnalyticsData {
  conversationVolume: BRIConversationVolume
  performance: BRIPerformanceMetrics
  topics: BRITopicAnalysis
  efficiency: BRIEfficiency
  quality: BRIQualityMetrics
}

// ============================================================
// Pipeline / Funnel Types (Page 3)
// ============================================================

export interface PipelineStageMetrics {
  stage: 'awareness' | 'interest' | 'consideration' | 'conversion' | 'retention'
  metrics: Record<string, number>
  conversionToNext: number
  dropOffRate: number
  avgVelocityDays: number
}

export interface FunnelData {
  stages: PipelineStageMetrics[]
  overallConversionRate: number
  topDropOffStage: string
  trend: Array<{ date: string; conversions: number; conversionRate: number }>
}

export interface PipelineFilters {
  dateRange: DateRange
  channel?: string
  productCategory?: string
  customerSegment?: string
}

export interface PipelineData {
  funnel: FunnelData
  stageBreakdown: PipelineStageMetrics[]
  velocityAnalysis: Array<{
    transition: string
    avgDays: number
    trend: TrendDirection
  }>
}

// ============================================================
// P&L Breakdown Types (Page 4)
// ============================================================

export interface PLLineItem {
  id: string
  name: string
  amount: number
  previousAmount?: number
  change?: number
  percentOfRevenue: number
  trend?: Array<{ date: string; amount: number }>
  children?: PLLineItem[]
}

export interface PLSection {
  name: string
  items: PLLineItem[]
  total: number
  previousTotal?: number
  change?: number
  percentOfRevenue: number
}

export interface PLBreakdown {
  period: string
  periodType: PeriodType
  revenue: PLSection
  cogs: PLSection
  grossProfit: PLLineItem
  operatingExpenses: PLSection
  operatingProfit: PLLineItem // EBITDA
  otherExpenses: PLSection
  netProfit: PLLineItem
}

export interface PLViewOptions {
  periodType: PeriodType
  dateRange: DateRange
  compareWithPrevious: boolean
  showTrend: boolean
}

// ============================================================
// Reports Types (Page 5)
// ============================================================

export type ReportType = 'preset' | 'custom'

export type PresetReportId =
  | 'sales_summary'
  | 'product_performance'
  | 'customer_cohort'
  | 'channel_attribution'
  | 'subscription_health'
  | 'marketing_roi'

export interface ReportDimension {
  field: string
  label: string
  type: 'date' | 'string' | 'category'
}

export interface ReportMetric {
  field: string
  label: string
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max'
  format: 'number' | 'currency' | 'percent'
}

export interface ReportFilter {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains'
  value: unknown
}

export type VisualizationType = 'table' | 'line' | 'bar' | 'pie' | 'area' | 'heatmap'

export interface ReportConfig {
  dimensions: ReportDimension[]
  metrics: ReportMetric[]
  filters: ReportFilter[]
  visualization: VisualizationType
  sortBy?: { field: string; direction: 'asc' | 'desc' }
  limit?: number
}

export interface ReportSchedule {
  enabled: boolean
  cronExpression: string
  emailRecipients: string[]
  format: 'csv' | 'excel' | 'pdf'
}

export interface AnalyticsReport {
  id: string
  name: string
  type: ReportType
  presetId?: PresetReportId
  config: ReportConfig
  schedule: ReportSchedule | null
  createdBy: string | null
  lastRunAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ReportCreate {
  name: string
  type: ReportType
  presetId?: PresetReportId
  config: ReportConfig
  schedule?: ReportSchedule
}

export interface ReportUpdate {
  name?: string
  config?: Partial<ReportConfig>
  schedule?: ReportSchedule | null
}

export interface ReportRun {
  id: string
  reportId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  resultData: unknown | null
  errorMessage: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

export type ExportFormat = 'csv' | 'excel' | 'pdf'

// ============================================================
// Analytics Settings Types (Page 6)
// ============================================================

export interface DataSourceConnection {
  connected: boolean
  accountId?: string
  lastSyncAt: string | null
  error?: string
}

export interface DataSourcesSettings {
  shopify: DataSourceConnection
  googleAnalytics: DataSourceConnection & { propertyId?: string }
  meta: DataSourceConnection
  googleAds: DataSourceConnection
  tiktok: DataSourceConnection
  refreshFrequency: 'hourly' | 'daily' | 'manual'
  autoRefreshEnabled: boolean
}

export interface AttributionDisplaySettings {
  defaultWindow: string
  defaultModel: string
  crossDeviceTracking: boolean
}

export interface TargetMetric {
  id: string
  metric: 'revenue' | 'cac' | 'ltv' | 'roas' | 'aov' | 'conversion_rate'
  targetValue: number
  period: 'monthly' | 'quarterly' | 'yearly'
  periodStart: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface TargetCreate {
  metric: TargetMetric['metric']
  targetValue: number
  period: TargetMetric['period']
  periodStart: string
  notes?: string
}

export interface DisplayPreferences {
  defaultDateRange: DateRangePreset
  currency: string
  timezone: string
  fiscalYearStartMonth: number // 1-12
}

export interface ExportSettings {
  defaultFormat: ExportFormat
  includeHeaders: boolean
  dateFormat: string
}

export interface AnalyticsSettings {
  id: string
  dataSources: DataSourcesSettings
  attribution: AttributionDisplaySettings
  display: DisplayPreferences
  export: ExportSettings
  createdAt: string
  updatedAt: string
}

export interface AnalyticsSettingsUpdate {
  dataSources?: Partial<DataSourcesSettings>
  attribution?: Partial<AttributionDisplaySettings>
  display?: Partial<DisplayPreferences>
  export?: Partial<ExportSettings>
}

// ============================================================
// Dashboard Overview Types
// ============================================================

export interface AnalyticsOverview {
  revenue: MetricWithTrend
  orders: MetricWithTrend
  customers: MetricWithTrend
  aov: MetricWithTrend
  conversionRate: MetricWithTrend
  adSpend: MetricWithTrend
  roas: MetricWithTrend
}
