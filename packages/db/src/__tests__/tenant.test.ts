/**
 * Tenant isolation tests
 *
 * Tests for the tenant context utilities to ensure proper isolation.
 */

import { describe, expect, it } from 'vitest'

import {
  getTenantSchemaName,
  isValidTenantSlug,
  validateTenantSlug,
} from '../tenant.js'

describe('Tenant Slug Validation', () => {
  describe('isValidTenantSlug', () => {
    it('should accept valid slugs', () => {
      expect(isValidTenantSlug('rawdog')).toBe(true)
      expect(isValidTenantSlug('my_brand')).toBe(true)
      expect(isValidTenantSlug('brand_2024')).toBe(true)
      expect(isValidTenantSlug('test123')).toBe(true)
      expect(isValidTenantSlug('a')).toBe(true)
      expect(isValidTenantSlug('123')).toBe(true)
    })

    it('should reject invalid slugs', () => {
      expect(isValidTenantSlug('My-Brand')).toBe(false) // uppercase and hyphen
      expect(isValidTenantSlug('my-brand')).toBe(false) // hyphen
      expect(isValidTenantSlug('My Brand')).toBe(false) // space and uppercase
      expect(isValidTenantSlug('RAWDOG')).toBe(false) // uppercase
      expect(isValidTenantSlug('')).toBe(false) // empty
      expect(isValidTenantSlug('brand!')).toBe(false) // special char
      expect(isValidTenantSlug('brand@test')).toBe(false) // special char
      expect(isValidTenantSlug('brand.test')).toBe(false) // period
    })
  })

  describe('validateTenantSlug', () => {
    it('should not throw for valid slugs', () => {
      expect(() => validateTenantSlug('rawdog')).not.toThrow()
      expect(() => validateTenantSlug('my_brand')).not.toThrow()
      expect(() => validateTenantSlug('test_123')).not.toThrow()
    })

    it('should throw for invalid slugs', () => {
      expect(() => validateTenantSlug('My-Brand')).toThrow()
      expect(() => validateTenantSlug('RAWDOG')).toThrow()
      expect(() => validateTenantSlug('')).toThrow()
      expect(() => validateTenantSlug('brand name')).toThrow()
    })

    it('should include the invalid slug in error message', () => {
      expect(() => validateTenantSlug('Invalid-Slug')).toThrow(/Invalid-Slug/)
    })
  })

  describe('getTenantSchemaName', () => {
    it('should return correct schema name', () => {
      expect(getTenantSchemaName('rawdog')).toBe('tenant_rawdog')
      expect(getTenantSchemaName('my_brand')).toBe('tenant_my_brand')
      expect(getTenantSchemaName('test123')).toBe('tenant_test123')
    })

    it('should throw for invalid slugs', () => {
      expect(() => getTenantSchemaName('Invalid')).toThrow()
      expect(() => getTenantSchemaName('my-brand')).toThrow()
    })
  })
})
