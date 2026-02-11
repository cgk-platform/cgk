/**
 * Attribution Types
 *
 * Types for attribution settings, touchpoints, conversions, and data quality.
 */

// ============================================================
// Attribution Models and Windows
// ============================================================

export type AttributionModel =
  | 'first_touch'
  | 'last_touch'
  | 'linear'
  | 'time_decay'
  | 'position_based'
  | 'data_driven'
  | 'last_non_direct'

export type AttributionWindow = '1d' | '3d' | '7d' | '14d' | '28d' | '30d' | '90d' | 'ltv'

export type AttributionMode = 'clicks_only' | 'clicks_plus_views'

export type FairingSyncInterval = 'hourly' | 'daily' | 'manual'

export const ATTRIBUTION_MODELS: { value: AttributionModel; label: string; description: string }[] = [
  { value: 'first_touch', label: 'First Touch', description: '100% credit to the first touchpoint' },
  { value: 'last_touch', label: 'Last Touch', description: '100% credit to the last touchpoint' },
  { value: 'linear', label: 'Linear', description: 'Equal credit to all touchpoints' },
  { value: 'time_decay', label: 'Time Decay', description: 'More credit to recent touchpoints' },
  { value: 'position_based', label: 'Position Based', description: '40% first, 20% middle, 40% last' },
  { value: 'data_driven', label: 'Data Driven', description: 'ML-based credit distribution' },
  { value: 'last_non_direct', label: 'Last Non-Direct', description: 'Last non-direct touchpoint' },
]

export const ATTRIBUTION_WINDOWS: { value: AttributionWindow; label: string }[] = [
  { value: '1d', label: '1 Day' },
  { value: '3d', label: '3 Days' },
  { value: '7d', label: '7 Days' },
  { value: '14d', label: '14 Days' },
  { value: '28d', label: '28 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'ltv', label: 'Lifetime' },
]

// ============================================================
// Position Based Weights
// ============================================================

export interface PositionBasedWeights {
  first: number
  middle: number
  last: number
}

// ============================================================
// Attribution Settings
// ============================================================

export interface AttributionSettings {
  id: string
  tenantId: string

  // Global settings
  enabled: boolean
  defaultModel: AttributionModel
  defaultWindow: AttributionWindow
  attributionMode: AttributionMode

  // Enabled models and windows
  enabledModels: AttributionModel[]
  enabledWindows: AttributionWindow[]

  // Model-specific configuration
  timeDecayHalfLifeHours: number
  positionBasedWeights: PositionBasedWeights

  // Fairing integration
  fairingBridgeEnabled: boolean
  fairingSyncInterval: FairingSyncInterval
  fairingLastSyncAt: string | null

  createdAt: string
  updatedAt: string
  updatedBy: string | null
}

export interface AttributionSettingsUpdate {
  enabled?: boolean
  defaultModel?: AttributionModel
  defaultWindow?: AttributionWindow
  attributionMode?: AttributionMode
  enabledModels?: AttributionModel[]
  enabledWindows?: AttributionWindow[]
  timeDecayHalfLifeHours?: number
  positionBasedWeights?: PositionBasedWeights
  fairingBridgeEnabled?: boolean
  fairingSyncInterval?: FairingSyncInterval
}

// ============================================================
// Touchpoints
// ============================================================

export type TouchpointType = 'click' | 'view' | 'engagement'

export interface AttributionTouchpoint {
  id: string
  tenantId: string

  // Visitor/session info
  visitorId: string
  sessionId: string | null
  customerId: string | null

  // Channel and source info
  channel: string
  source: string | null
  medium: string | null
  campaign: string | null
  content: string | null
  term: string | null

  // Platform-specific identifiers
  platform: string | null
  adId: string | null
  adsetId: string | null
  campaignId: string | null

  // Click identifiers
  fbclid: string | null
  gclid: string | null
  ttclid: string | null
  msclkid: string | null
  nbt: string | null

  // Interaction type
  touchpointType: TouchpointType
  landingPage: string | null
  referrer: string | null

  // Device info
  deviceType: string | null
  deviceFingerprint: string | null

  occurredAt: string
  createdAt: string
}

// ============================================================
// Conversions
// ============================================================

export type ConversionType = 'purchase' | 'signup' | 'lead' | 'add_to_cart' | 'custom'

export interface AttributionConversion {
  id: string
  tenantId: string

  orderId: string
  orderNumber: string | null
  customerId: string | null

  revenue: number
  currency: string

  conversionType: ConversionType
  isFirstPurchase: boolean

  convertedAt: string
  createdAt: string
}

// ============================================================
// Attribution Results
// ============================================================

export interface AttributionResult {
  id: string
  tenantId: string

  conversionId: string
  touchpointId: string

  model: AttributionModel
  window: AttributionWindow

  credit: number
  attributedRevenue: number

  touchpointPosition: number
  totalTouchpoints: number

  calculatedAt: string
}

// ============================================================
// Dashboard Overview Types
// ============================================================

export interface AttributionKPIs {
  revenue: { value: number; change: number }
  conversions: { value: number; change: number }
  roas: { value: number; change: number }
  mer: { value: number; change: number }
}

export interface ChannelBreakdown {
  channel: string
  revenue: number
  spend: number
  conversions: number
  roas: number
}

export interface PlatformComparison {
  platform: 'meta' | 'google' | 'tiktok' | 'organic' | 'direct' | 'email' | 'other'
  spend: number
  revenue: number
  roas: number
  conversions: number
}

export interface AttributionOverview {
  kpis: AttributionKPIs
  channelBreakdown: ChannelBreakdown[]
  platformComparison: PlatformComparison[]
}

// ============================================================
// Data Quality Types
// ============================================================

export type HealthStatus = 'healthy' | 'warning' | 'error'

export interface PixelHealth {
  ga4: { status: HealthStatus; lastEvent: string | null; eventCount24h: number }
  meta: { status: HealthStatus; emqScore: number; lastEvent: string | null }
  tiktok: { status: HealthStatus; lastEvent: string | null; eventCount24h: number }
}

export interface VisitCoverage {
  sessionId: number
  visitorId: number
  emailHash: number
  deviceFingerprint: number
}

export interface ServerSideEvents {
  ga4: { enabled: boolean; successRate: number }
  metaCapi: { enabled: boolean; matchQuality: number }
  tiktokApi: { enabled: boolean; successRate: number }
}

export interface WebhookQueueHealth {
  pending: number
  failed: number
  processingRate: number
  avgLatencyMs: number
}

export interface DeviceGraphMetrics {
  crossDeviceMatchRate: number
  identityResolutionRate: number
  visitorsLinked: number
}

export interface DataQualityMetrics {
  coverageScore: number
  coverageTrend: Array<{ date: string; score: number }>
  pixelHealth: PixelHealth
  visitCoverage: VisitCoverage
  serverSideEvents: ServerSideEvents
  webhookQueue: WebhookQueueHealth
  deviceGraph: DeviceGraphMetrics
}

export interface DataQualitySnapshot {
  id: string
  tenantId: string

  coverageScore: number
  ordersWithAttribution: number
  totalOrders: number

  sessionIdCoverage: number
  visitorIdCoverage: number
  emailHashCoverage: number
  deviceFingerprintCoverage: number

  pixelHealth: PixelHealth
  serverSideEvents: ServerSideEvents

  webhookPending: number
  webhookFailed: number
  webhookProcessingRate: number
  webhookAvgLatencyMs: number

  crossDeviceMatchRate: number
  identityResolutionRate: number
  visitorsLinked: number

  snapshotDate: string
  createdAt: string
}

// ============================================================
// Setup Wizard Types
// ============================================================

export interface PlatformConnection {
  platform: 'meta' | 'google' | 'tiktok'
  connected: boolean
  accountId: string | null
  lastSyncAt: string | null
}

export interface PixelVerification {
  firstParty: boolean
  ga4: boolean
  meta: boolean
}

export interface SetupWizardState {
  currentStep: number
  completedSteps: number[]
  platformConnections: {
    meta: boolean
    google: boolean
    tiktok: boolean
  }
  pixelVerified: PixelVerification
  testConversionPassed: boolean
}

// ============================================================
// Time Range Types
// ============================================================

export type TimeRangePreset = '7d' | '14d' | '28d' | '30d' | '90d' | 'custom'

export interface TimeRange {
  preset: TimeRangePreset
  startDate: string
  endDate: string
}

// ============================================================
// Channel Summary (Aggregated)
// ============================================================

export interface ChannelSummary {
  id: string
  tenantId: string

  date: string
  model: AttributionModel
  window: AttributionWindow

  channel: string
  platform: string | null

  touchpoints: number
  conversions: number
  revenue: number
  spend: number

  roas: number | null
  cpa: number | null
  conversionRate: number | null

  createdAt: string
  updatedAt: string
}

// ============================================================
// Customer Journey Types
// ============================================================

export interface JourneyTouchpoint {
  id: string
  timestamp: string
  channel: string
  platform?: string
  campaign?: string
  adSet?: string
  ad?: string
  device: string
  browser?: string
  creditByModel: Record<AttributionModel, number>
}

export interface CustomerJourney {
  conversionId: string
  orderId: string
  orderNumber: string
  orderTotal: number
  customerEmail: string
  isNewCustomer: boolean
  conversionDate: string
  touchpointCount: number
  touchpoints: JourneyTouchpoint[]
}

export interface PathAnalysis {
  commonPaths: Array<{
    path: string[]
    count: number
    avgOrderValue: number
  }>
  avgTouchpoints: number
  avgTimeToConversion: number
  pathLengthDistribution: Array<{ length: number; count: number }>
}

export interface JourneysListParams {
  search?: string
  customerType?: 'all' | 'new' | 'returning'
  window?: AttributionWindow
  limit?: number
  offset?: number
}

// ============================================================
// Media Mix Modeling (MMM) Types
// ============================================================

export type MMMStatus = 'draft' | 'running' | 'completed' | 'failed'

export interface MMMModelFit {
  r2: number
  mape: number
  bayesianR2: number
}

export interface MMMChannelResult {
  channel: string
  contributionPercent: number
  currentRoi: number
  marginalRoi: number
  saturationPoint: number
  optimalSpend: number
  currentSpend: number
}

export interface SaturationCurvePoint {
  spend: number
  revenue: number
}

export interface SaturationCurve {
  channel: string
  curve: SaturationCurvePoint[]
}

export interface MMMModel {
  id: string
  tenantId: string
  status: MMMStatus
  channels: string[]
  dateRangeStart: string
  dateRangeEnd: string
  modelFit: MMMModelFit | null
  results: MMMResults | null
  createdAt: string
  completedAt: string | null
}

export interface MMMResults {
  modelId: string
  status: MMMStatus
  lastRunAt: string
  modelFit: MMMModelFit
  channels: MMMChannelResult[]
  saturationCurves: SaturationCurve[]
}

export interface BudgetOptimizationRequest {
  totalBudget: number
  constraints?: Record<string, { min?: number; max?: number }>
}

export interface BudgetOptimizationResult {
  currentAllocation: Record<string, number>
  optimizedAllocation: Record<string, number>
  projectedRevenue: {
    current: number
    optimized: number
    lift: number
    liftPercent: number
  }
}

// ============================================================
// Incrementality Testing Types
// ============================================================

export type IncrementalityPlatform = 'meta' | 'google' | 'tiktok'
export type IncrementalityStatus = 'draft' | 'running' | 'completed' | 'cancelled'

export interface IncrementalityResults {
  incrementalLiftPercent: number
  incrementalRevenue: number
  pValue: number
  isSignificant: boolean
  confidenceInterval: { lower: number; upper: number }
  recommendation: string
}

export interface IncrementalityExperiment {
  id: string
  tenantId: string
  name: string
  platform: IncrementalityPlatform
  status: IncrementalityStatus
  testRegions: string[]
  controlRegions: string[]
  startDate: string
  endDate: string
  preTestDays: number
  budgetEstimate: number | null
  results: IncrementalityResults | null
  createdAt: string
  updatedAt: string
}

export interface CreateExperimentRequest {
  name: string
  platform: IncrementalityPlatform
  testRegions: string[]
  controlRegions: string[]
  startDate: string
  endDate: string
  preTestDays?: number
  budgetEstimate?: number
}

export interface ExperimentPerformanceData {
  date: string
  testSpend: number
  testConversions: number
  testRevenue: number
  controlSpend: number
  controlConversions: number
  controlRevenue: number
}

// ============================================================
// AI Insights Types
// ============================================================

export type AnomalyType = 'spike' | 'drop' | 'pattern_break' | 'outlier'
export type Severity = 'critical' | 'warning' | 'info'
export type Confidence = 'high' | 'medium' | 'low'
export type TrendDirection = 'up' | 'down' | 'stable'
export type Priority = 'high' | 'medium' | 'low'

export interface Anomaly {
  id: string
  type: AnomalyType
  severity: Severity
  metric: string
  dateRange: { start: string; end: string }
  description: string
  confidence: Confidence
  recommendation: string
}

export interface Trend {
  id: string
  direction: TrendDirection
  metric: string
  magnitude: number
  period: string
  description: string
  projectedImpact: string
}

export interface Recommendation {
  id: string
  priority: Priority
  title: string
  description: string
  estimatedImpact: string
  actionSteps: string[]
}

export interface AIInsightsData {
  dateRange: { start: string; end: string }
  executiveSummary: string
  healthScore: number
  anomalies: Anomaly[]
  trends: Trend[]
  recommendations: Recommendation[]
  generatedAt: string
}

export interface AIInsightsCache {
  id: string
  tenantId: string
  dateRangeStart: string
  dateRangeEnd: string
  insights: AIInsightsData
  generatedAt: string
}

// ============================================================
// Channel Analytics Types (Hierarchical Drill-down)
// ============================================================

export type ChannelLevel = 'channel' | 'campaign' | 'adset' | 'ad'

export type CustomerType = 'new' | 'existing' | 'all'

export type QuickFilter = 'all' | 'top_performers' | 'underperformers' | 'high_volume' | 'efficient'

export interface ChannelHierarchy {
  level: ChannelLevel
  id: string
  name: string
  parentId: string | null
  spend: number
  revenue: number
  conversions: number
  roas: number
  cpa: number
  newCustomerRevenue: number
  existingCustomerRevenue: number
  children?: ChannelHierarchy[]
}

export interface ChannelTrendPoint {
  date: string
  revenue: number
  roas: number
  conversions: number
}

export interface ChannelFilters {
  customerType: CustomerType
  quickFilter: QuickFilter
}

// ============================================================
// Product Attribution Types
// ============================================================

export type ProductViewMode = 'product' | 'platform' | 'campaign' | 'ad'

export interface ProductAttribution {
  id: string
  name: string
  imageUrl?: string
  spend: number
  revenue: number
  roas: number
  cac: number
  conversions: number
  newCustomerPercent: number
  roasIndex: number
  cacIndex: number
  platform?: string
  campaignId?: string
}

export interface ProductBenchmarks {
  roasBenchmark: number
  cacBenchmark: number
}

// ============================================================
// Creative Analytics Types
// ============================================================

export type CreativeType = 'image' | 'video'
export type CreativeStatus = 'active' | 'inactive'
export type CreativePlatform = 'meta' | 'google' | 'tiktok'

export interface CreativePerformance {
  id: string
  name: string
  platform: CreativePlatform
  thumbnailUrl: string
  type: CreativeType
  status: CreativeStatus
  spend: number
  revenue: number
  roas: number
  conversions: number
  impressions: number
  clicks: number
  ctr: number
  newCustomerRevenue: number
  existingCustomerRevenue: number
  visitCoverage: number
}

export interface CreativeSavedView {
  id: string
  tenantId: string
  name: string
  filters: CreativeFilters
  createdAt: string
  updatedAt: string
}

export interface CreativeFilters {
  search?: string
  sortBy?: 'revenue' | 'roas' | 'conversions'
  sortOrder?: 'asc' | 'desc'
  hideInactive?: boolean
  platforms?: CreativePlatform[]
}

// ============================================================
// Cohort Analysis Types
// ============================================================

export type CohortGrouping = 'daily' | 'weekly' | 'monthly'
export type CohortHealth = 'healthy' | 'at_risk' | 'poor'

export interface CohortLTV {
  day0: number
  day7: number
  day30: number
  day60: number
  day90: number
  day180: number
}

export interface CohortData {
  cohortDate: string
  grouping: CohortGrouping
  customerCount: number
  cac: number
  ltv: CohortLTV
  paybackDays: number | null
  retention90d: number
  health: CohortHealth
  channel?: string
}

// ============================================================
// ROAS Index Types
// ============================================================

export interface ModelRoasResult {
  revenue: number
  roas: number
  conversions: number
}

export type AIConfidence = 'high' | 'medium' | 'low'

export interface AIRecommendation {
  recommendedModel: AttributionModel
  confidence: AIConfidence
  reasoning: string
}

export interface RoasIndexData {
  channel: string
  modelResults: Record<AttributionModel, ModelRoasResult>
  aiRecommendation?: AIRecommendation
}

// ============================================================
// Model Comparison Types
// ============================================================

export interface CreditDistribution {
  channel: string
  percentage: number
}

export interface ModelComparisonData {
  model: AttributionModel
  description: string
  totalRevenue: number
  totalConversions: number
  totalSpend: number
  roas: number
  topChannel: string
  creditDistribution: CreditDistribution[]
}
