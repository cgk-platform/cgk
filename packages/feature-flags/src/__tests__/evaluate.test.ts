/**
 * Tests for flag evaluation logic
 */

import { describe, expect, it } from 'vitest'

import { evaluateFlag } from '../evaluate.js'
import type { EvaluationContext, FeatureFlag, FlagOverride } from '../types.js'

function createFlag(overrides: Partial<FeatureFlag> = {}): FeatureFlag {
  return {
    id: 'flag_1',
    key: 'test.flag',
    name: 'Test Flag',
    type: 'boolean',
    status: 'active',
    defaultValue: false,
    targeting: {},
    salt: 'test_salt_123',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('evaluateFlag', () => {
  describe('disabled/archived flags', () => {
    it('returns default value for disabled flag', () => {
      const flag = createFlag({ status: 'disabled', defaultValue: true })
      const result = evaluateFlag(flag, {})

      expect(result.enabled).toBe(true)
      expect(result.reason).toBe('flag_disabled')
    })

    it('returns default value for archived flag', () => {
      const flag = createFlag({ status: 'archived', defaultValue: false })
      const result = evaluateFlag(flag, {})

      expect(result.enabled).toBe(false)
      expect(result.reason).toBe('flag_disabled')
    })
  })

  describe('user overrides', () => {
    it('returns user override value when present', () => {
      const flag = createFlag()
      const context: EvaluationContext = { userId: 'user_123' }
      const overrides: FlagOverride[] = [
        {
          id: 'override_1',
          flagId: 'flag_1',
          flagKey: 'test.flag',
          userId: 'user_123',
          value: true,
          createdAt: new Date(),
        },
      ]

      const result = evaluateFlag(flag, context, overrides)

      expect(result.enabled).toBe(true)
      expect(result.reason).toBe('user_override')
    })

    it('ignores expired user overrides', () => {
      const flag = createFlag()
      const context: EvaluationContext = { userId: 'user_123' }
      const overrides: FlagOverride[] = [
        {
          id: 'override_1',
          flagId: 'flag_1',
          flagKey: 'test.flag',
          userId: 'user_123',
          value: true,
          expiresAt: new Date('2020-01-01'),
          createdAt: new Date(),
        },
      ]

      const result = evaluateFlag(flag, context, overrides)

      expect(result.enabled).toBe(false)
      expect(result.reason).toBe('default_value')
    })
  })

  describe('tenant overrides', () => {
    it('returns tenant override value when present', () => {
      const flag = createFlag()
      const context: EvaluationContext = { tenantId: 'rawdog' }
      const overrides: FlagOverride[] = [
        {
          id: 'override_1',
          flagId: 'flag_1',
          flagKey: 'test.flag',
          tenantId: 'rawdog',
          value: true,
          createdAt: new Date(),
        },
      ]

      const result = evaluateFlag(flag, context, overrides)

      expect(result.enabled).toBe(true)
      expect(result.reason).toBe('tenant_override')
    })

    it('user override takes precedence over tenant override', () => {
      const flag = createFlag()
      const context: EvaluationContext = { tenantId: 'rawdog', userId: 'user_123' }
      const overrides: FlagOverride[] = [
        {
          id: 'override_1',
          flagId: 'flag_1',
          flagKey: 'test.flag',
          tenantId: 'rawdog',
          value: false,
          createdAt: new Date(),
        },
        {
          id: 'override_2',
          flagId: 'flag_1',
          flagKey: 'test.flag',
          userId: 'user_123',
          value: true,
          createdAt: new Date(),
        },
      ]

      const result = evaluateFlag(flag, context, overrides)

      expect(result.enabled).toBe(true)
      expect(result.reason).toBe('user_override')
    })
  })

  describe('tenant lists', () => {
    it('returns true for enabled tenant', () => {
      const flag = createFlag({
        targeting: { enabledTenants: ['rawdog', 'brandx'] },
      })
      const context: EvaluationContext = { tenantId: 'rawdog' }

      const result = evaluateFlag(flag, context)

      expect(result.enabled).toBe(true)
      expect(result.reason).toBe('enabled_tenant')
    })

    it('returns default for disabled tenant', () => {
      const flag = createFlag({
        targeting: { disabledTenants: ['rawdog'] },
        defaultValue: true,
      })
      const context: EvaluationContext = { tenantId: 'rawdog' }

      const result = evaluateFlag(flag, context)

      expect(result.enabled).toBe(true)
      expect(result.reason).toBe('disabled_tenant')
    })

    it('disabled tenant takes precedence over enabled tenant', () => {
      const flag = createFlag({
        targeting: {
          enabledTenants: ['rawdog'],
          disabledTenants: ['rawdog'],
        },
      })
      const context: EvaluationContext = { tenantId: 'rawdog' }

      const result = evaluateFlag(flag, context)

      expect(result.reason).toBe('disabled_tenant')
    })
  })

  describe('user lists', () => {
    it('returns true for enabled user', () => {
      const flag = createFlag({
        targeting: { enabledUsers: ['user_123', 'user_456'] },
      })
      const context: EvaluationContext = { userId: 'user_123' }

      const result = evaluateFlag(flag, context)

      expect(result.enabled).toBe(true)
      expect(result.reason).toBe('enabled_user')
    })
  })

  describe('percentage rollout', () => {
    it('includes user in rollout based on hash', () => {
      const flag = createFlag({
        type: 'percentage',
        targeting: { percentage: 100 }, // 100% rollout
      })
      const context: EvaluationContext = { userId: 'user_123' }

      const result = evaluateFlag(flag, context)

      expect(result.enabled).toBe(true)
      expect(result.reason).toBe('percentage_rollout')
    })

    it('excludes user from rollout when percentage is 0', () => {
      const flag = createFlag({
        type: 'percentage',
        targeting: { percentage: 0 },
      })
      const context: EvaluationContext = { userId: 'user_123' }

      const result = evaluateFlag(flag, context)

      expect(result.enabled).toBe(false)
      expect(result.reason).toBe('default_value')
    })

    it('produces consistent results for same user', () => {
      const flag = createFlag({
        type: 'percentage',
        targeting: { percentage: 50 },
      })
      const context: EvaluationContext = { userId: 'test_user_abc' }

      const result1 = evaluateFlag(flag, context)
      const result2 = evaluateFlag(flag, context)

      expect(result1.enabled).toBe(result2.enabled)
    })
  })

  describe('schedule', () => {
    it('returns true when within schedule window', () => {
      const now = new Date()
      const start = new Date(now.getTime() - 1000 * 60 * 60) // 1 hour ago
      const end = new Date(now.getTime() + 1000 * 60 * 60) // 1 hour from now

      const flag = createFlag({
        type: 'schedule',
        targeting: {
          schedule: {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          },
        },
      })

      const result = evaluateFlag(flag, {})

      expect(result.enabled).toBe(true)
      expect(result.reason).toBe('schedule_active')
    })

    it('returns default when outside schedule window', () => {
      const flag = createFlag({
        type: 'schedule',
        targeting: {
          schedule: {
            startDate: '2020-01-01T00:00:00Z',
            endDate: '2020-01-02T00:00:00Z',
          },
        },
      })

      const result = evaluateFlag(flag, {})

      expect(result.enabled).toBe(false)
      expect(result.reason).toBe('schedule_inactive')
    })
  })

  describe('default value', () => {
    it('returns default value when no targeting matches', () => {
      const flag = createFlag({ defaultValue: true })
      const result = evaluateFlag(flag, {})

      expect(result.enabled).toBe(true)
      expect(result.reason).toBe('default_value')
    })

    it('returns false default value', () => {
      const flag = createFlag({ defaultValue: false })
      const result = evaluateFlag(flag, {})

      expect(result.enabled).toBe(false)
      expect(result.reason).toBe('default_value')
    })
  })
})
