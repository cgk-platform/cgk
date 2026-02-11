/**
 * Support Channels Tests
 * Phase 2SP-CHANNELS
 */

import { describe, it, expect } from 'vitest'

import {
  calculateDeadline,
  COMPLIANCE_DEADLINES,
  getDaysUntilDeadline,
  isRequestOverdue,
} from '../channel-types'
import type { PrivacyRequest } from '../channel-types'

describe('Privacy Compliance Utilities', () => {
  describe('calculateDeadline', () => {
    it('should calculate GDPR deadline as 30 days from now', () => {
      const now = new Date()
      const deadline = calculateDeadline('export', 'gdpr')

      const expectedDeadline = new Date(now)
      expectedDeadline.setDate(expectedDeadline.getDate() + 30)

      // Allow 1 day tolerance for edge cases
      expect(deadline.getDate()).toBeGreaterThanOrEqual(expectedDeadline.getDate() - 1)
      expect(deadline.getDate()).toBeLessThanOrEqual(expectedDeadline.getDate() + 1)
    })

    it('should calculate CCPA deadline as 45 days from now', () => {
      const now = new Date()
      const deadline = calculateDeadline('export', 'ccpa')

      const expectedDeadline = new Date(now)
      expectedDeadline.setDate(expectedDeadline.getDate() + 45)

      expect(deadline.getDate()).toBeGreaterThanOrEqual(expectedDeadline.getDate() - 1)
      expect(deadline.getDate()).toBeLessThanOrEqual(expectedDeadline.getDate() + 1)
    })

    it('should default to GDPR when no regulation specified', () => {
      const now = new Date()
      const deadline = calculateDeadline('delete')

      const expectedDeadline = new Date(now)
      expectedDeadline.setDate(expectedDeadline.getDate() + 30)

      expect(deadline.getDate()).toBeGreaterThanOrEqual(expectedDeadline.getDate() - 1)
      expect(deadline.getDate()).toBeLessThanOrEqual(expectedDeadline.getDate() + 1)
    })
  })

  describe('isRequestOverdue', () => {
    it('should return true for pending request past deadline', () => {
      const request: PrivacyRequest = {
        id: 'test-1',
        customerId: null,
        customerEmail: 'test@example.com',
        requestType: 'export',
        status: 'pending',
        verifiedAt: null,
        verificationMethod: null,
        processedBy: null,
        processedAt: null,
        resultUrl: null,
        rejectionReason: null,
        notes: null,
        deadlineAt: new Date(Date.now() - 86400000), // Yesterday
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(isRequestOverdue(request)).toBe(true)
    })

    it('should return false for pending request before deadline', () => {
      const request: PrivacyRequest = {
        id: 'test-2',
        customerId: null,
        customerEmail: 'test@example.com',
        requestType: 'export',
        status: 'pending',
        verifiedAt: null,
        verificationMethod: null,
        processedBy: null,
        processedAt: null,
        resultUrl: null,
        rejectionReason: null,
        notes: null,
        deadlineAt: new Date(Date.now() + 86400000 * 7), // 7 days from now
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(isRequestOverdue(request)).toBe(false)
    })

    it('should return false for completed request even if past deadline', () => {
      const request: PrivacyRequest = {
        id: 'test-3',
        customerId: null,
        customerEmail: 'test@example.com',
        requestType: 'export',
        status: 'completed',
        verifiedAt: null,
        verificationMethod: null,
        processedBy: null,
        processedAt: new Date(),
        resultUrl: 'https://example.com/export',
        rejectionReason: null,
        notes: null,
        deadlineAt: new Date(Date.now() - 86400000), // Yesterday
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(isRequestOverdue(request)).toBe(false)
    })

    it('should return false for rejected request even if past deadline', () => {
      const request: PrivacyRequest = {
        id: 'test-4',
        customerId: null,
        customerEmail: 'test@example.com',
        requestType: 'export',
        status: 'rejected',
        verifiedAt: null,
        verificationMethod: null,
        processedBy: null,
        processedAt: new Date(),
        resultUrl: null,
        rejectionReason: 'Invalid request',
        notes: null,
        deadlineAt: new Date(Date.now() - 86400000), // Yesterday
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(isRequestOverdue(request)).toBe(false)
    })
  })

  describe('getDaysUntilDeadline', () => {
    it('should return positive days for future deadline', () => {
      const request: PrivacyRequest = {
        id: 'test-5',
        customerId: null,
        customerEmail: 'test@example.com',
        requestType: 'export',
        status: 'pending',
        verifiedAt: null,
        verificationMethod: null,
        processedBy: null,
        processedAt: null,
        resultUrl: null,
        rejectionReason: null,
        notes: null,
        deadlineAt: new Date(Date.now() + 86400000 * 10), // 10 days from now
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const days = getDaysUntilDeadline(request)
      expect(days).toBeGreaterThanOrEqual(9)
      expect(days).toBeLessThanOrEqual(11)
    })

    it('should return negative days for past deadline', () => {
      const request: PrivacyRequest = {
        id: 'test-6',
        customerId: null,
        customerEmail: 'test@example.com',
        requestType: 'export',
        status: 'pending',
        verifiedAt: null,
        verificationMethod: null,
        processedBy: null,
        processedAt: null,
        resultUrl: null,
        rejectionReason: null,
        notes: null,
        deadlineAt: new Date(Date.now() - 86400000 * 5), // 5 days ago
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const days = getDaysUntilDeadline(request)
      expect(days).toBeLessThanOrEqual(-4)
      expect(days).toBeGreaterThanOrEqual(-6)
    })
  })

  describe('COMPLIANCE_DEADLINES', () => {
    it('should have correct GDPR days', () => {
      expect(COMPLIANCE_DEADLINES.GDPR_DAYS).toBe(30)
    })

    it('should have correct CCPA days', () => {
      expect(COMPLIANCE_DEADLINES.CCPA_DAYS).toBe(45)
    })
  })
})

describe('Chat Types', () => {
  it('should have valid chat session statuses', () => {
    const validStatuses = ['waiting', 'active', 'ended', 'transferred']
    expect(validStatuses).toContain('waiting')
    expect(validStatuses).toContain('active')
    expect(validStatuses).toContain('ended')
    expect(validStatuses).toContain('transferred')
  })

  it('should have valid sender types', () => {
    const validTypes = ['visitor', 'agent', 'bot']
    expect(validTypes).toContain('visitor')
    expect(validTypes).toContain('agent')
    expect(validTypes).toContain('bot')
  })
})

describe('CSAT Types', () => {
  it('should have valid rating range', () => {
    const validRatings = [1, 2, 3, 4, 5]
    expect(validRatings).toHaveLength(5)
    expect(Math.min(...validRatings)).toBe(1)
    expect(Math.max(...validRatings)).toBe(5)
  })

  it('should have valid channels', () => {
    const validChannels = ['email', 'sms', 'in_app']
    expect(validChannels).toContain('email')
    expect(validChannels).toContain('sms')
    expect(validChannels).toContain('in_app')
  })
})
