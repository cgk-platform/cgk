import { describe, it, expect } from 'vitest'
import { verifyWebhook, parseWebhook } from '../webhooks'
import { createHmac } from 'crypto'

describe('verifyWebhook', () => {
  const secret = 'test-webhook-secret'

  function createValidHmac(body: string): string {
    return createHmac('sha256', secret).update(body).digest('base64')
  }

  it('verifies a valid webhook signature', () => {
    const body = '{"id": 123, "email": "test@example.com"}'
    const hmac = createValidHmac(body)

    expect(verifyWebhook(body, hmac, secret)).toBe(true)
  })

  it('rejects an invalid webhook signature', () => {
    const body = '{"id": 123}'
    const badHmac = 'invalidhmacvalue'

    expect(verifyWebhook(body, badHmac, secret)).toBe(false)
  })

  it('rejects a tampered body', () => {
    const originalBody = '{"id": 123}'
    const hmac = createValidHmac(originalBody)
    const tamperedBody = '{"id": 456}'

    expect(verifyWebhook(tamperedBody, hmac, secret)).toBe(false)
  })

  it('handles Buffer input', () => {
    const body = '{"order": "data"}'
    const hmac = createValidHmac(body)

    expect(verifyWebhook(Buffer.from(body), hmac, secret)).toBe(true)
  })
})

describe('parseWebhook', () => {
  it('parses a webhook body', () => {
    const body = '{"id": 123, "name": "#1001"}'
    const result = parseWebhook(body, 'orders/create', 'test-store.myshopify.com')

    expect(result.topic).toBe('orders/create')
    expect(result.shop).toBe('test-store.myshopify.com')
    expect(result.body).toEqual({ id: 123, name: '#1001' })
  })

  it('preserves topic type', () => {
    const result = parseWebhook('{}', 'products/update', 'test.myshopify.com')
    expect(result.topic).toBe('products/update')
  })
})
