import { describe, it, expect } from 'vitest'
import { createCommerceProvider } from '../client'
import type { CommerceConfig } from '../types'

describe('createCommerceProvider', () => {
  it('throws for custom provider (not yet implemented)', () => {
    const config: CommerceConfig = {
      provider: 'custom',
      storeDomain: 'example.com',
    }

    expect(() => createCommerceProvider(config)).toThrow(
      'Custom commerce provider is not yet implemented'
    )
  })

  it('throws for unknown provider', () => {
    const config = {
      provider: 'unknown' as 'shopify',
      storeDomain: 'example.com',
    }

    expect(() => createCommerceProvider(config)).toThrow('Unknown commerce provider')
  })

  it('creates Shopify provider with storefrontAccessToken', () => {
    const config: CommerceConfig = {
      provider: 'shopify',
      storeDomain: 'test-store.myshopify.com',
      storefrontAccessToken: 'sf-token',
    }

    const provider = createCommerceProvider(config)
    expect(provider.name).toBe('shopify')
    expect(provider.products).toBeDefined()
    expect(provider.cart).toBeDefined()
    expect(provider.checkout).toBeDefined()
    expect(provider.orders).toBeDefined()
    expect(provider.customers).toBeDefined()
    expect(provider.discounts).toBeDefined()
    expect(provider.webhooks).toBeDefined()
  })

  it('Shopify provider requires storefrontAccessToken', () => {
    const config: CommerceConfig = {
      provider: 'shopify',
      storeDomain: 'test-store.myshopify.com',
    }

    expect(() => createCommerceProvider(config)).toThrow(
      'Shopify provider requires storefrontAccessToken'
    )
  })
})
