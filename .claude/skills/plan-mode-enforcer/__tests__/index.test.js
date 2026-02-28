import { describe, it, expect } from 'vitest'
import skill from '../index.js'

describe('plan-mode-enforcer', () => {
  describe('metadata', () => {
    it('should have correct name', () => {
      expect(skill.name).toBe('plan-mode-enforcer')
    })

    it('should have version', () => {
      expect(skill.version).toBe('1.0.0')
    })

    it('should have description', () => {
      expect(skill.description).toContain('EnterPlanMode')
    })
  })

  describe('execute() - validation', () => {
    it('should return error when no request provided', async () => {
      const result = await skill.execute({})

      expect(result.error).toBeDefined()
      expect(result.error).toContain('No request provided')
    })

    it('should return error when empty request', async () => {
      const result = await skill.execute({ request: '' })

      expect(result.error).toBeDefined()
    })

    it('should return error when whitespace-only request', async () => {
      const result = await skill.execute({ request: '   ' })

      expect(result.error).toBeDefined()
    })
  })

  describe('Exemption: Trivial fixes', () => {
    it('should NOT require plan for typo fix', async () => {
      const result = await skill.execute({
        request: 'Fix typo in variable name'
      })

      expect(result.requiresPlan).toBe(false)
      expect(result.exemption).toContain('Trivial')
    })

    it('should NOT require plan for single-line fix', async () => {
      const result = await skill.execute({
        request: 'Fix obvious bug in single line'
      })

      expect(result.requiresPlan).toBe(false)
      expect(result.exemption).toContain('Trivial')
    })

    it('should NOT require plan for spelling correction', async () => {
      const result = await skill.execute({
        request: 'Correct spelling mistake in comment'
      })

      expect(result.requiresPlan).toBe(false)
    })

    it('should NOT require plan for formatting fix', async () => {
      const result = await skill.execute({
        request: 'Fix code formatting'
      })

      expect(result.requiresPlan).toBe(false)
    })
  })

  describe('Exemption: Research/exploration', () => {
    it('should NOT require plan for reading files', async () => {
      const result = await skill.execute({
        request: 'Read the auth.ts file and explain how it works'
      })

      expect(result.requiresPlan).toBe(false)
      expect(result.exemption).toContain('research')
    })

    it('should NOT require plan for searching code', async () => {
      const result = await skill.execute({
        request: 'Search for all uses of withTenant in the codebase'
      })

      expect(result.requiresPlan).toBe(false)
    })

    it('should NOT require plan for explaining code', async () => {
      const result = await skill.execute({
        request: 'Explain how the tenant isolation system works'
      })

      expect(result.requiresPlan).toBe(false)
    })

    it('should NOT require plan for finding files', async () => {
      const result = await skill.execute({
        request: 'Find all migration files'
      })

      expect(result.requiresPlan).toBe(false)
    })

    it('should REQUIRE plan when research leads to implementation', async () => {
      const result = await skill.execute({
        request: 'Read auth.ts and then implement OAuth support'
      })

      expect(result.requiresPlan).toBe(true)
      expect(result.reason).toContain('Feature implementation')
    })
  })

  describe('Exemption: User requested skip', () => {
    it('should NOT require plan when user says "skip plan"', async () => {
      const result = await skill.execute({
        request: 'Create a new API route, skip plan'
      })

      expect(result.requiresPlan).toBe(false)
      expect(result.exemption).toContain('explicitly requested')
    })

    it('should NOT require plan when user says "no plan"', async () => {
      const result = await skill.execute({
        request: 'Add validation, no plan needed'
      })

      expect(result.requiresPlan).toBe(false)
    })

    it('should NOT require plan when user says "without plan"', async () => {
      const result = await skill.execute({
        request: 'Build this component without plan'
      })

      expect(result.requiresPlan).toBe(false)
    })

    it('should NOT require plan when user says "just do it"', async () => {
      const result = await skill.execute({
        request: 'Just do it, add the feature'
      })

      expect(result.requiresPlan).toBe(false)
    })
  })

  describe('Requirement: Feature implementation', () => {
    it('should REQUIRE plan for creating new feature', async () => {
      const result = await skill.execute({
        request: 'Create a new customer analytics dashboard'
      })

      expect(result.requiresPlan).toBe(true)
      expect(result.reason).toContain('Feature implementation')
    })

    it('should REQUIRE plan for building component', async () => {
      const result = await skill.execute({
        request: 'Build a new order status widget'
      })

      expect(result.requiresPlan).toBe(true)
    })

    it('should REQUIRE plan for implementing API', async () => {
      const result = await skill.execute({
        request: 'Implement webhook handler for Stripe'
      })

      expect(result.requiresPlan).toBe(true)
    })

    it('should REQUIRE plan for adding new page', async () => {
      const result = await skill.execute({
        request: 'Add new settings page'
      })

      expect(result.requiresPlan).toBe(true)
    })

    it('should REQUIRE plan for new service', async () => {
      const result = await skill.execute({
        request: 'Create email notification service'
      })

      expect(result.requiresPlan).toBe(true)
    })
  })

  describe('Requirement: Multi-file changes', () => {
    it('should REQUIRE plan for changes across files', async () => {
      const result = await skill.execute({
        request: 'Update authentication across all apps'
      })

      expect(result.requiresPlan).toBe(true)
      // May trigger on architectural (authentication) or multi-file - either is correct
      expect(result.reason).toBeDefined()
    })

    it('should REQUIRE plan for updating multiple components', async () => {
      const result = await skill.execute({
        request: 'Update all order-related components and APIs'
      })

      expect(result.requiresPlan).toBe(true)
    })

    it('should REQUIRE plan for platform-wide changes', async () => {
      const result = await skill.execute({
        request: 'Add error tracking to the entire platform'
      })

      expect(result.requiresPlan).toBe(true)
    })

    it('should REQUIRE plan based on file count estimate', async () => {
      const result = await skill.execute({
        request: 'Create API route, update schema, add UI component, and write tests'
      })

      expect(result.requiresPlan).toBe(true)
      expect(result.analysis.fileCountEstimate).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Requirement: Architectural decisions', () => {
    it('should REQUIRE plan for database schema changes', async () => {
      const result = await skill.execute({
        request: 'Add new database schema for inventory tracking'
      })

      expect(result.requiresPlan).toBe(true)
      expect(result.reason).toContain('architectural')
    })

    it('should REQUIRE plan for authentication changes', async () => {
      const result = await skill.execute({
        request: 'Update authentication to support SSO'
      })

      expect(result.requiresPlan).toBe(true)
    })

    it('should REQUIRE plan for new integration', async () => {
      const result = await skill.execute({
        request: 'Add new integration with SendGrid API for email'
      })

      expect(result.requiresPlan).toBe(true)
      expect(result.reason).toContain('architectural')
    })

    it('should REQUIRE plan for migration work', async () => {
      const result = await skill.execute({
        request: 'Create migration to split customers table'
      })

      expect(result.requiresPlan).toBe(true)
    })
  })

  describe('Requirement: Refactoring', () => {
    it('should REQUIRE plan for refactoring', async () => {
      const result = await skill.execute({
        request: 'Refactor the API route handlers to reduce duplication'
      })

      expect(result.requiresPlan).toBe(true)
      // May trigger on refactoring or architectural - either is correct
      expect(result.reason).toBeDefined()
    })

    it('should REQUIRE plan for restructuring', async () => {
      const result = await skill.execute({
        request: 'Restructure API routes for better organization'
      })

      expect(result.requiresPlan).toBe(true)
    })

    it('should REQUIRE plan for code splitting', async () => {
      const result = await skill.execute({
        request: 'Split large component into smaller pieces'
      })

      expect(result.requiresPlan).toBe(true)
    })

    it('should REQUIRE plan for consolidation', async () => {
      const result = await skill.execute({
        request: 'Consolidate duplicate utility functions'
      })

      expect(result.requiresPlan).toBe(true)
    })
  })

  describe('Requirement: Phase work', () => {
    it('should REQUIRE plan for phase implementation', async () => {
      const result = await skill.execute({
        request: 'Implement Phase 2A: Analytics Dashboard'
      })

      expect(result.requiresPlan).toBe(true)
      expect(result.reason).toContain('Phase')
    })

    it('should REQUIRE plan for milestone work', async () => {
      const result = await skill.execute({
        request: 'Complete milestone: User Management'
      })

      expect(result.requiresPlan).toBe(true)
    })

    it('should REQUIRE plan for epic work', async () => {
      const result = await skill.execute({
        request: 'Build epic: Multi-currency support'
      })

      expect(result.requiresPlan).toBe(true)
    })
  })

  describe('Complexity analysis', () => {
    it('should detect trivial complexity', async () => {
      const result = await skill.execute({
        request: 'Fix typo in README'
      })

      expect(result.analysis.complexity).toBe('trivial')
    })

    it('should detect research complexity', async () => {
      const result = await skill.execute({
        request: 'Show me how the cache system works'
      })

      expect(result.analysis.complexity).toBe('research')
    })

    it('should detect low complexity', async () => {
      const result = await skill.execute({
        request: 'Update button color'
      })

      expect(result.analysis.complexity).toBe('low')
    })

    it('should detect medium complexity for feature', async () => {
      const result = await skill.execute({
        request: 'Add export button to dashboard'
      })

      expect(result.analysis.complexity).toBe('medium')
    })

    it('should detect high complexity for architectural work', async () => {
      const result = await skill.execute({
        request: 'Design new multi-tenant caching architecture'
      })

      expect(result.analysis.complexity).toBe('high')
    })
  })

  describe('File count estimation', () => {
    it('should estimate high file count for platform-wide changes', async () => {
      const result = await skill.execute({
        request: 'Update all apps and packages'
      })

      expect(result.analysis.fileCountEstimate).toBeGreaterThanOrEqual(10)
    })

    it('should estimate medium file count for app changes', async () => {
      const result = await skill.execute({
        request: 'Update admin app and core package'
      })

      expect(result.analysis.fileCountEstimate).toBeGreaterThanOrEqual(5)
    })

    it('should estimate low file count for single component', async () => {
      const result = await skill.execute({
        request: 'Create a button component'
      })

      expect(result.analysis.fileCountEstimate).toBeLessThanOrEqual(3)
    })

    it('should count "and" keywords for estimation', async () => {
      const result = await skill.execute({
        request: 'Create component and API route and tests and docs'
      })

      expect(result.analysis.fileCountEstimate).toBeGreaterThan(1)
    })
  })

  describe('Verbose mode', () => {
    it('should provide detailed analysis when verbose=true', async () => {
      const result = await skill.execute({
        request: 'Create new feature',
        verbose: true
      })

      expect(result.analysis).toBeDefined()
      expect(result.analysis.complexity).toBeDefined()
      expect(result.analysis.fileCountEstimate).toBeDefined()
      expect(result.analysis.hasFeatureImplementation).toBeDefined()
    })
  })

  describe('Action determination', () => {
    it('should return BLOCK_IMPLEMENTATION when plan required', async () => {
      const result = await skill.execute({
        request: 'Build new dashboard'
      })

      expect(result.action).toBe('BLOCK_IMPLEMENTATION_UNTIL_PLANNED')
    })

    it('should return PROCEED_WITH_IMPLEMENTATION when exempt', async () => {
      const result = await skill.execute({
        request: 'Fix typo'
      })

      expect(result.action).toBe('PROCEED_WITH_IMPLEMENTATION')
    })
  })

  describe('Edge cases', () => {
    it('should handle very long requests', async () => {
      const longRequest = 'Create ' + 'a new feature '.repeat(100)
      const result = await skill.execute({ request: longRequest })

      expect(result.requiresPlan).toBeDefined()
    })

    it('should handle mixed case', async () => {
      const result = await skill.execute({
        request: 'FIX TYPO IN README.md'
      })

      expect(result.requiresPlan).toBe(false)
    })

    it('should handle special characters', async () => {
      const result = await skill.execute({
        request: 'Update @cgk-platform/auth package'
      })

      expect(result).toBeDefined()
    })

    it('should handle ambiguous requests', async () => {
      const result = await skill.execute({
        request: 'Update the thing'
      })

      // Should still make a decision
      expect(result.requiresPlan).toBeDefined()
    })
  })

  describe('Realistic scenarios', () => {
    it('should REQUIRE plan for "Add Stripe integration"', async () => {
      const result = await skill.execute({
        request: 'Add Stripe integration for payment processing'
      })

      expect(result.requiresPlan).toBe(true)
    })

    it('should NOT require plan for "Show me the Stripe integration code"', async () => {
      const result = await skill.execute({
        request: 'Show me the Stripe integration code'
      })

      expect(result.requiresPlan).toBe(false)
    })

    it('should REQUIRE plan for "Refactor auth to use Clerk"', async () => {
      const result = await skill.execute({
        request: 'Refactor authentication to use Clerk instead of custom JWT'
      })

      expect(result.requiresPlan).toBe(true)
    })

    it('should NOT require plan for "Fix the login button alignment"', async () => {
      const result = await skill.execute({
        request: 'Fix the login button alignment'
      })

      expect(result.requiresPlan).toBe(false)
    })

    it('should REQUIRE plan for "Build creator portal"', async () => {
      const result = await skill.execute({
        request: 'Build the creator portal with dashboard and payout management'
      })

      expect(result.requiresPlan).toBe(true)
    })
  })
})
