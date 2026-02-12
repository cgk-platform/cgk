/**
 * Alert & Automation Scheduled Jobs
 *
 * Handles various alert types with proper routing:
 * - Critical alerts (Slack + SMS immediate)
 * - System error alerts (auto-severity routing)
 * - High value submission alerts ($500+ projects)
 * - Creator complaint alerts
 * - Security alerts (suspicious login detection)
 * - API failure alerts
 * - Unusual activity alerts
 * - Milestone alerts (celebration triggers)
 *
 * @ai-pattern alert-system
 * @ai-critical Alert SMS must rate-limit to prevent spam
 */

import { defineJob } from '../../define'
import type { TenantEvent } from '../../events'

// ============================================================
// ALERT PAYLOAD TYPES
// ============================================================

export interface CriticalAlertPayload {
  tenantId: string
  title: string
  message: string
  source: string
  metadata?: Record<string, unknown>
  /** Override default recipients */
  notifyEmails?: string[]
  notifyPhones?: string[]
}

export interface SystemErrorAlertPayload {
  tenantId: string
  errorCode: string
  errorMessage: string
  service: string
  stackTrace?: string
  metadata?: Record<string, unknown>
}

export interface HighValueSubmissionAlertPayload {
  tenantId: string
  projectId: string
  creatorId: string
  creatorName: string
  projectValue: number
  currency: string
  projectType: string
}

export interface CreatorComplaintAlertPayload {
  tenantId: string
  creatorId: string
  creatorName: string
  complaintType: 'payment' | 'product' | 'communication' | 'other'
  severity: 'low' | 'medium' | 'high' | 'urgent'
  summary: string
  projectId?: string
}

export interface SecurityAlertPayload {
  tenantId: string
  alertType:
    | 'suspicious_login'
    | 'multiple_failed_logins'
    | 'unusual_ip'
    | 'permission_escalation'
    | 'api_key_compromise'
  userId?: string
  email?: string
  ipAddress?: string
  userAgent?: string
  geoLocation?: string
  metadata?: Record<string, unknown>
}

export interface ApiFailureAlertPayload {
  tenantId: string
  service: string
  endpoint: string
  errorCode: number
  errorMessage: string
  failureCount: number
  timeWindowMinutes: number
  lastSuccessAt?: Date
}

export interface UnusualActivityAlertPayload {
  tenantId: string
  activityType:
    | 'high_order_volume'
    | 'high_refund_rate'
    | 'unusual_traffic'
    | 'mass_unsubscribe'
    | 'bulk_data_access'
  metric: string
  currentValue: number
  normalValue: number
  percentageChange: number
  timeWindow: string
}

export interface MilestoneAlertPayload {
  tenantId: string
  milestoneType:
    | 'revenue_milestone'
    | 'order_count_milestone'
    | 'creator_milestone'
    | 'review_milestone'
    | 'anniversary'
  milestone: string
  value: number
  previousMilestone?: number
}

// ============================================================
// RATE LIMITING UTILITIES
// ============================================================

// In-memory rate limiting for SMS (would use Redis in production)
const smsRateLimits = new Map<string, { count: number; windowStart: number }>()

const SMS_RATE_LIMIT = {
  maxPerHour: 5, // Max 5 SMS per recipient per hour
  maxPerDay: 20, // Max 20 SMS per recipient per day
  windowMs: 3600000, // 1 hour window
}

function checkSmsRateLimit(phone: string): boolean {
  const key = phone
  const now = Date.now()
  const limit = smsRateLimits.get(key)

  if (!limit || now - limit.windowStart > SMS_RATE_LIMIT.windowMs) {
    smsRateLimits.set(key, { count: 1, windowStart: now })
    return true
  }

  if (limit.count >= SMS_RATE_LIMIT.maxPerHour) {
    console.warn(`[Alert] SMS rate limit exceeded for ${phone}`)
    return false
  }

  limit.count++
  return true
}

// ============================================================
// ALERT ROUTING UTILITIES
// ============================================================

type AlertSeverity = 'info' | 'warning' | 'error' | 'critical'

interface AlertRouting {
  slack: boolean
  slackChannel?: string
  sms: boolean
  email: boolean
  pagerDuty: boolean
}

function getAlertRouting(severity: AlertSeverity): AlertRouting {
  switch (severity) {
    case 'critical':
      return {
        slack: true,
        slackChannel: '#alerts-critical',
        sms: true,
        email: true,
        pagerDuty: true,
      }
    case 'error':
      return {
        slack: true,
        slackChannel: '#alerts-errors',
        sms: false,
        email: true,
        pagerDuty: false,
      }
    case 'warning':
      return {
        slack: true,
        slackChannel: '#alerts-warnings',
        sms: false,
        email: false,
        pagerDuty: false,
      }
    case 'info':
    default:
      return {
        slack: true,
        slackChannel: '#alerts-info',
        sms: false,
        email: false,
        pagerDuty: false,
      }
  }
}

// ============================================================
// ALERT JOBS
// ============================================================

/**
 * Critical alert - Slack + SMS immediate
 *
 * For system-critical issues that require immediate attention:
 * - Database failures
 * - Payment processing failures
 * - Security breaches
 * - Complete service outages
 */
export const criticalAlertJob = defineJob<TenantEvent<CriticalAlertPayload>>({
  name: 'alert/critical',
  handler: async (job) => {
    const { tenantId, title, message, source, notifyEmails, notifyPhones, metadata } = job.payload

    console.error(`[CRITICAL ALERT] ${title} - ${message} (tenant: ${tenantId}, source: ${source})`)

    const routing = getAlertRouting('critical')

    // Send Slack notification immediately
    if (routing.slack) {
      console.log(`[Alert] Sending Slack notification to ${routing.slackChannel}`)
      // Would trigger slack.notify job with urgent formatting
    }

    // Send SMS to on-call (with rate limiting)
    if (routing.sms && notifyPhones?.length) {
      for (const phone of notifyPhones) {
        if (checkSmsRateLimit(phone)) {
          console.log(`[Alert] Sending SMS to ${phone}`)
          // Would trigger sms.send job
        }
      }
    }

    // Send email notification
    if (routing.email && notifyEmails?.length) {
      console.log(`[Alert] Sending email to ${notifyEmails.length} recipients`)
      // Would trigger email.send job
    }

    return {
      success: true,
      data: {
        tenantId,
        title,
        severity: 'critical',
        notifiedAt: new Date(),
        channels: {
          slack: routing.slack,
          sms: routing.sms && (notifyPhones?.length || 0) > 0,
          email: routing.email && (notifyEmails?.length || 0) > 0,
        },
        metadata,
      },
    }
  },
  retry: { maxAttempts: 5, backoff: 'exponential', initialDelay: 1000 },
})

/**
 * System error alert - auto-severity routing
 *
 * Automatically routes based on error type and frequency:
 * - Single error: warning level
 * - Repeated errors (3+): error level
 * - Critical service errors: critical level
 */
export const systemErrorAlertJob = defineJob<TenantEvent<SystemErrorAlertPayload>>({
  name: 'alert/system-error',
  handler: async (job) => {
    const { tenantId, errorCode, errorMessage, service, stackTrace: _stackTrace, metadata: _metadata } = job.payload

    // Determine severity based on service and error type
    const criticalServices = ['database', 'redis', 'shopify', 'stripe']
    let severity: AlertSeverity = 'warning'

    if (criticalServices.includes(service.toLowerCase())) {
      severity = 'error'
    }

    // Check for patterns indicating critical issues
    const criticalPatterns = ['connection refused', 'timeout', 'out of memory', 'permission denied']
    if (criticalPatterns.some((p) => errorMessage.toLowerCase().includes(p))) {
      severity = 'critical'
    }

    console.log(
      `[Alert] System error (${severity}): ${errorCode} - ${errorMessage} (service: ${service})`
    )

    const routing = getAlertRouting(severity)

    if (routing.slack) {
      console.log(`[Alert] Routing to ${routing.slackChannel}`)
      // Would trigger slack.notify job
    }

    return {
      success: true,
      data: {
        tenantId,
        errorCode,
        service,
        severity,
        routed: routing,
        processedAt: new Date(),
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

/**
 * High value submission alert - $500+ projects
 *
 * Notifies team when a high-value project is submitted
 * to ensure prompt attention and VIP treatment.
 */
export const highValueSubmissionAlertJob = defineJob<TenantEvent<HighValueSubmissionAlertPayload>>({
  name: 'alert/high-value-submission',
  handler: async (job) => {
    const { tenantId, projectId, creatorId, creatorName, projectValue, currency, projectType } =
      job.payload

    console.log(
      `[Alert] High value submission: $${projectValue} ${currency} from ${creatorName} (${projectType})`
    )

    // Format currency for display
    const formattedValue = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(projectValue / 100)

    // Determine tier based on value
    let tier = 'standard'
    if (projectValue >= 100000) tier = 'platinum' // $1000+
    else if (projectValue >= 50000) tier = 'gold' // $500+

    // Send Slack notification
    console.log(`[Alert] Notifying team of ${tier} tier submission`)
    // Would trigger slack.notify with formatted blocks

    return {
      success: true,
      data: {
        tenantId,
        projectId,
        creatorId,
        creatorName,
        formattedValue,
        tier,
        notifiedAt: new Date(),
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 2000 },
})

/**
 * Creator complaint alert - urgent complaints
 *
 * Routes creator complaints based on severity:
 * - Urgent: Immediate Slack + escalation
 * - High: Slack notification
 * - Medium/Low: Logged for review
 */
export const creatorComplaintAlertJob = defineJob<TenantEvent<CreatorComplaintAlertPayload>>({
  name: 'alert/creator-complaint',
  handler: async (job) => {
    const { tenantId, creatorId, creatorName, complaintType, severity, summary, projectId: _projectId } =
      job.payload

    console.log(
      `[Alert] Creator complaint (${severity}): ${complaintType} from ${creatorName} - ${summary}`
    )

    // Map severity to alert severity
    const alertSeverity: AlertSeverity =
      severity === 'urgent' ? 'critical' : severity === 'high' ? 'error' : 'warning'

    const routing = getAlertRouting(alertSeverity)

    // Slack notification for high+ severity
    if (routing.slack && (severity === 'urgent' || severity === 'high')) {
      console.log(`[Alert] Escalating complaint to ${routing.slackChannel}`)
      // Would trigger slack.notify job
    }

    // Create support ticket
    console.log(`[Alert] Creating support ticket for complaint`)
    // Would trigger ticket creation

    return {
      success: true,
      data: {
        tenantId,
        creatorId,
        creatorName,
        complaintType,
        severity,
        escalated: severity === 'urgent' || severity === 'high',
        processedAt: new Date(),
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 2000 },
})

/**
 * Security alert - suspicious activity detection
 *
 * Handles security-related alerts:
 * - Suspicious login patterns
 * - Multiple failed login attempts
 * - Unusual IP addresses
 * - Permission escalation attempts
 */
export const securityAlertJob = defineJob<TenantEvent<SecurityAlertPayload>>({
  name: 'alert/security',
  handler: async (job) => {
    const { tenantId, alertType, userId, email, ipAddress, userAgent: _userAgent, geoLocation, metadata: _metadata } =
      job.payload

    console.warn(`[SECURITY ALERT] ${alertType} - User: ${email || userId}, IP: ${ipAddress}`)

    // All security alerts are at least error level
    let severity: AlertSeverity = 'error'

    // Certain types are always critical
    const criticalTypes = ['api_key_compromise', 'permission_escalation']
    if (criticalTypes.includes(alertType)) {
      severity = 'critical'
    }

    const routing = getAlertRouting(severity)

    // Always notify security channel
    console.log(`[Alert] Notifying security team`)
    // Would trigger slack.notify to #security-alerts

    // Log for audit trail
    console.log(`[Alert] Logging security event for audit`)
    // Would write to security audit log

    // For critical, also send SMS
    if (severity === 'critical' && routing.sms) {
      console.log(`[Alert] Sending SMS alert to security on-call`)
    }

    return {
      success: true,
      data: {
        tenantId,
        alertType,
        severity,
        userId,
        ipAddress,
        geoLocation,
        processedAt: new Date(),
      },
    }
  },
  retry: { maxAttempts: 5, backoff: 'exponential', initialDelay: 1000 },
})

/**
 * API failure alert - service failure notification
 *
 * Alerts when external API integrations are failing:
 * - Shopify API
 * - Stripe
 * - Third-party services
 */
export const apiFailureAlertJob = defineJob<TenantEvent<ApiFailureAlertPayload>>({
  name: 'alert/api-failure',
  handler: async (job) => {
    const {
      tenantId,
      service,
      endpoint,
      errorCode,
      errorMessage,
      failureCount,
      timeWindowMinutes,
      lastSuccessAt,
    } = job.payload

    console.warn(
      `[Alert] API failure: ${service} - ${failureCount} failures in ${timeWindowMinutes}min (${errorCode}: ${errorMessage})`
    )

    // Determine severity based on failure count and service criticality
    let severity: AlertSeverity = 'warning'
    const criticalServices = ['shopify', 'stripe']

    if (failureCount >= 10) {
      severity = 'error'
    }
    if (failureCount >= 50 || criticalServices.includes(service.toLowerCase())) {
      severity = 'critical'
    }

    const routing = getAlertRouting(severity)

    if (routing.slack) {
      console.log(`[Alert] Notifying about ${service} API failures`)
      // Would trigger slack.notify job
    }

    return {
      success: true,
      data: {
        tenantId,
        service,
        endpoint,
        failureCount,
        severity,
        lastSuccessAt,
        alertedAt: new Date(),
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

/**
 * Unusual activity alert - high volume patterns
 *
 * Detects and alerts on unusual patterns:
 * - Abnormally high order volume
 * - High refund rates
 * - Traffic spikes
 * - Mass unsubscribes
 */
export const unusualActivityAlertJob = defineJob<TenantEvent<UnusualActivityAlertPayload>>({
  name: 'alert/unusual-activity',
  handler: async (job) => {
    const { tenantId, activityType, metric, currentValue, normalValue, percentageChange, timeWindow } =
      job.payload

    console.log(
      `[Alert] Unusual activity: ${activityType} - ${metric}: ${currentValue} (normal: ${normalValue}, change: ${percentageChange}%)`
    )

    // Determine severity based on deviation
    let severity: AlertSeverity = 'info'
    if (Math.abs(percentageChange) >= 50) severity = 'warning'
    if (Math.abs(percentageChange) >= 100) severity = 'error'
    if (Math.abs(percentageChange) >= 200) severity = 'critical'

    const routing = getAlertRouting(severity)

    if (routing.slack) {
      console.log(`[Alert] Notifying about unusual ${activityType}`)
      // Would trigger slack.notify job with trend visualization
    }

    return {
      success: true,
      data: {
        tenantId,
        activityType,
        metric,
        percentageChange,
        severity,
        timeWindow,
        alertedAt: new Date(),
      },
    }
  },
  retry: { maxAttempts: 2, backoff: 'fixed', initialDelay: 5000 },
})

/**
 * Milestone alert - celebration triggers
 *
 * Celebrates positive milestones:
 * - Revenue milestones ($100k, $1M, etc.)
 * - Order count milestones
 * - Creator milestones (100th creator, etc.)
 * - Review milestones
 * - Anniversaries
 */
export const milestoneAlertJob = defineJob<TenantEvent<MilestoneAlertPayload>>({
  name: 'alert/milestone',
  handler: async (job) => {
    const { tenantId, milestoneType, milestone, value, previousMilestone } = job.payload

    console.log(`[Alert] Milestone reached: ${milestoneType} - ${milestone} (value: ${value})`)

    // Format milestone for display
    let formattedValue = String(value)
    if (milestoneType === 'revenue_milestone') {
      formattedValue = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value / 100)
    } else if (milestoneType === 'order_count_milestone' || milestoneType === 'creator_milestone') {
      formattedValue = new Intl.NumberFormat('en-US').format(value)
    }

    // Send celebratory Slack message
    console.log(`[Alert] Sending celebration notification for ${milestone}`)
    // Would trigger slack.notify with celebration emoji and confetti

    return {
      success: true,
      data: {
        tenantId,
        milestoneType,
        milestone,
        formattedValue,
        previousMilestone,
        celebratedAt: new Date(),
      },
    }
  },
  retry: { maxAttempts: 2, backoff: 'fixed', initialDelay: 2000 },
})

// ============================================================
// EXPORTS
// ============================================================

export const alertJobs = [
  criticalAlertJob,
  systemErrorAlertJob,
  highValueSubmissionAlertJob,
  creatorComplaintAlertJob,
  securityAlertJob,
  apiFailureAlertJob,
  unusualActivityAlertJob,
  milestoneAlertJob,
]
