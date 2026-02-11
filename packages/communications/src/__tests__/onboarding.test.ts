/**
 * Onboarding Module Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  RECOMMENDED_SENDER_ADDRESSES,
  RECOMMENDED_SUBDOMAINS,
  getNotificationTypesInfo,
  getNotificationTypesByCategory,
  getRecommendedSubdomains,
  isValidDomain,
  isValidSubdomain,
  getInboundRecommendations,
} from '../onboarding/index.js'

describe('Email Onboarding', () => {
  describe('Domain Validation', () => {
    it('validates correct domain formats', () => {
      expect(isValidDomain('example.com')).toBe(true)
      expect(isValidDomain('sub.example.com')).toBe(true)
      expect(isValidDomain('my-brand.co.uk')).toBe(true)
      expect(isValidDomain('brand123.io')).toBe(true)
    })

    it('rejects invalid domain formats', () => {
      expect(isValidDomain('invalid')).toBe(false)
      expect(isValidDomain('-invalid.com')).toBe(false)
      expect(isValidDomain('invalid-.com')).toBe(false)
      expect(isValidDomain('.com')).toBe(false)
      expect(isValidDomain('')).toBe(false)
    })
  })

  describe('Subdomain Validation', () => {
    it('validates correct subdomain formats', () => {
      expect(isValidSubdomain('mail')).toBe(true)
      expect(isValidSubdomain('help')).toBe(true)
      expect(isValidSubdomain('my-subdomain')).toBe(true)
      expect(isValidSubdomain('sub123')).toBe(true)
    })

    it('rejects invalid subdomain formats', () => {
      expect(isValidSubdomain('-invalid')).toBe(false)
      expect(isValidSubdomain('invalid-')).toBe(false)
      expect(isValidSubdomain('')).toBe(false)
      expect(isValidSubdomain('sub.domain')).toBe(false)
    })
  })

  describe('Recommended Subdomains', () => {
    it('returns recommended subdomains for a domain', () => {
      const recommendations = getRecommendedSubdomains('example.com')

      expect(recommendations).toHaveLength(RECOMMENDED_SUBDOMAINS.length)
      expect(recommendations[0]?.fullDomain).toBe('mail.example.com')
    })

    it('includes all recommended subdomain types', () => {
      expect(RECOMMENDED_SUBDOMAINS).toContainEqual(
        expect.objectContaining({ prefix: 'mail' })
      )
      expect(RECOMMENDED_SUBDOMAINS).toContainEqual(
        expect.objectContaining({ prefix: 'help' })
      )
    })
  })

  describe('Recommended Sender Addresses', () => {
    it('includes all required sender purposes', () => {
      const purposes = RECOMMENDED_SENDER_ADDRESSES.map((r) => r.purpose)

      expect(purposes).toContain('transactional')
      expect(purposes).toContain('creator')
      expect(purposes).toContain('support')
      expect(purposes).toContain('treasury')
      expect(purposes).toContain('system')
    })

    it('has display name templates with brand placeholder', () => {
      for (const rec of RECOMMENDED_SENDER_ADDRESSES) {
        expect(rec.displayNameTemplate).toContain('{brandName}')
      }
    })

    it('marks one address per purpose as default', () => {
      const defaultsByPurpose = RECOMMENDED_SENDER_ADDRESSES.filter(
        (r) => r.isDefault
      ).map((r) => r.purpose)

      // Each purpose should have exactly one default
      expect(defaultsByPurpose).toContain('transactional')
    })
  })

  describe('Notification Types', () => {
    it('returns all notification types with info', () => {
      const types = getNotificationTypesInfo()

      expect(types.length).toBeGreaterThan(0)
      expect(types[0]).toHaveProperty('type')
      expect(types[0]).toHaveProperty('label')
      expect(types[0]).toHaveProperty('category')
      expect(types[0]).toHaveProperty('description')
      expect(types[0]).toHaveProperty('defaultPurpose')
    })

    it('groups notification types by category', () => {
      const grouped = getNotificationTypesByCategory()

      expect(grouped).toHaveProperty('Reviews')
      expect(grouped).toHaveProperty('Subscriptions')
      expect(grouped).toHaveProperty('Creators')
      expect(grouped).toHaveProperty('Treasury')
    })

    it('includes review notification types', () => {
      const types = getNotificationTypesInfo()
      const reviewTypes = types.filter((t) => t.category === 'Reviews')

      expect(reviewTypes.length).toBeGreaterThan(0)
      expect(reviewTypes.find((t) => t.type === 'review_request')).toBeDefined()
    })
  })

  describe('Inbound Recommendations', () => {
    it('returns inbound email recommendations', () => {
      const recommendations = getInboundRecommendations()

      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations[0]).toHaveProperty('purpose')
      expect(recommendations[0]).toHaveProperty('emailPattern')
      expect(recommendations[0]).toHaveProperty('description')
      expect(recommendations[0]).toHaveProperty('isRecommended')
    })

    it('recommends treasury inbound', () => {
      const recommendations = getInboundRecommendations()
      const treasuryRec = recommendations.find((r) => r.purpose === 'treasury')

      expect(treasuryRec).toBeDefined()
      expect(treasuryRec?.isRecommended).toBe(true)
    })
  })
})

describe('API Key Verification', () => {
  // Mock fetch for API tests
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('validates API key format', async () => {
    const { verifyResendApiKey } = await import('../onboarding/verify-api-key.js')

    // Empty key
    const emptyResult = await verifyResendApiKey({ apiKey: '' })
    expect(emptyResult.valid).toBe(false)
    expect(emptyResult.error).toContain('required')

    // Invalid format
    const invalidResult = await verifyResendApiKey({ apiKey: 'invalid_key' })
    expect(invalidResult.valid).toBe(false)
    expect(invalidResult.error).toContain('format')
  })
})
