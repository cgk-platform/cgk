/**
 * AI Insights Engine
 *
 * Generates AI-powered insights from attribution data using anomaly detection,
 * trend analysis, and recommendation generation.
 */

import { sql } from '@cgk/db'

import type {
  AIInsightsData,
  Anomaly,
  Recommendation,
  Trend,
  TrendDirection,
} from './types'

// ============================================================
// Main Insights Generation
// ============================================================

export async function generateAIInsights(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<AIInsightsData> {
  const channelMetrics = await getChannelMetrics(tenantId, startDate, endDate)
  const dailyMetrics = await getDailyMetrics(tenantId, startDate, endDate)

  const anomalies = detectAnomalies(dailyMetrics, channelMetrics)
  const trends = analyzeTrends(dailyMetrics)
  const recommendations = generateRecommendations(channelMetrics, anomalies, trends)

  const healthScore = calculateHealthScore(channelMetrics, anomalies)
  const executiveSummary = generateExecutiveSummary(channelMetrics, anomalies, trends)

  return {
    dateRange: { start: startDate, end: endDate },
    executiveSummary,
    healthScore,
    anomalies,
    trends,
    recommendations,
    generatedAt: new Date().toISOString(),
  }
}

// ============================================================
// Data Fetching
// ============================================================

interface ChannelMetric {
  channel: string
  revenue: number
  spend: number
  conversions: number
  roas: number
  previousRevenue: number
  previousSpend: number
  previousConversions: number
}

interface DailyMetric {
  date: string
  revenue: number
  spend: number
  conversions: number
  roas: number
}

async function getChannelMetrics(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<ChannelMetric[]> {
  const startDateObj = new Date(startDate)
  const endDateObj = new Date(endDate)
  const periodDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24))

  const previousStartDate = new Date(startDateObj.getTime() - periodDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]
  const previousEndDate = new Date(startDateObj.getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const result = await sql`
    WITH current_period AS (
      SELECT
        channel,
        COALESCE(SUM(revenue), 0) as revenue,
        COALESCE(SUM(spend), 0) as spend,
        COALESCE(SUM(conversions), 0) as conversions
      FROM attribution_channel_summary
      WHERE tenant_id = ${tenantId}
        AND date >= ${startDate}::date
        AND date <= ${endDate}::date
      GROUP BY channel
    ),
    previous_period AS (
      SELECT
        channel,
        COALESCE(SUM(revenue), 0) as revenue,
        COALESCE(SUM(spend), 0) as spend,
        COALESCE(SUM(conversions), 0) as conversions
      FROM attribution_channel_summary
      WHERE tenant_id = ${tenantId}
        AND date >= ${previousStartDate}::date
        AND date <= ${previousEndDate}::date
      GROUP BY channel
    )
    SELECT
      COALESCE(c.channel, p.channel) as channel,
      COALESCE(c.revenue, 0) as revenue,
      COALESCE(c.spend, 0) as spend,
      COALESCE(c.conversions, 0) as conversions,
      COALESCE(p.revenue, 0) as "previousRevenue",
      COALESCE(p.spend, 0) as "previousSpend",
      COALESCE(p.conversions, 0) as "previousConversions"
    FROM current_period c
    FULL OUTER JOIN previous_period p ON c.channel = p.channel
    ORDER BY c.revenue DESC NULLS LAST
  `

  return result.rows.map((row) => {
    const r = row as Record<string, unknown>
    const revenue = Number(r.revenue)
    const spend = Number(r.spend)
    return {
      channel: r.channel as string,
      revenue,
      spend,
      conversions: Number(r.conversions),
      roas: spend > 0 ? revenue / spend : 0,
      previousRevenue: Number(r.previousRevenue),
      previousSpend: Number(r.previousSpend),
      previousConversions: Number(r.previousConversions),
    }
  })
}

async function getDailyMetrics(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<DailyMetric[]> {
  const result = await sql`
    SELECT
      date,
      COALESCE(SUM(revenue), 0) as revenue,
      COALESCE(SUM(spend), 0) as spend,
      COALESCE(SUM(conversions), 0) as conversions
    FROM attribution_channel_summary
    WHERE tenant_id = ${tenantId}
      AND date >= ${startDate}::date
      AND date <= ${endDate}::date
    GROUP BY date
    ORDER BY date
  `

  return result.rows.map((row) => {
    const r = row as Record<string, unknown>
    const revenue = Number(r.revenue)
    const spend = Number(r.spend)
    return {
      date: (r.date as Date).toISOString().split('T')[0] ?? '',
      revenue,
      spend,
      conversions: Number(r.conversions),
      roas: spend > 0 ? revenue / spend : 0,
    }
  })
}

// ============================================================
// Anomaly Detection
// ============================================================

function detectAnomalies(
  dailyMetrics: DailyMetric[],
  channelMetrics: ChannelMetric[]
): Anomaly[] {
  const anomalies: Anomaly[] = []
  let anomalyId = 1

  // Detect daily anomalies using z-score
  const revenueStats = calculateStats(dailyMetrics.map((d) => d.revenue))
  const conversionStats = calculateStats(dailyMetrics.map((d) => d.conversions))

  for (const day of dailyMetrics) {
    const revenueZScore = calculateZScore(day.revenue, revenueStats)
    const conversionZScore = calculateZScore(day.conversions, conversionStats)

    if (Math.abs(revenueZScore) > 2) {
      const isSpike = revenueZScore > 0
      anomalies.push({
        id: `anomaly_${anomalyId++}`,
        type: isSpike ? 'spike' : 'drop',
        severity: Math.abs(revenueZScore) > 3 ? 'critical' : 'warning',
        metric: 'Revenue',
        dateRange: { start: day.date, end: day.date },
        description: `${isSpike ? 'Unusual spike' : 'Significant drop'} in revenue on ${day.date}. Value was ${Math.abs(revenueZScore).toFixed(1)} standard deviations ${isSpike ? 'above' : 'below'} average.`,
        confidence: Math.abs(revenueZScore) > 3 ? 'high' : 'medium',
        recommendation: isSpike
          ? 'Investigate what campaigns or promotions drove this increase to replicate success.'
          : 'Review marketing spend and campaign performance for this date. Check for technical issues.',
      })
    }

    if (Math.abs(conversionZScore) > 2.5) {
      const isSpike = conversionZScore > 0
      anomalies.push({
        id: `anomaly_${anomalyId++}`,
        type: isSpike ? 'spike' : 'drop',
        severity: Math.abs(conversionZScore) > 3 ? 'critical' : 'warning',
        metric: 'Conversions',
        dateRange: { start: day.date, end: day.date },
        description: `${isSpike ? 'Unusual increase' : 'Notable decrease'} in conversions on ${day.date}.`,
        confidence: Math.abs(conversionZScore) > 3 ? 'high' : 'medium',
        recommendation: isSpike
          ? 'Analyze which channels and campaigns contributed to this spike.'
          : 'Check for tracking issues or significant changes in ad spend.',
      })
    }
  }

  // Detect channel performance anomalies
  for (const channel of channelMetrics) {
    if (channel.previousRevenue > 0) {
      const revenueChange = ((channel.revenue - channel.previousRevenue) / channel.previousRevenue) * 100

      if (Math.abs(revenueChange) > 50) {
        const isIncrease = revenueChange > 0
        anomalies.push({
          id: `anomaly_${anomalyId++}`,
          type: 'pattern_break',
          severity: Math.abs(revenueChange) > 75 ? 'critical' : 'warning',
          metric: `${channel.channel} Channel Revenue`,
          dateRange: { start: dailyMetrics[0]?.date ?? '', end: dailyMetrics[dailyMetrics.length - 1]?.date ?? '' },
          description: `${channel.channel} revenue ${isIncrease ? 'increased' : 'decreased'} by ${Math.abs(revenueChange).toFixed(0)}% compared to the previous period.`,
          confidence: 'high',
          recommendation: isIncrease
            ? `Scale ${channel.channel} campaigns carefully while monitoring ROAS.`
            : `Review ${channel.channel} campaign performance and audience targeting.`,
        })
      }
    }

    // ROAS outlier detection
    if (channel.roas > 0) {
      const avgRoas = channelMetrics.reduce((sum, c) => sum + c.roas, 0) / channelMetrics.length
      if (channel.roas < avgRoas * 0.5 && channel.spend > 1000) {
        anomalies.push({
          id: `anomaly_${anomalyId++}`,
          type: 'outlier',
          severity: 'warning',
          metric: `${channel.channel} ROAS`,
          dateRange: { start: dailyMetrics[0]?.date ?? '', end: dailyMetrics[dailyMetrics.length - 1]?.date ?? '' },
          description: `${channel.channel} ROAS (${channel.roas.toFixed(2)}x) is significantly below average (${avgRoas.toFixed(2)}x).`,
          confidence: 'medium',
          recommendation: `Consider reallocating budget from ${channel.channel} to higher-performing channels.`,
        })
      }
    }
  }

  return anomalies.slice(0, 10) // Limit to top 10 anomalies
}

// ============================================================
// Trend Analysis
// ============================================================

function analyzeTrends(dailyMetrics: DailyMetric[]): Trend[] {
  const trends: Trend[] = []
  let trendId = 1

  if (dailyMetrics.length < 7) return trends

  // Revenue trend
  const revenueSlope = calculateLinearSlope(dailyMetrics.map((d) => d.revenue))
  const avgRevenue = dailyMetrics.reduce((sum, d) => sum + d.revenue, 0) / dailyMetrics.length
  const revenueTrendPercent = avgRevenue > 0 ? (revenueSlope * dailyMetrics.length / avgRevenue) * 100 : 0

  if (Math.abs(revenueTrendPercent) > 10) {
    const direction: TrendDirection = revenueTrendPercent > 0 ? 'up' : 'down'
    trends.push({
      id: `trend_${trendId++}`,
      direction,
      metric: 'Revenue',
      magnitude: Math.abs(revenueTrendPercent),
      period: `Last ${dailyMetrics.length} days`,
      description: `Revenue is trending ${direction === 'up' ? 'upward' : 'downward'} with a ${Math.abs(revenueTrendPercent).toFixed(1)}% change over the period.`,
      projectedImpact: direction === 'up'
        ? `If this trend continues, expect ${(Math.abs(revenueTrendPercent) * 1.5).toFixed(0)}% growth next month.`
        : `Without intervention, revenue could decline ${(Math.abs(revenueTrendPercent) * 1.5).toFixed(0)}% next month.`,
    })
  }

  // ROAS trend
  const roasSlope = calculateLinearSlope(dailyMetrics.map((d) => d.roas))
  const avgRoas = dailyMetrics.reduce((sum, d) => sum + d.roas, 0) / dailyMetrics.length
  const roasTrendPercent = avgRoas > 0 ? (roasSlope * dailyMetrics.length / avgRoas) * 100 : 0

  if (Math.abs(roasTrendPercent) > 15) {
    const direction: TrendDirection = roasTrendPercent > 0 ? 'up' : 'down'
    trends.push({
      id: `trend_${trendId++}`,
      direction,
      metric: 'ROAS',
      magnitude: Math.abs(roasTrendPercent),
      period: `Last ${dailyMetrics.length} days`,
      description: `Return on Ad Spend is ${direction === 'up' ? 'improving' : 'declining'} over the analysis period.`,
      projectedImpact: direction === 'up'
        ? 'Marketing efficiency is improving. Consider increasing budget allocation.'
        : 'Marketing efficiency is declining. Review campaign targeting and creative performance.',
    })
  }

  // Conversion trend
  const conversionSlope = calculateLinearSlope(dailyMetrics.map((d) => d.conversions))
  const avgConversions = dailyMetrics.reduce((sum, d) => sum + d.conversions, 0) / dailyMetrics.length
  const conversionTrendPercent = avgConversions > 0 ? (conversionSlope * dailyMetrics.length / avgConversions) * 100 : 0

  if (Math.abs(conversionTrendPercent) > 10) {
    const direction: TrendDirection = conversionTrendPercent > 0 ? 'up' : 'down'
    trends.push({
      id: `trend_${trendId++}`,
      direction,
      metric: 'Conversions',
      magnitude: Math.abs(conversionTrendPercent),
      period: `Last ${dailyMetrics.length} days`,
      description: `Conversion volume is ${direction === 'up' ? 'increasing' : 'decreasing'} steadily.`,
      projectedImpact: direction === 'up'
        ? 'Growing conversion volume indicates healthy demand.'
        : 'Declining conversions may require funnel optimization or audience expansion.',
    })
  }

  return trends.slice(0, 5) // Limit to top 5 trends
}

// ============================================================
// Recommendation Generation
// ============================================================

function generateRecommendations(
  channelMetrics: ChannelMetric[],
  anomalies: Anomaly[],
  trends: Trend[]
): Recommendation[] {
  const recommendations: Recommendation[] = []
  let recId = 1

  // Budget reallocation recommendation
  const sortedByRoas = [...channelMetrics].sort((a, b) => b.roas - a.roas)
  const topChannel = sortedByRoas[0]
  const bottomChannel = sortedByRoas[sortedByRoas.length - 1]

  if (topChannel && bottomChannel && topChannel.roas > bottomChannel.roas * 1.5) {
    recommendations.push({
      id: `rec_${recId++}`,
      priority: 'high',
      title: 'Optimize Budget Allocation',
      description: `${topChannel.channel} is significantly outperforming ${bottomChannel.channel} on ROAS. Consider reallocating budget.`,
      estimatedImpact: `Potential ${Math.round((topChannel.roas / bottomChannel.roas - 1) * 20)}% improvement in overall ROAS.`,
      actionSteps: [
        `Reduce ${bottomChannel.channel} budget by 20-30%`,
        `Reallocate funds to ${topChannel.channel}`,
        'Monitor performance for 2 weeks before further changes',
        'Review audience overlap between channels',
      ],
    })
  }

  // Address critical anomalies
  const criticalAnomalies = anomalies.filter((a) => a.severity === 'critical')
  if (criticalAnomalies.length > 0) {
    recommendations.push({
      id: `rec_${recId++}`,
      priority: 'high',
      title: 'Investigate Critical Performance Changes',
      description: `${criticalAnomalies.length} critical anomalies detected that require immediate attention.`,
      estimatedImpact: 'Addressing these issues could prevent significant revenue loss.',
      actionSteps: criticalAnomalies.map((a) => `Review ${a.metric}: ${a.description}`),
    })
  }

  // Declining trend recommendation
  const decliningTrends = trends.filter((t) => t.direction === 'down')
  if (decliningTrends.length > 0) {
    const mainTrend = decliningTrends[0]
    recommendations.push({
      id: `rec_${recId++}`,
      priority: 'medium',
      title: `Address Declining ${mainTrend?.metric ?? 'Metric'} Trend`,
      description: mainTrend?.description ?? '',
      estimatedImpact: mainTrend?.projectedImpact ?? '',
      actionSteps: [
        'Review recent campaign changes',
        'Analyze competitor activity',
        'Check for audience fatigue',
        'Consider refreshing creative assets',
      ],
    })
  }

  // Growth opportunity
  const growingChannels = channelMetrics.filter(
    (c) => c.revenue > c.previousRevenue * 1.2 && c.roas > 1.5
  )
  if (growingChannels.length > 0) {
    const bestGrower = growingChannels.sort((a, b) => b.revenue - a.revenue)[0]
    recommendations.push({
      id: `rec_${recId++}`,
      priority: 'medium',
      title: 'Scale High-Growth Channel',
      description: `${bestGrower?.channel ?? 'Channel'} is showing strong growth with healthy ROAS. This presents a scaling opportunity.`,
      estimatedImpact: `Potential to increase revenue by ${Math.round((bestGrower?.revenue ?? 0) / (bestGrower?.previousRevenue ?? 1) * 50 - 50)}% with careful budget increase.`,
      actionSteps: [
        'Gradually increase daily budget by 20%',
        'Monitor ROAS daily during scaling',
        'Expand audience targeting',
        'Test new creative variations',
      ],
    })
  }

  // Data quality recommendation
  if (channelMetrics.some((c) => c.spend > 0 && c.revenue === 0)) {
    recommendations.push({
      id: `rec_${recId++}`,
      priority: 'low',
      title: 'Review Attribution Coverage',
      description: 'Some channels have spend but no attributed revenue. This may indicate tracking gaps.',
      estimatedImpact: 'Improved attribution accuracy leads to better budget decisions.',
      actionSteps: [
        'Verify pixel implementation',
        'Check server-side event tracking',
        'Review attribution window settings',
        'Audit UTM parameter consistency',
      ],
    })
  }

  return recommendations.slice(0, 5) // Limit to top 5 recommendations
}

// ============================================================
// Health Score Calculation
// ============================================================

function calculateHealthScore(
  channelMetrics: ChannelMetric[],
  anomalies: Anomaly[]
): number {
  let score = 100

  // Deduct for critical anomalies
  const criticalCount = anomalies.filter((a) => a.severity === 'critical').length
  const warningCount = anomalies.filter((a) => a.severity === 'warning').length
  score -= criticalCount * 15
  score -= warningCount * 5

  // Check ROAS health
  const avgRoas = channelMetrics.reduce((sum, c) => sum + c.roas, 0) / channelMetrics.length
  if (avgRoas < 1) score -= 20
  else if (avgRoas < 2) score -= 10

  // Check for declining channels
  const decliningChannels = channelMetrics.filter(
    (c) => c.previousRevenue > 0 && c.revenue < c.previousRevenue * 0.8
  )
  score -= decliningChannels.length * 5

  return Math.max(0, Math.min(100, score))
}

// ============================================================
// Executive Summary Generation
// ============================================================

function generateExecutiveSummary(
  channelMetrics: ChannelMetric[],
  anomalies: Anomaly[],
  trends: Trend[]
): string {
  const totalRevenue = channelMetrics.reduce((sum, c) => sum + c.revenue, 0)
  const totalSpend = channelMetrics.reduce((sum, c) => sum + c.spend, 0)
  const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0

  const previousRevenue = channelMetrics.reduce((sum, c) => sum + c.previousRevenue, 0)
  const revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0

  const topChannel = channelMetrics[0]
  const criticalAnomalies = anomalies.filter((a) => a.severity === 'critical').length
  const decliningTrends = trends.filter((t) => t.direction === 'down').length

  let summary = `Marketing performance `
  if (revenueChange > 10) {
    summary += `is strong with revenue up ${revenueChange.toFixed(0)}% vs. the previous period. `
  } else if (revenueChange < -10) {
    summary += `needs attention with revenue down ${Math.abs(revenueChange).toFixed(0)}% vs. the previous period. `
  } else {
    summary += `is stable with minimal change vs. the previous period. `
  }

  summary += `Overall ROAS is ${overallRoas.toFixed(2)}x`
  if (topChannel) {
    summary += `, with ${topChannel.channel} as the top-performing channel. `
  } else {
    summary += `. `
  }

  if (criticalAnomalies > 0) {
    summary += `There are ${criticalAnomalies} critical issues requiring immediate attention. `
  }

  if (decliningTrends > 0) {
    summary += `Monitor declining trends in key metrics.`
  }

  return summary.trim()
}

// ============================================================
// Statistical Helpers
// ============================================================

interface Stats {
  mean: number
  stdDev: number
}

function calculateStats(values: number[]): Stats {
  if (values.length === 0) return { mean: 0, stdDev: 0 }

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2))
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length
  const stdDev = Math.sqrt(variance)

  return { mean, stdDev }
}

function calculateZScore(value: number, stats: Stats): number {
  if (stats.stdDev === 0) return 0
  return (value - stats.mean) / stats.stdDev
}

function calculateLinearSlope(values: number[]): number {
  if (values.length < 2) return 0

  const n = values.length
  const sumX = (n * (n - 1)) / 2
  const sumY = values.reduce((sum, v) => sum + v, 0)
  const sumXY = values.reduce((sum, v, i) => sum + i * v, 0)
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6

  const denominator = n * sumX2 - sumX * sumX
  if (denominator === 0) return 0

  return (n * sumXY - sumX * sumY) / denominator
}
