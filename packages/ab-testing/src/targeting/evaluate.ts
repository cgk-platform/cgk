/**
 * Targeting Rule Evaluation Engine
 *
 * Evaluates targeting rules against visitor context to determine
 * whether to include, exclude, or force-assign visitors.
 */

import type { ABTargetingRule, VisitorContext, TargetingResult } from '../types.js'
import { matchAllConditions, matchAnyCondition } from './conditions.js'

/**
 * Evaluate targeting rules against visitor context
 *
 * Rules are evaluated in priority order (highest first).
 * First matching rule determines the result.
 *
 * @param rules - Targeting rules to evaluate
 * @param context - Visitor context
 * @returns Targeting result
 */
export function evaluateTargeting(
  rules: ABTargetingRule[],
  context: VisitorContext
): TargetingResult {
  if (rules.length === 0) {
    return { action: 'default' }
  }

  // Sort by priority (higher first)
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority)

  for (const rule of sortedRules) {
    if (matchesRule(rule, context)) {
      switch (rule.action) {
        case 'include':
          return { action: 'include' }
        case 'exclude':
          return { action: 'exclude' }
        case 'assign_variant':
          if (rule.assignedVariantId) {
            return { action: 'assign_variant', variantId: rule.assignedVariantId }
          }
          // Fall through to default if no variant specified
          break
      }
    }
  }

  return { action: 'default' }
}

/**
 * Check if a rule matches the visitor context
 */
function matchesRule(rule: ABTargetingRule, context: VisitorContext): boolean {
  if (rule.conditions.length === 0) {
    // Empty conditions = always matches
    return true
  }

  if (rule.logic === 'and') {
    return matchAllConditions(rule.conditions, context)
  } else {
    return matchAnyCondition(rule.conditions, context)
  }
}

/**
 * Evaluate multiple tests' targeting rules
 *
 * @param rulesByTest - Map of test ID to targeting rules
 * @param context - Visitor context
 * @returns Map of test ID to targeting result
 */
export function evaluateMultipleTests(
  rulesByTest: Map<string, ABTargetingRule[]>,
  context: VisitorContext
): Map<string, TargetingResult> {
  const results = new Map<string, TargetingResult>()

  for (const [testId, rules] of rulesByTest) {
    results.set(testId, evaluateTargeting(rules, context))
  }

  return results
}

/**
 * Check if visitor should be excluded from a test
 *
 * @param rules - Targeting rules
 * @param context - Visitor context
 * @returns true if visitor should be excluded
 */
export function shouldExclude(rules: ABTargetingRule[], context: VisitorContext): boolean {
  const result = evaluateTargeting(rules, context)
  return result.action === 'exclude'
}

/**
 * Check if visitor should be force-assigned to a variant
 *
 * @param rules - Targeting rules
 * @param context - Visitor context
 * @returns Variant ID if force-assigned, undefined otherwise
 */
export function getForceAssignment(
  rules: ABTargetingRule[],
  context: VisitorContext
): string | undefined {
  const result = evaluateTargeting(rules, context)
  if (result.action === 'assign_variant') {
    return result.variantId
  }
  return undefined
}

/**
 * Validate targeting rules
 *
 * @param rules - Rules to validate
 * @returns Validation result with any issues
 */
export function validateTargetingRules(
  rules: ABTargetingRule[]
): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  // Check for duplicate priorities
  const priorities = rules.map((r) => r.priority)
  const duplicatePriorities = priorities.filter(
    (p, i) => priorities.indexOf(p) !== i
  )
  if (duplicatePriorities.length > 0) {
    issues.push(
      `Duplicate priorities found: ${[...new Set(duplicatePriorities)].join(', ')}. ` +
        'Rules with the same priority may have unpredictable evaluation order.'
    )
  }

  // Check for conflicting rules
  const hasInclude = rules.some((r) => r.action === 'include')
  const hasExclude = rules.some((r) => r.action === 'exclude')
  if (hasInclude && hasExclude) {
    // This is fine, just informational
  }

  // Check for empty conditions
  for (const rule of rules) {
    if (rule.conditions.length === 0) {
      issues.push(
        `Rule "${rule.name}" has no conditions and will match all visitors.`
      )
    }
  }

  // Check assign_variant rules have variant IDs
  for (const rule of rules) {
    if (rule.action === 'assign_variant' && !rule.assignedVariantId) {
      issues.push(
        `Rule "${rule.name}" has assign_variant action but no variant ID specified.`
      )
    }
  }

  return { valid: issues.filter((i) => !i.includes('will match')).length === 0, issues }
}

/**
 * Create common targeting rule templates
 */
export const TargetingTemplates = {
  /**
   * Target visitors from specific countries
   */
  countries(countries: string[], action: 'include' | 'exclude' = 'include'): Omit<ABTargetingRule, 'id' | 'tenantId' | 'testId' | 'createdAt'> {
    return {
      name: `${action === 'include' ? 'Include' : 'Exclude'} countries: ${countries.join(', ')}`,
      conditions: [
        {
          field: 'country',
          operator: action === 'include' ? 'in' : 'not_in',
          value: countries,
        },
      ],
      logic: 'and',
      action,
      priority: 100,
    }
  },

  /**
   * Target mobile visitors only
   */
  mobileOnly(): Omit<ABTargetingRule, 'id' | 'tenantId' | 'testId' | 'createdAt'> {
    return {
      name: 'Mobile visitors only',
      conditions: [
        {
          field: 'device_type',
          operator: 'equals',
          value: 'mobile',
        },
      ],
      logic: 'and',
      action: 'include',
      priority: 100,
    }
  },

  /**
   * Target desktop visitors only
   */
  desktopOnly(): Omit<ABTargetingRule, 'id' | 'tenantId' | 'testId' | 'createdAt'> {
    return {
      name: 'Desktop visitors only',
      conditions: [
        {
          field: 'device_type',
          operator: 'equals',
          value: 'desktop',
        },
      ],
      logic: 'and',
      action: 'include',
      priority: 100,
    }
  },

  /**
   * Target visitors from specific UTM campaigns
   */
  utmCampaigns(campaigns: string[]): Omit<ABTargetingRule, 'id' | 'tenantId' | 'testId' | 'createdAt'> {
    return {
      name: `UTM campaigns: ${campaigns.join(', ')}`,
      conditions: [
        {
          field: 'utm_campaign',
          operator: 'in',
          value: campaigns,
        },
      ],
      logic: 'and',
      action: 'include',
      priority: 100,
    }
  },

  /**
   * Exclude internal traffic by URL pattern
   */
  excludeInternal(): Omit<ABTargetingRule, 'id' | 'tenantId' | 'testId' | 'createdAt'> {
    return {
      name: 'Exclude internal traffic',
      conditions: [
        {
          field: 'url',
          operator: 'contains',
          value: 'internal=true',
        },
      ],
      logic: 'and',
      action: 'exclude',
      priority: 1000, // High priority to exclude first
    }
  },
}
