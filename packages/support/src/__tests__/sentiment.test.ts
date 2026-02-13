import { describe, it, expect, vi } from 'vitest'

// We need to mock the database before importing sentiment
vi.mock('@cgk-platform/db', () => ({
  sql: vi.fn(),
  withTenant: vi.fn((_, fn) => fn()),
}))

// Import after mock
import { analyzeSentiment } from '../sentiment'

describe('Sentiment Analysis', () => {
  describe('analyzeSentiment (keyword fallback)', () => {
    it('returns neutral score for text with no keywords', () => {
      const result = analyzeSentiment('Hello, I have a question about my order.', false)
      expect(result.then).toBeDefined() // It's a promise

      return result.then((r) => {
        expect(r.score).toBe(0)
        expect(r.shouldEscalate).toBe(false)
      })
    })

    it('returns negative score for frustrated text', () => {
      const result = analyzeSentiment(
        'I am very frustrated with your service. This is terrible!',
        false
      )

      return result.then((r) => {
        expect(r.score).toBeLessThan(0)
        expect(r.keywords).toContain('frustrated')
        expect(r.keywords).toContain('terrible')
      })
    })

    it('returns positive score for happy text', () => {
      const result = analyzeSentiment(
        'Thank you so much! You were very helpful and I appreciate your quick response.',
        false
      )

      return result.then((r) => {
        expect(r.score).toBeGreaterThan(0)
        expect(r.keywords).toContain('thank')
        expect(r.keywords).toContain('helpful')
        expect(r.keywords).toContain('appreciate')
        expect(r.keywords).toContain('quick')
      })
    })

    it('flags escalation for legal threats', () => {
      const result = analyzeSentiment(
        'I will contact my lawyer if this is not resolved immediately!',
        false
      )

      return result.then((r) => {
        expect(r.shouldEscalate).toBe(true)
        expect(r.reason).toBeDefined()
      })
    })

    it('flags escalation for chargeback mentions', () => {
      const result = analyzeSentiment(
        'I am going to file a chargeback with my bank.',
        false
      )

      return result.then((r) => {
        expect(r.shouldEscalate).toBe(true)
      })
    })

    it('flags escalation for fraud accusations', () => {
      const result = analyzeSentiment(
        'This is a scam! You are committing fraud!',
        false
      )

      return result.then((r) => {
        expect(r.shouldEscalate).toBe(true)
        expect(r.score).toBeLessThan(0)
      })
    })

    it('handles mixed sentiment', () => {
      const result = analyzeSentiment(
        'Thank you for your response, but I am still frustrated with the delay.',
        false
      )

      return result.then((r) => {
        expect(r.keywords).toContain('thank')
        expect(r.keywords).toContain('frustrated')
        // Mixed sentiment should result in a score closer to 0
        expect(Math.abs(r.score)).toBeLessThan(1)
      })
    })

    it('has higher confidence with more keywords', () => {
      const lowKeywordResult = analyzeSentiment('I hate this.', false)
      const highKeywordResult = analyzeSentiment(
        'I hate this. It is terrible, awful, and the worst experience ever. I am so frustrated!',
        false
      )

      return Promise.all([lowKeywordResult, highKeywordResult]).then(([low, high]) => {
        expect(high.confidence).toBeGreaterThan(low.confidence)
      })
    })

    it('is case insensitive', () => {
      const lowercase = analyzeSentiment('frustrated', false)
      const uppercase = analyzeSentiment('FRUSTRATED', false)

      return Promise.all([lowercase, uppercase]).then(([l, u]) => {
        expect(l.score).toBe(u.score)
      })
    })
  })
})
