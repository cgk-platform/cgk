import { describe, it, expect } from 'vitest'
import { normalizeStoreDomain, DEFAULT_API_VERSION } from '../config'

describe('normalizeStoreDomain', () => {
  it('adds .myshopify.com to bare store name', () => {
    expect(normalizeStoreDomain('my-store')).toBe('my-store.myshopify.com')
  })

  it('preserves full domain', () => {
    expect(normalizeStoreDomain('my-store.myshopify.com')).toBe('my-store.myshopify.com')
  })

  it('strips https protocol', () => {
    expect(normalizeStoreDomain('https://my-store.myshopify.com')).toBe('my-store.myshopify.com')
  })

  it('strips http protocol', () => {
    expect(normalizeStoreDomain('http://my-store.myshopify.com')).toBe('my-store.myshopify.com')
  })

  it('strips trailing slash', () => {
    expect(normalizeStoreDomain('my-store.myshopify.com/')).toBe('my-store.myshopify.com')
  })

  it('handles full URL with protocol and trailing slash', () => {
    expect(normalizeStoreDomain('https://my-store.myshopify.com/')).toBe('my-store.myshopify.com')
  })
})

describe('DEFAULT_API_VERSION', () => {
  it('is a valid API version string', () => {
    expect(DEFAULT_API_VERSION).toMatch(/^\d{4}-\d{2}$/)
  })
})
