/**
 * Tests for consistent hashing
 */

import { describe, expect, it } from 'vitest'

import {
  computeRolloutHashSync,
  generateFlagSalt,
  isInRollout,
  selectVariantSync,
} from '../hash.js'
import type { FlagVariant } from '../types.js'

describe('computeRolloutHashSync', () => {
  it('returns a number between 0 and 99', () => {
    const hash = computeRolloutHashSync('user_123', 'salt_abc')
    expect(hash).toBeGreaterThanOrEqual(0)
    expect(hash).toBeLessThan(100)
  })

  it('returns consistent results for same input', () => {
    const hash1 = computeRolloutHashSync('user_123', 'salt_abc')
    const hash2 = computeRolloutHashSync('user_123', 'salt_abc')
    expect(hash1).toBe(hash2)
  })

  it('returns different results for different identifiers', () => {
    const hash1 = computeRolloutHashSync('user_123', 'salt_abc')
    const hash2 = computeRolloutHashSync('user_456', 'salt_abc')
    expect(hash1).not.toBe(hash2)
  })

  it('returns different results for different salts', () => {
    const hash1 = computeRolloutHashSync('user_123', 'salt_abc')
    const hash2 = computeRolloutHashSync('user_123', 'salt_xyz')
    expect(hash1).not.toBe(hash2)
  })
})

describe('isInRollout', () => {
  it('returns false for 0% rollout', () => {
    const result = isInRollout('user_123', 'salt', 0)
    expect(result).toBe(false)
  })

  it('returns true for 100% rollout', () => {
    const result = isInRollout('user_123', 'salt', 100)
    expect(result).toBe(true)
  })

  it('returns consistent results for same user', () => {
    const salt = 'fixed_salt'
    const result1 = isInRollout('user_abc', salt, 50)
    const result2 = isInRollout('user_abc', salt, 50)
    expect(result1).toBe(result2)
  })

  it('distributes roughly evenly at 50%', () => {
    const salt = 'distribution_test_salt'
    let inRollout = 0
    const total = 1000

    for (let i = 0; i < total; i++) {
      if (isInRollout(`user_${i}`, salt, 50)) {
        inRollout++
      }
    }

    // Should be roughly 50% (allow 10% variance)
    const percentage = (inRollout / total) * 100
    expect(percentage).toBeGreaterThan(40)
    expect(percentage).toBeLessThan(60)
  })
})

describe('selectVariantSync', () => {
  const variants: FlagVariant[] = [
    { key: 'control', weight: 50 },
    { key: 'v2', weight: 25 },
    { key: 'v3', weight: 25 },
  ]

  it('returns a valid variant key', () => {
    const result = selectVariantSync('user_123', 'salt', variants)
    expect(['control', 'v2', 'v3']).toContain(result)
  })

  it('returns consistent results for same input', () => {
    const result1 = selectVariantSync('user_123', 'salt', variants)
    const result2 = selectVariantSync('user_123', 'salt', variants)
    expect(result1).toBe(result2)
  })

  it('returns the only variant when there is one', () => {
    const singleVariant: FlagVariant[] = [{ key: 'only', weight: 100 }]
    const result = selectVariantSync('user_123', 'salt', singleVariant)
    expect(result).toBe('only')
  })

  it('throws for empty variants array', () => {
    expect(() => selectVariantSync('user_123', 'salt', [])).toThrow()
  })

  it('distributes according to weights', () => {
    const salt = 'variant_distribution_test'
    const counts: Record<string, number> = { control: 0, v2: 0, v3: 0 }
    const total = 1000

    for (let i = 0; i < total; i++) {
      const variant = selectVariantSync(`user_${i}`, salt, variants)
      counts[variant]++
    }

    // Control should be ~50% (allow 10% variance)
    const controlPercentage = (counts.control / total) * 100
    expect(controlPercentage).toBeGreaterThan(40)
    expect(controlPercentage).toBeLessThan(60)

    // v2 and v3 should each be ~25%
    const v2Percentage = (counts.v2 / total) * 100
    const v3Percentage = (counts.v3 / total) * 100
    expect(v2Percentage).toBeGreaterThan(15)
    expect(v2Percentage).toBeLessThan(35)
    expect(v3Percentage).toBeGreaterThan(15)
    expect(v3Percentage).toBeLessThan(35)
  })
})

describe('generateFlagSalt', () => {
  it('generates a 32-character hex string', () => {
    const salt = generateFlagSalt()
    expect(salt).toMatch(/^[0-9a-f]{32}$/)
  })

  it('generates unique salts', () => {
    const salts = new Set<string>()
    for (let i = 0; i < 100; i++) {
      salts.add(generateFlagSalt())
    }
    expect(salts.size).toBe(100)
  })
})
