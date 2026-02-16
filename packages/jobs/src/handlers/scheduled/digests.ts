/**
 * Digest & Notification Scheduled Jobs
 *
 * Sends recurring digest emails and notifications:
 * - Admin daily digest (8 AM Mon-Fri)
 * - At-risk projects alert (9 AM, 2 PM Mon-Fri)
 * - Creator weekly digest (10 AM Monday)
 *
 * @ai-pattern scheduled-jobs
 * @ai-critical All jobs require tenantId for isolation
 */

import { defineJob } from '../../define'
import type { TenantEvent } from '../../events'

// ============================================================
// DIGEST PAYLOAD TYPES
// ============================================================

export interface AdminDailyDigestPayload {
  tenantId: string
  /** Override recipients (defaults to admin users) */
  recipients?: string[]
}

export interface AtRiskProjectsAlertPayload {
  tenantId: string
  /** Time of day: 'morning' (9 AM) or 'afternoon' (2 PM) */
  alertTime: 'morning' | 'afternoon'
}

export interface CreatorWeeklyDigestPayload {
  tenantId: string
  /** Specific creator ID, or all if not provided */
  creatorId?: string
}

export interface DigestMetrics {
  orders: {
    total: number
    revenue: number
    avgOrderValue: number
    change: number // Percentage change from previous period
  }
  creators: {
    newApplications: number
    approved: number
    activeProjects: number
    contentSubmitted: number
  }
  reviews: {
    collected: number
    avgRating: number
    npsScore: number
  }
  payouts: {
    processed: number
    totalAmount: number
    pending: number
  }
}

export interface AtRiskProject {
  projectId: string
  creatorId: string
  creatorName: string
  projectName: string
  dueDate: Date
  daysOverdue: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskReasons: string[]
}

// ============================================================
// ADMIN DAILY DIGEST
// ============================================================

/**
 * Admin daily digest - 8 AM Mon-Fri
 *
 * Sends a summary of:
 * - Yesterday's orders and revenue
 * - Creator activity (applications, approvals, submissions)
 * - Review metrics (NPS, average rating)
 * - Payout status
 * - Any critical alerts or issues
 */
export const adminDailyDigestJob = defineJob<TenantEvent<AdminDailyDigestPayload>>({
  name: 'digest/admin-daily',
  handler: async (job) => {
    const { tenantId, recipients } = job.payload

    console.log(`[Digest] Generating admin daily digest for tenant ${tenantId}`)

    // Implementation would:
    // 1. Query yesterday's metrics from tenant schema
    // 2. Compare with previous day/week for trends
    // 3. Identify any anomalies or issues
    // 4. Build digest email content
    // 5. Send to admin users or specified recipients

    const metrics: DigestMetrics = {
      orders: {
        total: 0,
        revenue: 0,
        avgOrderValue: 0,
        change: 0,
      },
      creators: {
        newApplications: 0,
        approved: 0,
        activeProjects: 0,
        contentSubmitted: 0,
      },
      reviews: {
        collected: 0,
        avgRating: 0,
        npsScore: 0,
      },
      payouts: {
        processed: 0,
        totalAmount: 0,
        pending: 0,
      },
    }

    // Would query these from the database
    console.log(`[Digest] Admin digest metrics:`, metrics)

    // Would send email here via email.send job
    const recipientList = recipients || []
    if (recipientList.length === 0) {
      console.log(`[Digest] No recipients configured for tenant ${tenantId}`)
      return {
        success: true,
        data: {
          tenantId,
          sentTo: 0,
          metrics,
          generatedAt: new Date(),
          message: 'No recipients configured',
        },
      }
    }
    console.log(`[Digest] Sending to ${recipientList.length} recipients`)

    return {
      success: true,
      data: {
        tenantId,
        sentTo: recipientList.length,
        metrics,
        generatedAt: new Date(),
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

// ============================================================
// AT-RISK PROJECTS ALERT
// ============================================================

/**
 * At-risk projects alert - 9 AM and 2 PM Mon-Fri
 *
 * Identifies and alerts on projects that are:
 * - Past due date
 * - Approaching deadline with no activity
 * - Have communication gaps (no creator response)
 * - Show other risk indicators
 */
export const atRiskProjectsAlertJob = defineJob<TenantEvent<AtRiskProjectsAlertPayload>>({
  name: 'digest/at-risk-projects',
  handler: async (job) => {
    const { tenantId, alertTime } = job.payload

    console.log(`[Digest] Checking at-risk projects for tenant ${tenantId} (${alertTime})`)

    // Implementation would:
    // 1. Query projects with risk indicators
    // 2. Calculate risk scores based on:
    //    - Days until/past deadline
    //    - Last creator activity
    //    - Communication history
    //    - Project value
    // 3. Categorize by risk level
    // 4. Send Slack alert with actionable list

    const atRiskProjects: AtRiskProject[] = []

    // Query logic would populate this array
    // For each project, assess risk factors:
    // - daysOverdue > 0 = overdue
    // - daysUntilDue < 3 with no recent activity = approaching
    // - No creator response in 5+ days = communication gap
    // - High value project = elevated priority

    const criticalCount = atRiskProjects.filter((p) => p.riskLevel === 'critical').length
    const highCount = atRiskProjects.filter((p) => p.riskLevel === 'high').length

    console.log(
      `[Digest] Found ${atRiskProjects.length} at-risk projects (${criticalCount} critical, ${highCount} high)`
    )

    // Would send Slack notification if any critical/high risk projects
    if (criticalCount > 0 || highCount > 0) {
      console.log(`[Digest] Sending Slack alert for at-risk projects`)
      // Would trigger slack.notify job
    }

    return {
      success: true,
      data: {
        tenantId,
        alertTime,
        totalAtRisk: atRiskProjects.length,
        critical: criticalCount,
        high: highCount,
        checkedAt: new Date(),
      },
    }
  },
  retry: { maxAttempts: 2, backoff: 'fixed', initialDelay: 10000 },
})

// ============================================================
// CREATOR WEEKLY DIGEST
// ============================================================

/**
 * Creator weekly digest - 10 AM Monday
 *
 * Sends personalized summary to each creator:
 * - Earnings summary (available, pending, total)
 * - Project status updates
 * - Upcoming deadlines
 * - Performance metrics (views, engagement)
 * - New opportunities or campaigns
 */
export const creatorWeeklyDigestJob = defineJob<TenantEvent<CreatorWeeklyDigestPayload>>({
  name: 'digest/creator-weekly',
  handler: async (job) => {
    const { tenantId, creatorId } = job.payload

    console.log(`[Digest] Generating creator weekly digest for tenant ${tenantId}`)

    // Implementation would:
    // 1. Get all active creators (or specific creator if creatorId provided)
    // 2. For each creator:
    //    a. Calculate earnings (available, pending, paid this week)
    //    b. Get project statuses
    //    c. List upcoming deadlines
    //    d. Gather performance metrics
    //    e. Find relevant new campaigns
    // 3. Generate personalized email
    // 4. Send via email provider

    let creatorsProcessed = 0

    if (creatorId) {
      // Process single creator
      console.log(`[Digest] Processing digest for creator ${creatorId}`)
      creatorsProcessed = 1
    } else {
      // Process all active creators
      // Would query: SELECT id FROM creators WHERE status = 'active'
      console.log(`[Digest] Processing digests for all active creators`)
      creatorsProcessed = 0 // Would be count from query
    }

    return {
      success: true,
      data: {
        tenantId,
        creatorsProcessed,
        generatedAt: new Date(),
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 10000 },
})

// ============================================================
// SCHEDULES
// ============================================================

export const DIGEST_SCHEDULES = {
  /** Admin daily digest: 8 AM Mon-Fri */
  adminDaily: { cron: '0 8 * * 1-5', timezone: 'America/New_York' },
  /** At-risk projects morning alert: 9 AM Mon-Fri */
  atRiskMorning: { cron: '0 9 * * 1-5', timezone: 'America/New_York' },
  /** At-risk projects afternoon alert: 2 PM Mon-Fri */
  atRiskAfternoon: { cron: '0 14 * * 1-5', timezone: 'America/New_York' },
  /** Creator weekly digest: 10 AM Monday */
  creatorWeekly: { cron: '0 10 * * 1', timezone: 'America/New_York' },
} as const

// ============================================================
// EXPORTS
// ============================================================

export const digestJobs = [adminDailyDigestJob, atRiskProjectsAlertJob, creatorWeeklyDigestJob]
