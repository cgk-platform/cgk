/**
 * Cache isolation tests
 *
 * Tests for the tenant-isolated cache utilities.
 */

import { describe, expect, it } from 'vitest'

import { createTenantCache, createGlobalCache } from '../cache.js'

describe('TenantCache', () => {
  describe('createTenantCache', () => {
    it('should create cache with correct tenant slug', () => {
      const cache = createTenantCache('rawdog')
      expect(cache.tenantSlug).toBe('rawdog')
    })

    it('should create cache with correct key prefix', () => {
      const cache = createTenantCache('rawdog')
      expect(cache.keyPrefix).toBe('tenant:rawdog')
    })

    it('should prefix keys correctly', () => {
      const cache = createTenantCache('rawdog')
      expect(cache.prefixKey('pricing-config')).toBe('tenant:rawdog:pricing-config')
      expect(cache.prefixKey('settings')).toBe('tenant:rawdog:settings')
    })

    it('should isolate different tenants', () => {
      const cache1 = createTenantCache('rawdog')
      const cache2 = createTenantCache('other_brand')

      expect(cache1.prefixKey('config')).toBe('tenant:rawdog:config')
      expect(cache2.prefixKey('config')).toBe('tenant:other_brand:config')
      expect(cache1.prefixKey('config')).not.toBe(cache2.prefixKey('config'))
    })
  })

  describe('createGlobalCache', () => {
    it('should create cache with platform prefix', () => {
      const cache = createGlobalCache()
      expect(cache.keyPrefix).toBe('platform')
    })

    it('should prefix keys correctly', () => {
      const cache = createGlobalCache()
      expect(cache.prefixKey('settings')).toBe('platform:settings')
    })
  })

  describe('In-memory cache operations', () => {
    // These tests use the in-memory fallback since no Redis is configured

    it('should set and get values', async () => {
      const cache = createTenantCache('test_tenant')

      await cache.set('key1', { value: 'test' })
      const result = await cache.get<{ value: string }>('key1')

      expect(result).toEqual({ value: 'test' })
    })

    it('should return undefined for non-existent keys', async () => {
      const cache = createTenantCache('test_tenant')

      const result = await cache.get('non_existent')
      expect(result).toBeUndefined()
    })

    it('should delete values', async () => {
      const cache = createTenantCache('test_tenant')

      await cache.set('key2', 'value')
      expect(await cache.exists('key2')).toBe(true)

      const deleted = await cache.delete('key2')
      expect(deleted).toBe(true)
      expect(await cache.exists('key2')).toBe(false)
    })

    it('should return false when deleting non-existent key', async () => {
      const cache = createTenantCache('test_tenant')

      const deleted = await cache.delete('non_existent')
      expect(deleted).toBe(false)
    })

    it('should check existence correctly', async () => {
      const cache = createTenantCache('test_tenant')

      expect(await cache.exists('key3')).toBe(false)

      await cache.set('key3', 'value')
      expect(await cache.exists('key3')).toBe(true)
    })

    it('should handle TTL expiration', async () => {
      const cache = createTenantCache('test_tenant')

      // Set with 1 second TTL
      await cache.set('expiring_key', 'value', { ttl: 1 })

      // Should exist immediately
      expect(await cache.get('expiring_key')).toBe('value')

      // Wait for expiration (add small buffer)
      await new Promise((resolve) => setTimeout(resolve, 1100))

      // Should be expired now
      expect(await cache.get('expiring_key')).toBeUndefined()
      expect(await cache.exists('expiring_key')).toBe(false)
    })

    it('should clear all keys for tenant', async () => {
      const cache = createTenantCache('clear_test')

      await cache.set('key_a', 'a')
      await cache.set('key_b', 'b')

      expect(await cache.exists('key_a')).toBe(true)
      expect(await cache.exists('key_b')).toBe(true)

      await cache.clear()

      expect(await cache.exists('key_a')).toBe(false)
      expect(await cache.exists('key_b')).toBe(false)
    })

    it('should not affect other tenants when clearing', async () => {
      const cache1 = createTenantCache('tenant_one')
      const cache2 = createTenantCache('tenant_two')

      await cache1.set('shared_key', 'value1')
      await cache2.set('shared_key', 'value2')

      await cache1.clear()

      // tenant_one's key should be cleared
      expect(await cache1.exists('shared_key')).toBe(false)

      // tenant_two's key should still exist
      expect(await cache2.get('shared_key')).toBe('value2')
    })

    it('should store complex objects', async () => {
      const cache = createTenantCache('test_tenant')

      const complexObject = {
        string: 'test',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        nested: { a: 1, b: 2 },
      }

      await cache.set('complex', complexObject)
      const result = await cache.get<typeof complexObject>('complex')

      expect(result).toEqual(complexObject)
    })
  })
})
