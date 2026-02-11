/**
 * Webhook Utility Tests
 */

import { describe, it, expect } from 'vitest'
import {
  verifyShopifyWebhook,
  parseCents,
  mapFinancialStatus,
  mapFulfillmentStatus,
  extractResourceId,
  generateIdempotencyKey,
} from '../utils'

describe('verifyShopifyWebhook', () => {
  // Test secret and known signature
  const secret = 'test-webhook-secret'
  const body = '{"test": "data"}'

  it('should verify valid HMAC signature', () => {
    // Generate a valid signature
    const crypto = require('crypto')
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('base64')

    expect(verifyShopifyWebhook(body, validSignature, secret)).toBe(true)
  })

  it('should reject invalid HMAC signature', () => {
    expect(verifyShopifyWebhook(body, 'invalid-signature', secret)).toBe(false)
  })

  it('should reject signature with wrong secret', () => {
    const crypto = require('crypto')
    const signature = crypto
      .createHmac('sha256', 'wrong-secret')
      .update(body, 'utf8')
      .digest('base64')

    expect(verifyShopifyWebhook(body, signature, secret)).toBe(false)
  })

  it('should handle empty body', () => {
    const crypto = require('crypto')
    const emptySignature = crypto
      .createHmac('sha256', secret)
      .update('', 'utf8')
      .digest('base64')

    expect(verifyShopifyWebhook('', emptySignature, secret)).toBe(true)
  })
})

describe('parseCents', () => {
  it('should parse string price to cents', () => {
    expect(parseCents('99.99')).toBe(9999)
    expect(parseCents('0.50')).toBe(50)
    expect(parseCents('100.00')).toBe(10000)
  })

  it('should parse number price to cents', () => {
    expect(parseCents(99.99)).toBe(9999)
    expect(parseCents(0.5)).toBe(50)
    expect(parseCents(100)).toBe(10000)
  })

  it('should handle null and undefined', () => {
    expect(parseCents(null)).toBe(0)
    expect(parseCents(undefined)).toBe(0)
  })

  it('should handle decimal precision', () => {
    expect(parseCents('19.99')).toBe(1999)
    expect(parseCents('19.999')).toBe(2000) // Rounds
  })
})

describe('mapFinancialStatus', () => {
  it('should map Shopify financial statuses', () => {
    expect(mapFinancialStatus('pending')).toBe('pending')
    expect(mapFinancialStatus('authorized')).toBe('authorized')
    expect(mapFinancialStatus('paid')).toBe('paid')
    expect(mapFinancialStatus('refunded')).toBe('refunded')
    expect(mapFinancialStatus('partially_refunded')).toBe('partially_refunded')
  })

  it('should default to pending for unknown status', () => {
    expect(mapFinancialStatus('unknown')).toBe('pending')
    expect(mapFinancialStatus(null)).toBe('pending')
    expect(mapFinancialStatus(undefined)).toBe('pending')
  })
})

describe('mapFulfillmentStatus', () => {
  it('should map Shopify fulfillment statuses', () => {
    expect(mapFulfillmentStatus('fulfilled')).toBe('fulfilled')
    expect(mapFulfillmentStatus('partial')).toBe('partial')
    expect(mapFulfillmentStatus('unfulfilled')).toBe('unfulfilled')
  })

  it('should default to unfulfilled for unknown status', () => {
    expect(mapFulfillmentStatus('unknown')).toBe('unfulfilled')
    expect(mapFulfillmentStatus(null)).toBe('unfulfilled')
    expect(mapFulfillmentStatus(undefined)).toBe('unfulfilled')
  })
})

describe('extractResourceId', () => {
  it('should extract id from payload', () => {
    expect(extractResourceId({ id: 123 })).toBe('123')
    expect(extractResourceId({ id: 'order_456' })).toBe('order_456')
  })

  it('should extract order_id as fallback', () => {
    expect(extractResourceId({ order_id: 789 })).toBe('789')
  })

  it('should prefer id over order_id', () => {
    expect(extractResourceId({ id: 123, order_id: 456 })).toBe('123')
  })

  it('should return null for missing id', () => {
    expect(extractResourceId({})).toBeNull()
    expect(extractResourceId({ name: 'test' })).toBeNull()
    expect(extractResourceId(null)).toBeNull()
    expect(extractResourceId(undefined)).toBeNull()
  })
})

describe('generateIdempotencyKey', () => {
  it('should generate key from topic and resource id', () => {
    expect(generateIdempotencyKey('orders/create', '123', null)).toBe('orders/create:123')
    expect(generateIdempotencyKey('customers/update', 'cust_456', null)).toBe('customers/update:cust_456')
  })

  it('should use webhook id as fallback', () => {
    const key = generateIdempotencyKey('orders/create', null, 'webhook_789')
    expect(key).toBe('orders/create:webhook_789')
  })

  it('should use timestamp as last resort', () => {
    const key = generateIdempotencyKey('orders/create', null, null)
    expect(key).toMatch(/^orders\/create:\d+$/)
  })
})
