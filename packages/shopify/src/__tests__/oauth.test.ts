import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createHmac } from 'crypto'

import {
  encryptToken,
  decryptToken,
  generateSecureToken,
} from '../oauth/encryption'
import {
  isValidShopDomain,
  normalizeShopDomain,
  verifyOAuthHmac,
  verifyWebhookHmac,
  isValidOAuthTimestamp,
} from '../oauth/validation'
import {
  PLATFORM_SCOPES,
  getScopesString,
  validateScopes,
} from '../oauth/scopes'
import { ShopifyError } from '../oauth/errors'

// Mock environment variable for encryption tests
beforeEach(() => {
  // 32 bytes (64 hex characters) for AES-256
  vi.stubEnv(
    'SHOPIFY_TOKEN_ENCRYPTION_KEY',
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  )
})

describe('encryptToken / decryptToken', () => {
  it('encrypts and decrypts a token correctly', () => {
    const originalToken = 'shpat_test_token_12345'
    const encrypted = encryptToken(originalToken)

    // Encrypted format should be iv:authTag:cipherText
    expect(encrypted.split(':').length).toBe(3)

    const decrypted = decryptToken(encrypted)
    expect(decrypted).toBe(originalToken)
  })

  it('produces different ciphertext for same token (due to random IV)', () => {
    const token = 'same_token'
    const encrypted1 = encryptToken(token)
    const encrypted2 = encryptToken(token)

    expect(encrypted1).not.toBe(encrypted2)

    // But both should decrypt to the same value
    expect(decryptToken(encrypted1)).toBe(token)
    expect(decryptToken(encrypted2)).toBe(token)
  })

  it('throws ShopifyError for invalid encrypted format', () => {
    expect(() => decryptToken('invalid')).toThrow(ShopifyError)
    expect(() => decryptToken('invalid:format')).toThrow(ShopifyError)
  })

  it('throws ShopifyError for tampered ciphertext', () => {
    const encrypted = encryptToken('test_token')
    const parts = encrypted.split(':')
    parts[2] = 'tampered' + parts[2]
    const tampered = parts.join(':')

    expect(() => decryptToken(tampered)).toThrow()
  })
})

describe('generateSecureToken', () => {
  it('generates a hex string of correct length', () => {
    const token32 = generateSecureToken(32)
    expect(token32.length).toBe(64) // 32 bytes = 64 hex chars

    const token16 = generateSecureToken(16)
    expect(token16.length).toBe(32) // 16 bytes = 32 hex chars
  })

  it('generates unique tokens', () => {
    const token1 = generateSecureToken(32)
    const token2 = generateSecureToken(32)
    expect(token1).not.toBe(token2)
  })
})

describe('isValidShopDomain', () => {
  it('accepts valid shop domains', () => {
    expect(isValidShopDomain('my-store.myshopify.com')).toBe(true)
    expect(isValidShopDomain('store123.myshopify.com')).toBe(true)
    expect(isValidShopDomain('a.myshopify.com')).toBe(true)
  })

  it('rejects invalid shop domains', () => {
    expect(isValidShopDomain('mystore.com')).toBe(false)
    expect(isValidShopDomain('mystore.shopify.com')).toBe(false)
    expect(isValidShopDomain('https://store.myshopify.com')).toBe(false)
    expect(isValidShopDomain('.myshopify.com')).toBe(false)
    expect(isValidShopDomain('-store.myshopify.com')).toBe(false)
  })
})

describe('normalizeShopDomain', () => {
  it('normalizes various shop domain formats', () => {
    expect(normalizeShopDomain('my-store')).toBe('my-store.myshopify.com')
    expect(normalizeShopDomain('MY-STORE')).toBe('my-store.myshopify.com')
    expect(normalizeShopDomain('https://my-store.myshopify.com')).toBe(
      'my-store.myshopify.com'
    )
    expect(normalizeShopDomain('http://my-store.myshopify.com/')).toBe(
      'my-store.myshopify.com'
    )
    expect(normalizeShopDomain('my-store.myshopify.com/')).toBe(
      'my-store.myshopify.com'
    )
  })
})

describe('verifyOAuthHmac', () => {
  const clientSecret = 'test_client_secret'

  function createValidHmac(params: Record<string, string>): string {
    const entries = Object.entries(params)
      .filter(([key]) => key !== 'hmac' && key !== 'signature')
      .sort(([a], [b]) => a.localeCompare(b))

    const queryString = entries.map(([key, value]) => `${key}=${value}`).join('&')

    return createHmac('sha256', clientSecret).update(queryString).digest('hex')
  }

  it('verifies valid OAuth HMAC', () => {
    const params = {
      code: 'auth_code_123',
      shop: 'test-store.myshopify.com',
      state: 'state_token',
      timestamp: '1234567890',
    }

    const hmac = createValidHmac(params)
    expect(verifyOAuthHmac(params, hmac, clientSecret)).toBe(true)
  })

  it('rejects invalid HMAC', () => {
    const params = {
      code: 'auth_code_123',
      shop: 'test-store.myshopify.com',
      state: 'state_token',
      timestamp: '1234567890',
    }

    expect(verifyOAuthHmac(params, 'invalid_hmac', clientSecret)).toBe(false)
  })

  it('ignores hmac field in params during verification', () => {
    const params = {
      code: 'auth_code_123',
      hmac: 'should_be_ignored',
      shop: 'test-store.myshopify.com',
      state: 'state_token',
      timestamp: '1234567890',
    }

    const paramsWithoutHmac = { ...params }
    delete (paramsWithoutHmac as Record<string, string>).hmac

    const hmac = createValidHmac(paramsWithoutHmac)
    expect(verifyOAuthHmac(params, hmac, clientSecret)).toBe(true)
  })
})

describe('verifyWebhookHmac', () => {
  const secret = 'webhook_secret'

  function createValidHmac(body: string): string {
    return createHmac('sha256', secret).update(body).digest('base64')
  }

  it('verifies valid webhook HMAC', () => {
    const body = '{"id": 123}'
    const hmac = createValidHmac(body)
    expect(verifyWebhookHmac(body, hmac, secret)).toBe(true)
  })

  it('verifies with Buffer input', () => {
    const body = '{"order": "data"}'
    const hmac = createValidHmac(body)
    expect(verifyWebhookHmac(Buffer.from(body), hmac, secret)).toBe(true)
  })

  it('rejects invalid HMAC', () => {
    const body = '{"id": 123}'
    expect(verifyWebhookHmac(body, 'invalid', secret)).toBe(false)
  })

  it('rejects tampered body', () => {
    const originalBody = '{"id": 123}'
    const hmac = createValidHmac(originalBody)
    expect(verifyWebhookHmac('{"id": 456}', hmac, secret)).toBe(false)
  })
})

describe('isValidOAuthTimestamp', () => {
  it('accepts recent timestamps', () => {
    const now = Math.floor(Date.now() / 1000)
    expect(isValidOAuthTimestamp(String(now))).toBe(true)
    expect(isValidOAuthTimestamp(String(now - 60))).toBe(true) // 1 minute ago
    expect(isValidOAuthTimestamp(String(now + 60))).toBe(true) // 1 minute ahead
  })

  it('rejects old timestamps', () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 6 * 60 // 6 minutes ago
    expect(isValidOAuthTimestamp(String(oldTimestamp))).toBe(false)
  })

  it('rejects invalid timestamps', () => {
    expect(isValidOAuthTimestamp('not_a_number')).toBe(false)
    expect(isValidOAuthTimestamp('')).toBe(false)
  })
})

describe('PLATFORM_SCOPES', () => {
  it('includes all critical scopes', () => {
    expect(PLATFORM_SCOPES).toContain('read_orders')
    expect(PLATFORM_SCOPES).toContain('write_orders')
    expect(PLATFORM_SCOPES).toContain('read_products')
    expect(PLATFORM_SCOPES).toContain('read_customers')
    expect(PLATFORM_SCOPES).toContain('write_pixels')
    expect(PLATFORM_SCOPES).toContain('read_shop')
  })

  it('has 50+ scopes', () => {
    expect(PLATFORM_SCOPES.length).toBeGreaterThanOrEqual(50)
  })
})

describe('getScopesString', () => {
  it('returns comma-separated scopes', () => {
    const scopeString = getScopesString()
    expect(scopeString).toContain(',')
    expect(scopeString.split(',').length).toBe(PLATFORM_SCOPES.length)
  })
})

describe('validateScopes', () => {
  it('validates scopes with all critical scopes present', () => {
    const result = validateScopes([
      'read_orders',
      'read_products',
      'read_customers',
      'read_shop',
    ])
    expect(result.valid).toBe(true)
    expect(result.missing).toEqual([])
  })

  it('reports missing critical scopes', () => {
    const result = validateScopes(['read_orders'])
    expect(result.valid).toBe(false)
    expect(result.missing).toContain('read_products')
    expect(result.missing).toContain('read_customers')
    expect(result.missing).toContain('read_shop')
  })
})

describe('ShopifyError', () => {
  it('creates error with code and message', () => {
    const error = new ShopifyError('INVALID_SHOP', 'Test message')
    expect(error.code).toBe('INVALID_SHOP')
    expect(error.message).toBe('Test message')
    expect(error.name).toBe('ShopifyError')
  })

  it('serializes to JSON correctly', () => {
    const error = new ShopifyError('INVALID_HMAC', 'HMAC failed', {
      detail: 'test',
    })
    const json = error.toJSON()
    expect(json.code).toBe('INVALID_HMAC')
    expect(json.message).toBe('HMAC failed')
    expect(json.details).toEqual({ detail: 'test' })
  })
})
