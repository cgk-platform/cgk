/**
 * Condition Matchers
 *
 * Evaluates individual targeting conditions against visitor context.
 */

import type {
  TargetingCondition,
  ConditionOperator,
  ConditionField,
  VisitorContext,
} from '../types.js'

/**
 * Get field value from visitor context
 */
function getFieldValue(
  field: ConditionField,
  context: VisitorContext,
  key?: string
): string | undefined {
  switch (field) {
    case 'url':
      return context.url
    case 'referrer':
      return context.referrer
    case 'utm_source':
      return context.utmSource
    case 'utm_medium':
      return context.utmMedium
    case 'utm_campaign':
      return context.utmCampaign
    case 'device_type':
      return context.deviceType
    case 'browser':
      return context.browser
    case 'country':
      return context.country
    case 'region':
      return context.region
    case 'city':
      return context.city
    case 'cookie':
      return key ? context.cookies?.[key] : undefined
    case 'query_param':
      return key ? context.queryParams?.[key] : undefined
    default:
      return undefined
  }
}

/**
 * Match operator against value
 */
function matchOperator(
  operator: ConditionOperator,
  actualValue: string | undefined,
  expectedValue: string | string[]
): boolean {
  // Handle undefined actual values
  if (actualValue === undefined) {
    switch (operator) {
      case 'not_equals':
      case 'not_contains':
      case 'not_in':
        return true
      default:
        return false
    }
  }

  const actual = actualValue.toLowerCase()

  switch (operator) {
    case 'equals': {
      const expected = typeof expectedValue === 'string' ? expectedValue.toLowerCase() : ''
      return actual === expected
    }

    case 'not_equals': {
      const expected = typeof expectedValue === 'string' ? expectedValue.toLowerCase() : ''
      return actual !== expected
    }

    case 'contains': {
      const expected = typeof expectedValue === 'string' ? expectedValue.toLowerCase() : ''
      return actual.includes(expected)
    }

    case 'not_contains': {
      const expected = typeof expectedValue === 'string' ? expectedValue.toLowerCase() : ''
      return !actual.includes(expected)
    }

    case 'starts_with': {
      const expected = typeof expectedValue === 'string' ? expectedValue.toLowerCase() : ''
      return actual.startsWith(expected)
    }

    case 'ends_with': {
      const expected = typeof expectedValue === 'string' ? expectedValue.toLowerCase() : ''
      return actual.endsWith(expected)
    }

    case 'regex': {
      try {
        const pattern = typeof expectedValue === 'string' ? expectedValue : ''
        const regex = new RegExp(pattern, 'i')
        return regex.test(actualValue)
      } catch {
        console.warn(`Invalid regex pattern: ${expectedValue}`)
        return false
      }
    }

    case 'in': {
      const values = Array.isArray(expectedValue)
        ? expectedValue.map((v) => v.toLowerCase())
        : [expectedValue.toLowerCase()]
      return values.includes(actual)
    }

    case 'not_in': {
      const values = Array.isArray(expectedValue)
        ? expectedValue.map((v) => v.toLowerCase())
        : [expectedValue.toLowerCase()]
      return !values.includes(actual)
    }

    case 'greater_than': {
      const expected = typeof expectedValue === 'string' ? parseFloat(expectedValue) : 0
      const actualNum = parseFloat(actualValue)
      return !isNaN(actualNum) && !isNaN(expected) && actualNum > expected
    }

    case 'less_than': {
      const expected = typeof expectedValue === 'string' ? parseFloat(expectedValue) : 0
      const actualNum = parseFloat(actualValue)
      return !isNaN(actualNum) && !isNaN(expected) && actualNum < expected
    }

    default:
      console.warn(`Unknown operator: ${operator}`)
      return false
  }
}

/**
 * Match a single condition against visitor context
 *
 * @param condition - Condition to evaluate
 * @param context - Visitor context
 * @returns true if condition matches
 */
export function matchCondition(
  condition: TargetingCondition,
  context: VisitorContext
): boolean {
  const actualValue = getFieldValue(condition.field, context, condition.key)
  return matchOperator(condition.operator, actualValue, condition.value)
}

/**
 * Match multiple conditions with AND logic
 *
 * @param conditions - Conditions to evaluate
 * @param context - Visitor context
 * @returns true if all conditions match
 */
export function matchAllConditions(
  conditions: TargetingCondition[],
  context: VisitorContext
): boolean {
  if (conditions.length === 0) return true
  return conditions.every((condition) => matchCondition(condition, context))
}

/**
 * Match multiple conditions with OR logic
 *
 * @param conditions - Conditions to evaluate
 * @param context - Visitor context
 * @returns true if any condition matches
 */
export function matchAnyCondition(
  conditions: TargetingCondition[],
  context: VisitorContext
): boolean {
  if (conditions.length === 0) return true
  return conditions.some((condition) => matchCondition(condition, context))
}

/**
 * Validate a targeting condition
 *
 * @param condition - Condition to validate
 * @returns Validation result
 */
export function validateCondition(
  condition: TargetingCondition
): { valid: boolean; error?: string } {
  const validFields: ConditionField[] = [
    'url',
    'referrer',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'device_type',
    'browser',
    'country',
    'region',
    'city',
    'cookie',
    'query_param',
  ]

  const validOperators: ConditionOperator[] = [
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'starts_with',
    'ends_with',
    'regex',
    'in',
    'not_in',
    'greater_than',
    'less_than',
  ]

  if (!validFields.includes(condition.field)) {
    return { valid: false, error: `Invalid field: ${condition.field}` }
  }

  if (!validOperators.includes(condition.operator)) {
    return { valid: false, error: `Invalid operator: ${condition.operator}` }
  }

  if (condition.value === undefined || condition.value === null) {
    return { valid: false, error: 'Value is required' }
  }

  if ((condition.field === 'cookie' || condition.field === 'query_param') && !condition.key) {
    return { valid: false, error: `Key is required for ${condition.field} field` }
  }

  if (condition.operator === 'regex') {
    try {
      new RegExp(condition.value as string)
    } catch {
      return { valid: false, error: 'Invalid regex pattern' }
    }
  }

  return { valid: true }
}
