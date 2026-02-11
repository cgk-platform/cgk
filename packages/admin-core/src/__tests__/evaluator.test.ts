/**
 * Unit Tests for Condition Evaluator
 * PHASE-2H-WORKFLOWS
 *
 * Tests all 13 condition operators and computed fields
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  evaluateConditions,
  getFieldValue,
  computeFields,
  computeDaysSince,
  computeDaysSinceLastUpdate,
  computeHoursInStatus,
  computeDaysSinceDue,
  computeIsOverdue,
  computeRemindersSent,
} from '../workflow/evaluator'
import type { Condition, EvaluationContext } from '../workflow/types'

describe('evaluateConditions', () => {
  let context: EvaluationContext

  beforeEach(() => {
    context = {
      entity: {
        status: 'pending',
        name: 'Test Project',
        email: 'test@example.com',
        priority: 'high',
        count: 10,
        tags: ['urgent', 'vip'],
        metadata: {
          tier: 'gold',
          score: 85,
        },
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        statusChangedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 48 hours ago
      },
      previousEntity: {
        status: 'draft',
        priority: 'low',
      },
      user: {
        id: 'user_123',
        role: 'admin',
      },
      computed: {},
    }
    // Compute fields
    context.computed = computeFields(context.entity)
  })

  describe('empty conditions', () => {
    it('should pass when no conditions provided', () => {
      const result = evaluateConditions([], context)
      expect(result.passed).toBe(true)
      expect(result.results).toHaveLength(0)
    })
  })

  describe('equals operator', () => {
    it('should match exact string value', () => {
      const conditions: Condition[] = [
        { field: 'status', operator: 'equals', value: 'pending' },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should match case insensitively', () => {
      const conditions: Condition[] = [
        { field: 'status', operator: 'equals', value: 'PENDING' },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should not match different value', () => {
      const conditions: Condition[] = [
        { field: 'status', operator: 'equals', value: 'completed' },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(false)
    })

    it('should match numeric value', () => {
      const conditions: Condition[] = [
        { field: 'count', operator: 'equals', value: 10 },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })
  })

  describe('notEquals operator', () => {
    it('should pass when values are different', () => {
      const conditions: Condition[] = [
        { field: 'status', operator: 'notEquals', value: 'completed' },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should fail when values are equal', () => {
      const conditions: Condition[] = [
        { field: 'status', operator: 'notEquals', value: 'pending' },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(false)
    })
  })

  describe('greaterThan operator', () => {
    it('should compare numbers correctly', () => {
      const conditions: Condition[] = [
        { field: 'count', operator: 'greaterThan', value: 5 },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should fail when not greater', () => {
      const conditions: Condition[] = [
        { field: 'count', operator: 'greaterThan', value: 15 },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(false)
    })

    it('should fail when equal', () => {
      const conditions: Condition[] = [
        { field: 'count', operator: 'greaterThan', value: 10 },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(false)
    })
  })

  describe('lessThan operator', () => {
    it('should compare numbers correctly', () => {
      const conditions: Condition[] = [
        { field: 'count', operator: 'lessThan', value: 20 },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should fail when not less', () => {
      const conditions: Condition[] = [
        { field: 'count', operator: 'lessThan', value: 5 },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(false)
    })
  })

  describe('greaterThanOrEqual operator', () => {
    it('should pass when greater', () => {
      const conditions: Condition[] = [
        { field: 'count', operator: 'greaterThanOrEqual', value: 5 },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should pass when equal', () => {
      const conditions: Condition[] = [
        { field: 'count', operator: 'greaterThanOrEqual', value: 10 },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should fail when less', () => {
      const conditions: Condition[] = [
        { field: 'count', operator: 'greaterThanOrEqual', value: 15 },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(false)
    })
  })

  describe('lessThanOrEqual operator', () => {
    it('should pass when less', () => {
      const conditions: Condition[] = [
        { field: 'count', operator: 'lessThanOrEqual', value: 20 },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should pass when equal', () => {
      const conditions: Condition[] = [
        { field: 'count', operator: 'lessThanOrEqual', value: 10 },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should fail when greater', () => {
      const conditions: Condition[] = [
        { field: 'count', operator: 'lessThanOrEqual', value: 5 },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(false)
    })
  })

  describe('in operator', () => {
    it('should pass when value is in array', () => {
      const conditions: Condition[] = [
        { field: 'status', operator: 'in', value: ['pending', 'active', 'completed'] },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should fail when value is not in array', () => {
      const conditions: Condition[] = [
        { field: 'status', operator: 'in', value: ['active', 'completed'] },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(false)
    })

    it('should handle case insensitivity', () => {
      const conditions: Condition[] = [
        { field: 'status', operator: 'in', value: ['PENDING', 'ACTIVE'] },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })
  })

  describe('notIn operator', () => {
    it('should pass when value is not in array', () => {
      const conditions: Condition[] = [
        { field: 'status', operator: 'notIn', value: ['active', 'completed'] },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should fail when value is in array', () => {
      const conditions: Condition[] = [
        { field: 'status', operator: 'notIn', value: ['pending', 'active'] },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(false)
    })
  })

  describe('contains operator', () => {
    it('should check string contains substring', () => {
      const conditions: Condition[] = [
        { field: 'email', operator: 'contains', value: '@example' },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should be case insensitive', () => {
      const conditions: Condition[] = [
        { field: 'email', operator: 'contains', value: '@EXAMPLE' },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should check array contains value', () => {
      const conditions: Condition[] = [
        { field: 'tags', operator: 'contains', value: 'urgent' },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should fail when not contained', () => {
      const conditions: Condition[] = [
        { field: 'tags', operator: 'contains', value: 'normal' },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(false)
    })
  })

  describe('startsWith operator', () => {
    it('should check string starts with prefix', () => {
      const conditions: Condition[] = [
        { field: 'email', operator: 'startsWith', value: 'test' },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should be case insensitive', () => {
      const conditions: Condition[] = [
        { field: 'email', operator: 'startsWith', value: 'TEST' },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should fail when does not start with', () => {
      const conditions: Condition[] = [
        { field: 'email', operator: 'startsWith', value: 'admin' },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(false)
    })
  })

  describe('endsWith operator', () => {
    it('should check string ends with suffix', () => {
      const conditions: Condition[] = [
        { field: 'email', operator: 'endsWith', value: '@example.com' },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should be case insensitive', () => {
      const conditions: Condition[] = [
        { field: 'email', operator: 'endsWith', value: '@EXAMPLE.COM' },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should fail when does not end with', () => {
      const conditions: Condition[] = [
        { field: 'email', operator: 'endsWith', value: '@test.com' },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(false)
    })
  })

  describe('exists operator', () => {
    it('should pass when field exists', () => {
      const conditions: Condition[] = [
        { field: 'status', operator: 'exists', value: true },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should fail when field is undefined', () => {
      const conditions: Condition[] = [
        { field: 'nonexistent', operator: 'exists', value: true },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(false)
    })

    it('should fail when field is null', () => {
      context.entity.nullField = null
      const conditions: Condition[] = [
        { field: 'nullField', operator: 'exists', value: true },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(false)
    })
  })

  describe('notExists operator', () => {
    it('should pass when field does not exist', () => {
      const conditions: Condition[] = [
        { field: 'nonexistent', operator: 'notExists', value: true },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should pass when field is null', () => {
      context.entity.nullField = null
      const conditions: Condition[] = [
        { field: 'nullField', operator: 'notExists', value: true },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should fail when field exists', () => {
      const conditions: Condition[] = [
        { field: 'status', operator: 'notExists', value: true },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(false)
    })
  })

  describe('matches operator (regex)', () => {
    it('should match valid regex pattern', () => {
      const conditions: Condition[] = [
        { field: 'email', operator: 'matches', value: '^[a-z]+@' },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should fail when regex does not match', () => {
      const conditions: Condition[] = [
        { field: 'email', operator: 'matches', value: '^[0-9]+@' },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(false)
    })

    it('should handle invalid regex gracefully', () => {
      const conditions: Condition[] = [
        { field: 'email', operator: 'matches', value: '[invalid(' },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(false)
    })
  })

  describe('multiple conditions (AND logic)', () => {
    it('should pass when all conditions pass', () => {
      const conditions: Condition[] = [
        { field: 'status', operator: 'equals', value: 'pending' },
        { field: 'priority', operator: 'equals', value: 'high' },
        { field: 'count', operator: 'greaterThan', value: 5 },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
      expect(result.results).toHaveLength(3)
      expect(result.results.every((r) => r.passed)).toBe(true)
    })

    it('should fail when any condition fails', () => {
      const conditions: Condition[] = [
        { field: 'status', operator: 'equals', value: 'pending' },
        { field: 'priority', operator: 'equals', value: 'low' }, // This fails
        { field: 'count', operator: 'greaterThan', value: 5 },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(false)
      expect(result.results[1].passed).toBe(false)
    })
  })

  describe('nested field access (dot notation)', () => {
    it('should access nested fields', () => {
      const conditions: Condition[] = [
        { field: 'metadata.tier', operator: 'equals', value: 'gold' },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should handle deep nesting', () => {
      const conditions: Condition[] = [
        { field: 'metadata.score', operator: 'greaterThan', value: 80 },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should return undefined for invalid paths', () => {
      const conditions: Condition[] = [
        { field: 'metadata.nonexistent.deep', operator: 'exists', value: true },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(false)
    })
  })

  describe('previous entity access', () => {
    it('should access previous entity fields', () => {
      const conditions: Condition[] = [
        { field: 'previous.status', operator: 'equals', value: 'draft' },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should compare previous and current values', () => {
      const conditions: Condition[] = [
        { field: 'status', operator: 'notEquals', value: 'draft' },
        { field: 'previous.status', operator: 'equals', value: 'draft' },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })
  })

  describe('user context access', () => {
    it('should access user fields', () => {
      const conditions: Condition[] = [
        { field: 'user.role', operator: 'equals', value: 'admin' },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })
  })

  describe('computed fields access', () => {
    it('should access computed fields directly', () => {
      // hoursInStatus should be ~48
      const conditions: Condition[] = [
        { field: 'hoursInStatus', operator: 'greaterThan', value: 40 },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should access computed fields with prefix', () => {
      const conditions: Condition[] = [
        { field: 'computed.daysSinceCreated', operator: 'greaterThanOrEqual', value: 5 },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })
  })

  describe('date comparisons', () => {
    it('should compare dates with now', () => {
      context.entity.dueDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
      const conditions: Condition[] = [
        { field: 'dueDate', operator: 'lessThan', value: 'now' },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })

    it('should handle future dates', () => {
      context.entity.dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
      const conditions: Condition[] = [
        { field: 'dueDate', operator: 'greaterThan', value: 'now' },
      ]
      const result = evaluateConditions(conditions, context)
      expect(result.passed).toBe(true)
    })
  })
})

describe('getFieldValue', () => {
  const context: EvaluationContext = {
    entity: {
      name: 'Test',
      nested: { deep: { value: 'found' } },
    },
    previousEntity: { oldName: 'Old Test' },
    user: { id: 'user_1' },
    computed: { customField: 42 },
  }

  it('should get entity field', () => {
    expect(getFieldValue('name', context)).toBe('Test')
  })

  it('should get nested field', () => {
    expect(getFieldValue('nested.deep.value', context)).toBe('found')
  })

  it('should get previous entity field', () => {
    expect(getFieldValue('previous.oldName', context)).toBe('Old Test')
  })

  it('should get user field', () => {
    expect(getFieldValue('user.id', context)).toBe('user_1')
  })

  it('should get computed field directly', () => {
    expect(getFieldValue('customField', context)).toBe(42)
  })

  it('should get computed field with prefix', () => {
    expect(getFieldValue('computed.customField', context)).toBe(42)
  })

  it('should return undefined for missing fields', () => {
    expect(getFieldValue('nonexistent', context)).toBeUndefined()
  })
})

describe('computeFields', () => {
  it('should compute all standard fields', () => {
    const entity = {
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      statusChangedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
    }

    const computed = computeFields(entity)

    expect(computed.daysSinceCreated).toBe(10)
    expect(computed.daysSinceUpdated).toBe(3)
    expect(computed.daysSinceLastUpdate).toBe(3)
    expect(computed.hoursInStatus).toBe(12)
    expect(computed.daysSinceDue).toBe(2)
    expect(computed.isOverdue).toBe(true)
  })
})

describe('computeDaysSince', () => {
  it('should calculate days from date string', () => {
    const date = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    expect(computeDaysSince(date)).toBe(5)
  })

  it('should calculate days from Date object', () => {
    const date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    expect(computeDaysSince(date)).toBe(7)
  })

  it('should return null for invalid date', () => {
    expect(computeDaysSince('invalid')).toBeNull()
  })

  it('should return null for null input', () => {
    expect(computeDaysSince(null)).toBeNull()
  })
})

describe('computeDaysSinceLastUpdate', () => {
  it('should use updatedAt field', () => {
    const entity = {
      updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    }
    expect(computeDaysSinceLastUpdate(entity)).toBe(4)
  })

  it('should fallback to updated_at (snake_case)', () => {
    const entity = {
      updated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    }
    expect(computeDaysSinceLastUpdate(entity)).toBe(6)
  })

  it('should return 0 for missing date', () => {
    expect(computeDaysSinceLastUpdate({})).toBe(0)
  })
})

describe('computeHoursInStatus', () => {
  it('should calculate hours from statusChangedAt', () => {
    const entity = {
      statusChangedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    }
    expect(computeHoursInStatus(entity)).toBe(24)
  })

  it('should fallback to status_changed_at', () => {
    const entity = {
      status_changed_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    }
    expect(computeHoursInStatus(entity)).toBe(48)
  })

  it('should fallback to updatedAt', () => {
    const entity = {
      updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    }
    expect(computeHoursInStatus(entity)).toBe(12)
  })

  it('should return 0 for missing timestamps', () => {
    expect(computeHoursInStatus({})).toBe(0)
  })
})

describe('computeDaysSinceDue', () => {
  it('should calculate positive days for past due', () => {
    const entity = {
      dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    }
    expect(computeDaysSinceDue(entity)).toBe(3)
  })

  it('should calculate negative days for future due', () => {
    const entity = {
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    }
    expect(computeDaysSinceDue(entity)).toBe(-5)
  })

  it('should handle snake_case', () => {
    const entity = {
      due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    }
    expect(computeDaysSinceDue(entity)).toBe(2)
  })

  it('should return null for missing due date', () => {
    expect(computeDaysSinceDue({})).toBeNull()
  })
})

describe('computeIsOverdue', () => {
  it('should return true for overdue entity', () => {
    const entity = {
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
    }
    expect(computeIsOverdue(entity)).toBe(true)
  })

  it('should return false for future due date', () => {
    const entity = {
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
    }
    expect(computeIsOverdue(entity)).toBe(false)
  })

  it('should return false for completed entity', () => {
    const entity = {
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed',
    }
    expect(computeIsOverdue(entity)).toBe(false)
  })

  it('should return false for done entity', () => {
    const entity = {
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      status: 'done',
    }
    expect(computeIsOverdue(entity)).toBe(false)
  })

  it('should return false for cancelled entity', () => {
    const entity = {
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      status: 'cancelled',
    }
    expect(computeIsOverdue(entity)).toBe(false)
  })

  it('should return false for missing due date', () => {
    const entity = { status: 'pending' }
    expect(computeIsOverdue(entity)).toBe(false)
  })
})

describe('computeRemindersSent', () => {
  it('should return reminder count from state', () => {
    const state = { remindersSent: 3 }
    expect(computeRemindersSent(state)).toBe(3)
  })

  it('should return 0 for missing count', () => {
    expect(computeRemindersSent({})).toBe(0)
  })
})
