/**
 * Treasury background jobs
 *
 * Handles automated treasury operations:
 * - Sending approval emails
 * - Processing inbound email responses
 * - Auto-send approved payouts
 * - Syncing top-up statuses
 * - Low balance alerts
 *
 * NOTE: These jobs require the treasury library functions to be implemented
 * in a shared package (e.g., @cgk/treasury) before they can be fully functional.
 * Currently stubbed to allow build to pass.
 */

import { defineJob } from '../define'
import type { JobResult } from '../types'

// Job Payload Types
export interface TreasurySendApprovalEmailPayload {
  tenantId: string
  requestId: string
}

export interface TreasuryProcessInboundEmailPayload {
  tenantId: string
  requestId: string
  communicationId: string
}

export interface TreasuryAutoSendApprovedPayload {
  tenantId: string
  requestId?: string // Optional: process specific request, or batch if not provided
}

export interface TreasurySyncTopupStatusesPayload {
  tenantId: string
  topupId?: string // Optional: sync specific topup, or all pending if not provided
}

export interface TreasuryLowBalanceAlertPayload {
  tenantId: string
}

/**
 * Send approval email to treasurer for a draw request
 */
export const treasurySendApprovalEmailJob = defineJob<TreasurySendApprovalEmailPayload>({
  name: 'treasury/send-approval-email',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, requestId } = job.payload

    if (!tenantId) {
      return { success: false, error: { message: 'tenantId required', retryable: false } }
    }

    // Treasury library functions need to be implemented in @cgk/treasury package
    // This is a stub that logs the request for now
    console.log(`[treasury/send-approval-email] tenantId=${tenantId} requestId=${requestId}`)

    return {
      success: false,
      error: {
        message: 'Treasury library not yet implemented. Create @cgk/treasury package.',
        retryable: false,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

/**
 * Process auto-send for approved draw requests
 */
export const treasuryAutoSendApprovedJob = defineJob<TreasuryAutoSendApprovedPayload>({
  name: 'treasury/auto-send-approved',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, requestId } = job.payload

    if (!tenantId) {
      return { success: false, error: { message: 'tenantId required', retryable: false } }
    }

    // Treasury library functions need to be implemented in @cgk/treasury package
    console.log(`[treasury/auto-send-approved] tenantId=${tenantId} requestId=${requestId || 'batch'}`)

    return {
      success: false,
      error: {
        message: 'Treasury library not yet implemented. Create @cgk/treasury package.',
        retryable: false,
      },
    }
  },
  retry: { maxAttempts: 2, backoff: 'fixed', initialDelay: 10000 },
})

/**
 * Sync Stripe topup statuses
 */
export const treasurySyncTopupStatusesJob = defineJob<TreasurySyncTopupStatusesPayload>({
  name: 'treasury/sync-topup-statuses',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, topupId } = job.payload

    if (!tenantId) {
      return { success: false, error: { message: 'tenantId required', retryable: false } }
    }

    // Treasury library functions need to be implemented in @cgk/treasury package
    console.log(`[treasury/sync-topup-statuses] tenantId=${tenantId} topupId=${topupId || 'all'}`)

    return {
      success: false,
      error: {
        message: 'Treasury library not yet implemented. Create @cgk/treasury package.',
        retryable: false,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 30000 },
})

/**
 * Check for low balance and send alerts
 */
export const treasuryLowBalanceAlertJob = defineJob<TreasuryLowBalanceAlertPayload>({
  name: 'treasury/low-balance-alert',
  handler: async (job): Promise<JobResult> => {
    const { tenantId } = job.payload

    if (!tenantId) {
      return { success: false, error: { message: 'tenantId required', retryable: false } }
    }

    // Treasury library functions need to be implemented in @cgk/treasury package
    console.log(`[treasury/low-balance-alert] tenantId=${tenantId}`)

    return {
      success: false,
      error: {
        message: 'Treasury library not yet implemented. Create @cgk/treasury package.',
        retryable: false,
      },
    }
  },
  retry: { maxAttempts: 2, backoff: 'fixed', initialDelay: 60000 },
})

// Schedule definitions for cron jobs
export const TREASURY_SCHEDULES = {
  autoSend: '0 */4 * * *', // Every 4 hours
  syncTopups: '*/15 * * * *', // Every 15 minutes
  lowBalanceAlert: '0 9,17 * * *', // 9 AM and 5 PM
} as const
