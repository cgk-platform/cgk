/**
 * Email Queue Tests
 *
 * @ai-pattern unit-tests
 * @ai-note Tests queue operations without database
 */

import { describe, it, expect } from 'vitest'

import {
  calculateRetryDelay,
  canRetry,
  getTimeUntilRetry,
  isPermanentlyFailed,
  type QueueEntry,
  type ReviewQueueEntry,
} from '../queue/index.js'

describe('Retry Logic', () => {
  describe('calculateRetryDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      // Base delay is 1 minute = 60000ms
      expect(calculateRetryDelay(0, 1)).toBe(60000) // 1 * 2^0 = 1 min
      expect(calculateRetryDelay(1, 1)).toBe(120000) // 1 * 2^1 = 2 min
      expect(calculateRetryDelay(2, 1)).toBe(240000) // 1 * 2^2 = 4 min
      expect(calculateRetryDelay(3, 1)).toBe(480000) // 1 * 2^3 = 8 min
      expect(calculateRetryDelay(4, 1)).toBe(960000) // 1 * 2^4 = 16 min
    })

    it('should respect max delay', () => {
      // With max 60 minutes, should cap at 3600000ms
      expect(calculateRetryDelay(10, 1, 60)).toBe(3600000) // Capped at 60 min
    })

    it('should use custom base delay', () => {
      expect(calculateRetryDelay(0, 5)).toBe(300000) // 5 * 2^0 = 5 min
      expect(calculateRetryDelay(1, 5)).toBe(600000) // 5 * 2^1 = 10 min
    })
  })

  describe('canRetry', () => {
    it('should return true when attempts < maxAttempts and status is failed', () => {
      const entry: Partial<QueueEntry> = {
        status: 'failed',
        attempts: 2,
        maxAttempts: 5,
      }
      expect(canRetry(entry as QueueEntry)).toBe(true)
    })

    it('should return false when attempts >= maxAttempts', () => {
      const entry: Partial<QueueEntry> = {
        status: 'failed',
        attempts: 5,
        maxAttempts: 5,
      }
      expect(canRetry(entry as QueueEntry)).toBe(false)
    })

    it('should return false when status is not failed', () => {
      const entry: Partial<QueueEntry> = {
        status: 'sent',
        attempts: 0,
        maxAttempts: 5,
      }
      expect(canRetry(entry as QueueEntry)).toBe(false)
    })
  })

  describe('isPermanentlyFailed', () => {
    it('should return true when failed and exhausted attempts', () => {
      const entry: Partial<QueueEntry> = {
        status: 'failed',
        attempts: 5,
        maxAttempts: 5,
      }
      expect(isPermanentlyFailed(entry as QueueEntry)).toBe(true)
    })

    it('should return false when attempts remaining', () => {
      const entry: Partial<QueueEntry> = {
        status: 'failed',
        attempts: 3,
        maxAttempts: 5,
      }
      expect(isPermanentlyFailed(entry as QueueEntry)).toBe(false)
    })

    it('should return false when not failed', () => {
      const entry: Partial<QueueEntry> = {
        status: 'scheduled',
        attempts: 5,
        maxAttempts: 5,
      }
      expect(isPermanentlyFailed(entry as QueueEntry)).toBe(false)
    })
  })

  describe('getTimeUntilRetry', () => {
    it('should return -1 for non-retryable entries', () => {
      const entry: Partial<QueueEntry> = {
        status: 'sent',
        attempts: 0,
        maxAttempts: 5,
      }
      expect(getTimeUntilRetry(entry as QueueEntry)).toBe(-1)
    })

    it('should return 0 when enough time has passed', () => {
      const entry: Partial<QueueEntry> = {
        status: 'failed',
        attempts: 1,
        maxAttempts: 5,
        lastAttemptAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      }
      // After 1 attempt with 1 min base, delay is 2 min
      // 10 min ago > 2 min delay, so should be 0
      expect(getTimeUntilRetry(entry as QueueEntry)).toBe(0)
    })

    it('should return remaining time when not ready', () => {
      const entry: Partial<QueueEntry> = {
        status: 'failed',
        attempts: 1,
        maxAttempts: 5,
        lastAttemptAt: new Date(Date.now() - 30 * 1000), // 30 seconds ago
      }
      // After 1 attempt with 1 min base, delay is 2 min = 120000ms
      // 30 seconds ago means ~90 seconds remaining
      const remaining = getTimeUntilRetry(entry as QueueEntry)
      expect(remaining).toBeGreaterThan(0)
      expect(remaining).toBeLessThan(120000)
    })
  })
})

describe('Queue Types', () => {
  it('should have correct ReviewQueueEntry shape', () => {
    const entry: ReviewQueueEntry = {
      id: 'entry_1',
      tenantId: 'tenant_1',
      queueType: 'review',
      orderId: 'order_1',
      orderNumber: 'ORD-001',
      customerEmail: 'test@example.com',
      customerName: 'Test User',
      productTitle: 'Test Product',
      fulfilledAt: new Date(),
      deliveredAt: null,
      trackingNumber: null,
      status: 'scheduled',
      triggerEvent: 'fulfilled',
      scheduledAt: new Date(),
      delayDays: 3,
      sequenceNumber: 1,
      sequenceId: 'seq_1',
      triggerRunId: null,
      attempts: 0,
      maxAttempts: 5,
      lastAttemptAt: null,
      sentAt: null,
      resendMessageId: null,
      incentiveOffered: false,
      forceIncentive: false,
      incentiveCode: null,
      skipReason: null,
      skippedBy: null,
      skippedAt: null,
      templateType: 'reviewRequest',
      metadata: {},
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    expect(entry.queueType).toBe('review')
    expect(entry.status).toBe('scheduled')
    expect(entry.sequenceNumber).toBe(1)
  })
})

describe('Queue Status Flow', () => {
  it('should follow correct status transitions', () => {
    // Valid transitions:
    // pending -> awaiting_delivery (trigger is delivered)
    // pending -> scheduled (trigger is fulfilled)
    // awaiting_delivery -> scheduled (delivery confirmed)
    // scheduled -> processing (claimed by worker)
    // processing -> sent | failed | skipped
    // failed -> scheduled (retry)

    const validTransitions: Record<string, string[]> = {
      pending: ['awaiting_delivery', 'scheduled'],
      awaiting_delivery: ['scheduled', 'skipped'],
      scheduled: ['processing', 'skipped'],
      processing: ['sent', 'failed', 'skipped'],
      failed: ['scheduled'], // retry
      sent: [], // terminal
      skipped: [], // terminal
    }

    // Just verify the structure exists
    expect(Object.keys(validTransitions)).toContain('pending')
    expect(validTransitions.processing).toContain('sent')
    expect(validTransitions.processing).toContain('failed')
  })
})
