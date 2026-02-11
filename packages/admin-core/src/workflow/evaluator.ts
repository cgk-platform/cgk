/**
 * Condition Evaluator for Workflow Engine
 * PHASE-2H-WORKFLOWS
 *
 * Evaluates conditions against entity context with support for:
 * - 13+ operators (equals, contains, regex, etc.)
 * - Dot notation field access (entity.metadata.tier)
 * - Computed fields (daysSinceLastUpdate, hoursInStatus)
 * - Type coercion for comparisons
 */

import type {
  Condition,
  ConditionOperator,
  ConditionResult,
  EvaluationContext,
} from './types'

/**
 * Evaluate all conditions against context (AND logic)
 */
export function evaluateConditions(
  conditions: Condition[],
  context: EvaluationContext
): { passed: boolean; results: ConditionResult[] } {
  if (conditions.length === 0) {
    return { passed: true, results: [] }
  }

  const results: ConditionResult[] = conditions.map((condition) => {
    const actualValue = getFieldValue(condition.field, context)
    const passed = evaluateCondition(condition, actualValue)

    return {
      condition,
      passed,
      actualValue,
    }
  })

  // All conditions must pass (AND logic)
  const passed = results.every((r) => r.passed)

  return { passed, results }
}

/**
 * Get field value from context using dot notation
 */
export function getFieldValue(field: string, context: EvaluationContext): unknown {
  // Check computed fields first
  if (field in context.computed) {
    return context.computed[field]
  }

  // Handle special prefixes
  if (field.startsWith('previous.')) {
    const subField = field.slice(9)
    return getNestedValue(context.previousEntity || {}, subField)
  }

  if (field.startsWith('user.')) {
    const subField = field.slice(5)
    return getNestedValue(context.user || {}, subField)
  }

  if (field.startsWith('computed.')) {
    const subField = field.slice(9)
    return context.computed[subField]
  }

  // Default: look in entity
  return getNestedValue(context.entity, field)
}

/**
 * Get nested value using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }

    if (typeof current !== 'object') {
      return undefined
    }

    current = (current as Record<string, unknown>)[part]
  }

  return current
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(condition: Condition, actualValue: unknown): boolean {
  const { operator, value: expectedValue } = condition

  switch (operator) {
    case 'equals':
      return isEqual(actualValue, expectedValue)

    case 'notEquals':
      return !isEqual(actualValue, expectedValue)

    case 'greaterThan':
      return compareNumbers(actualValue, expectedValue) > 0

    case 'lessThan':
      return compareNumbers(actualValue, expectedValue) < 0

    case 'greaterThanOrEqual':
      return compareNumbers(actualValue, expectedValue) >= 0

    case 'lessThanOrEqual':
      return compareNumbers(actualValue, expectedValue) <= 0

    case 'in':
      return isIn(actualValue, expectedValue)

    case 'notIn':
      return !isIn(actualValue, expectedValue)

    case 'contains':
      return contains(actualValue, expectedValue)

    case 'startsWith':
      return startsWith(actualValue, expectedValue)

    case 'endsWith':
      return endsWith(actualValue, expectedValue)

    case 'exists':
      return actualValue !== null && actualValue !== undefined

    case 'notExists':
      return actualValue === null || actualValue === undefined

    case 'matches':
      return matchesRegex(actualValue, expectedValue)

    default:
      // Unknown operator - fail safely
      return false
  }
}

/**
 * Check equality with type coercion
 */
function isEqual(actual: unknown, expected: unknown): boolean {
  // Handle null/undefined
  if (actual === null || actual === undefined) {
    return expected === null || expected === undefined
  }

  // Handle special 'now' value for dates
  if (expected === 'now') {
    const actualDate = toDate(actual)
    if (actualDate) {
      // Within 1 minute is "equal" to now
      const diff = Math.abs(Date.now() - actualDate.getTime())
      return diff < 60000
    }
    return false
  }

  // Direct equality
  if (actual === expected) {
    return true
  }

  // String comparison (case insensitive for strings)
  if (typeof actual === 'string' && typeof expected === 'string') {
    return actual.toLowerCase() === expected.toLowerCase()
  }

  // Number comparison with type coercion
  if (typeof expected === 'number') {
    const actualNum = toNumber(actual)
    return actualNum !== null && actualNum === expected
  }

  // Boolean comparison
  if (typeof expected === 'boolean') {
    return toBoolean(actual) === expected
  }

  return false
}

/**
 * Compare numbers (handles date comparison)
 */
function compareNumbers(actual: unknown, expected: unknown): number {
  // Handle 'now' for date comparisons
  if (expected === 'now') {
    const actualDate = toDate(actual)
    if (actualDate) {
      return actualDate.getTime() - Date.now()
    }
    return 0
  }

  // Try date comparison
  const actualDate = toDate(actual)
  const expectedDate = toDate(expected)

  if (actualDate && expectedDate) {
    return actualDate.getTime() - expectedDate.getTime()
  }

  // Numeric comparison
  const actualNum = toNumber(actual)
  const expectedNum = toNumber(expected)

  if (actualNum === null || expectedNum === null) {
    return 0
  }

  return actualNum - expectedNum
}

/**
 * Check if value is in array
 */
function isIn(actual: unknown, expected: unknown): boolean {
  if (!Array.isArray(expected)) {
    return false
  }

  return expected.some((item) => isEqual(actual, item))
}

/**
 * Check if string contains substring
 */
function contains(actual: unknown, expected: unknown): boolean {
  if (typeof actual !== 'string' || typeof expected !== 'string') {
    // Also check arrays
    if (Array.isArray(actual) && expected !== null && expected !== undefined) {
      return actual.some((item) => isEqual(item, expected))
    }
    return false
  }

  return actual.toLowerCase().includes(expected.toLowerCase())
}

/**
 * Check if string starts with prefix
 */
function startsWith(actual: unknown, expected: unknown): boolean {
  if (typeof actual !== 'string' || typeof expected !== 'string') {
    return false
  }

  return actual.toLowerCase().startsWith(expected.toLowerCase())
}

/**
 * Check if string ends with suffix
 */
function endsWith(actual: unknown, expected: unknown): boolean {
  if (typeof actual !== 'string' || typeof expected !== 'string') {
    return false
  }

  return actual.toLowerCase().endsWith(expected.toLowerCase())
}

/**
 * Check if value matches regex pattern
 */
function matchesRegex(actual: unknown, pattern: unknown): boolean {
  if (typeof actual !== 'string' || typeof pattern !== 'string') {
    return false
  }

  try {
    const regex = new RegExp(pattern, 'i')
    return regex.test(actual)
  } catch {
    // Invalid regex
    return false
  }
}

/**
 * Convert value to number
 */
function toNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? null : parsed
  }

  if (value instanceof Date) {
    return value.getTime()
  }

  return null
}

/**
 * Convert value to boolean
 */
function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    return lower === 'true' || lower === 'yes' || lower === '1'
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  return Boolean(value)
}

/**
 * Convert value to Date
 */
function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return value
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
  }

  return null
}

// ============================================================
// Computed Field Calculators
// ============================================================

/**
 * Compute all standard computed fields for an entity
 */
export function computeFields(entity: Record<string, unknown>): Record<string, unknown> {
  return {
    daysSinceCreated: computeDaysSince(entity.createdAt || entity.created_at),
    daysSinceUpdated: computeDaysSince(entity.updatedAt || entity.updated_at),
    daysSinceLastUpdate: computeDaysSinceLastUpdate(entity),
    hoursInStatus: computeHoursInStatus(entity),
    daysSinceDue: computeDaysSinceDue(entity),
    isOverdue: computeIsOverdue(entity),
  }
}

/**
 * Calculate days since a given date
 */
export function computeDaysSince(date: unknown): number | null {
  const d = toDate(date)
  if (!d) return null

  const diffMs = Date.now() - d.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Calculate days since last update
 */
export function computeDaysSinceLastUpdate(entity: Record<string, unknown>): number {
  const updatedAt = entity.updatedAt || entity.updated_at || entity.lastUpdatedAt
  const days = computeDaysSince(updatedAt)
  return days ?? 0
}

/**
 * Calculate hours in current status
 */
export function computeHoursInStatus(entity: Record<string, unknown>): number {
  const statusChangedAt =
    entity.statusChangedAt || entity.status_changed_at || entity.updatedAt || entity.updated_at

  const date = toDate(statusChangedAt)
  if (!date) return 0

  const diffMs = Date.now() - date.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60))
}

/**
 * Calculate days since due date (negative = due in future)
 */
export function computeDaysSinceDue(entity: Record<string, unknown>): number | null {
  const dueDate = entity.dueDate || entity.due_date
  if (!dueDate) return null

  const days = computeDaysSince(dueDate)
  return days
}

/**
 * Check if entity is overdue
 */
export function computeIsOverdue(entity: Record<string, unknown>): boolean {
  const dueDate = entity.dueDate || entity.due_date
  if (!dueDate) return false

  const status = entity.status as string | undefined
  if (status === 'completed' || status === 'done' || status === 'cancelled') {
    return false
  }

  const d = toDate(dueDate)
  if (!d) return false

  return Date.now() > d.getTime()
}

/**
 * Get the count of reminders sent (from state data)
 */
export function computeRemindersSent(stateData: Record<string, unknown>): number {
  return (stateData.remindersSent as number) || 0
}
