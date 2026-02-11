import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  isSLABreached,
  getRemainingMinutes,
  getSLAStatus,
  formatRemainingTime,
} from '../sla'

describe('SLA Functions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  describe('isSLABreached', () => {
    it('returns false for null deadline', () => {
      expect(isSLABreached(null)).toBe(false)
    })

    it('returns false when deadline is in the future', () => {
      const deadline = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
      expect(isSLABreached(deadline)).toBe(false)
    })

    it('returns true when deadline has passed', () => {
      const deadline = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      expect(isSLABreached(deadline)).toBe(true)
    })
  })

  describe('getRemainingMinutes', () => {
    it('returns null for null deadline', () => {
      expect(getRemainingMinutes(null)).toBe(null)
    })

    it('returns positive minutes when deadline is in the future', () => {
      const deadline = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
      const remaining = getRemainingMinutes(deadline)
      expect(remaining).toBeGreaterThanOrEqual(29)
      expect(remaining).toBeLessThanOrEqual(30)
    })

    it('returns negative minutes when deadline has passed', () => {
      const deadline = new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      const remaining = getRemainingMinutes(deadline)
      expect(remaining).toBeLessThan(0)
      expect(remaining).toBeGreaterThanOrEqual(-31)
    })
  })

  describe('getSLAStatus', () => {
    it('returns null for null deadline', () => {
      const createdAt = new Date()
      expect(getSLAStatus(null, createdAt)).toBe(null)
    })

    it('returns "safe" when more than 25% time remaining', () => {
      const now = Date.now()
      const createdAt = new Date(now - 60 * 60 * 1000) // 1 hour ago
      const deadline = new Date(now + 60 * 60 * 1000) // 1 hour from now (50% remaining)
      expect(getSLAStatus(deadline, createdAt)).toBe('safe')
    })

    it('returns "warning" when less than 25% time remaining', () => {
      const now = Date.now()
      const createdAt = new Date(now - 90 * 60 * 1000) // 90 minutes ago
      const deadline = new Date(now + 10 * 60 * 1000) // 10 minutes from now (10% remaining)
      expect(getSLAStatus(deadline, createdAt)).toBe('warning')
    })

    it('returns "breached" when deadline has passed', () => {
      const now = Date.now()
      const createdAt = new Date(now - 2 * 60 * 60 * 1000) // 2 hours ago
      const deadline = new Date(now - 60 * 60 * 1000) // 1 hour ago
      expect(getSLAStatus(deadline, createdAt)).toBe('breached')
    })
  })

  describe('formatRemainingTime', () => {
    it('returns "No SLA" for null deadline', () => {
      expect(formatRemainingTime(null)).toBe('No SLA')
    })

    it('formats minutes remaining correctly', () => {
      const deadline = new Date(Date.now() + 45 * 60 * 1000) // 45 minutes from now
      const result = formatRemainingTime(deadline)
      expect(result).toMatch(/\d+m remaining/)
    })

    it('formats hours remaining correctly', () => {
      const deadline = new Date(Date.now() + 3 * 60 * 60 * 1000) // 3 hours from now
      const result = formatRemainingTime(deadline)
      expect(result).toMatch(/\d+h remaining/)
    })

    it('formats days remaining correctly', () => {
      const deadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
      const result = formatRemainingTime(deadline)
      expect(result).toMatch(/\d+d remaining/)
    })

    it('formats overdue time correctly', () => {
      const deadline = new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      const result = formatRemainingTime(deadline)
      expect(result).toMatch(/\d+m overdue/)
    })
  })
})
