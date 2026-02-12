/**
 * Types for creator admin analytics
 */

// Period options for analytics queries
export type AnalyticsPeriod = '7d' | '30d' | '90d' | '12m' | 'all'

// KPI Overview types
export interface CreatorKPI {
  value: number
  previousValue: number
  change: number
  changePercent: number
}

export interface CreatorOverviewKPIs {
  totalCreators: CreatorKPI
  activeCreators: CreatorKPI
  newApplicationsWeek: CreatorKPI
  newApplicationsMonth: CreatorKPI
  approvalRate: CreatorKPI
  avgTimeToApproval: CreatorKPI
  churnRate: CreatorKPI
  avgCreatorLTV: CreatorKPI
}

// Application Funnel types
export interface FunnelStage {
  name: string
  count: number
  conversionRate: number
  dropOffRate: number
  avgTimeInStage: number // days
  previousCount: number
  trend: number
}

export interface ApplicationFunnel {
  stages: FunnelStage[]
  period: AnalyticsPeriod
  totalApplications: number
  totalConverted: number
  overallConversionRate: number
}

// Performance Leaderboard types
export type LeaderboardMetric = 'earnings' | 'projects' | 'response_time' | 'delivery_speed' | 'quality'

export interface LeaderboardEntry {
  creatorId: string
  creatorName: string
  avatarUrl: string | null
  tier: string | null
  value: number
  formattedValue: string
  rank: number
  previousRank: number | null
  trend: 'up' | 'down' | 'same' | 'new'
}

export interface PerformanceLeaderboard {
  metric: LeaderboardMetric
  period: AnalyticsPeriod
  entries: LeaderboardEntry[]
  totalCount: number
}

// Earnings Analytics types
export interface EarningsBracket {
  label: string
  min: number
  max: number
  count: number
  percentage: number
}

export interface EarningsTimeSeries {
  date: string
  totalEarnings: number
  payouts: number
  pending: number
  creatorCount: number
}

export interface EarningsAnalytics {
  period: AnalyticsPeriod
  totalPayouts: number
  totalPending: number
  avgEarningsPerCreator: number
  medianEarnings: number
  commissionConversionRate: number
  roas: number
  distribution: EarningsBracket[]
  timeSeries: EarningsTimeSeries[]
  topCreatorsShare: number // % of earnings from top 10%
  payoutMethodBreakdown: { method: string; count: number; amount: number }[]
}

// Creator Health types
export type HealthCategory = 'champions' | 'healthy' | 'at_risk' | 'inactive' | 'churned'

export interface HealthScore {
  creatorId: string
  creatorName: string
  avatarUrl: string | null
  email: string
  score: number
  category: HealthCategory
  components: {
    activity: number
    earnings: number
    response: number
    delivery: number
    engagement: number
  }
  lastActivity: string | null
  indicators: string[]
}

export interface CreatorHealthDashboard {
  distribution: Record<HealthCategory, number>
  atRiskCreators: HealthScore[]
  pendingActions: {
    onboardingIncomplete: number
    taxFormsMissing: number
    payoutSetupMissing: number
  }
  churnPrediction: {
    creatorId: string
    creatorName: string
    probability: number
    factors: string[]
  }[]
}

// Pipeline Analytics types
export interface PipelineStageMetrics {
  stage: string
  count: number
  avgDaysInStage: number
  wipLimit: number | null
  overLimit: boolean
}

export interface PipelineAnalytics {
  period: AnalyticsPeriod
  totalValueAtRisk: number
  avgTimeInPipeline: number
  bottleneckStage: string | null
  throughputPerWeek: number
  avgLeadTime: number
  stages: PipelineStageMetrics[]
}

// Export types
export type ExportReportType = 'funnel' | 'performance' | 'earnings' | 'health' | 'all'
export type ExportFormat = 'csv' | 'xlsx'

export interface ExportOptions {
  type: ExportReportType
  format: ExportFormat
  period: AnalyticsPeriod
  filters?: {
    tier?: string
    country?: string
  }
}

// Creator stats for individual view
export interface IndividualCreatorStats {
  creatorId: string
  lifetimeEarnings: number
  ytdEarnings: number
  thisMonthEarnings: number
  totalProjects: number
  thisMonthProjects: number
  avgProjectValue: number
  onTimeDeliveryRate: number
  responseTimeAvg: number
  revisionRate: number
  activeSince: string
  lastActivityDate: string | null
  healthScore: number
  healthCategory: HealthCategory
}

// Response metrics for individual creator
export interface CreatorResponseMetrics {
  id: string
  creatorId: string
  metricDate: string
  messagesReceived: number
  messagesResponded: number
  avgResponseTimeMinutes: number | null
  medianResponseTimeMinutes: number | null
  projectsStarted: number
  projectsSubmitted: number
  projectsApproved: number
  projectsRevisionRequested: number
  avgDeliveryDays: number | null
  filesUploaded: number
  logins: number
  portalTimeMinutes: number
}

// Analytics snapshot for dashboard caching
export interface CreatorAnalyticsSnapshot {
  id: string
  snapshotDate: string
  snapshotType: 'daily' | 'weekly' | 'monthly'
  totalCreators: number
  activeCreators: number
  pendingCreators: number
  inactiveCreators: number
  churnedCreators: number
  applicationsReceived: number
  applicationsApproved: number
  applicationsRejected: number
  onboardingStarted: number
  onboardingCompleted: number
  totalEarningsCents: number
  totalPendingCents: number
  totalPayoutsCents: number
  avgEarningsCents: number
  projectsCreated: number
  projectsCompleted: number
  avgProjectValueCents: number
  avgDeliveryDays: number | null
  avgResponseHours: number | null
  healthDistribution: Record<HealthCategory, number>
  createdAt: string
}
