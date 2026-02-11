import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStorefrontClient } from '../storefront'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('createStorefrontClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a client with correct properties', () => {
    const client = createStorefrontClient({
      storeDomain: 'test-store',
      storefrontAccessToken: 'token123',
    })

    expect(client.storeDomain).toBe('test-store.myshopify.com')
    expect(client.apiVersion).toBe('2024-01')
  })

  it('normalizes store domain', () => {
    const client = createStorefrontClient({
      storeDomain: 'https://test-store.myshopify.com/',
      storefrontAccessToken: 'token123',
    })

    expect(client.storeDomain).toBe('test-store.myshopify.com')
  })

  it('uses custom API version', () => {
    const client = createStorefrontClient({
      storeDomain: 'test-store',
      storefrontAccessToken: 'token123',
      apiVersion: '2025-01',
    })

    expect(client.apiVersion).toBe('2025-01')
  })

  it('makes GraphQL requests with correct headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { products: [] } }),
    })

    const client = createStorefrontClient({
      storeDomain: 'test-store',
      storefrontAccessToken: 'sf-token-123',
    })

    await client.query('query { products(first: 10) { edges { node { id } } } }')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://test-store.myshopify.com/api/2024-01/graphql.json',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': 'sf-token-123',
        }),
      })
    )
  })

  it('passes variables in request body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { product: { id: '123' } } }),
    })

    const client = createStorefrontClient({
      storeDomain: 'test-store',
      storefrontAccessToken: 'token',
    })

    const query = 'query Product($id: ID!) { product(id: $id) { id } }'
    await client.query(query, { id: 'gid://shopify/Product/123' })

    const callBody = JSON.parse(mockFetch.mock.calls[0]![1]!.body)
    expect(callBody.query).toBe(query)
    expect(callBody.variables).toEqual({ id: 'gid://shopify/Product/123' })
  })

  it('returns data from response', async () => {
    const mockData = { products: { edges: [{ node: { id: '1', title: 'Test' } }] } }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockData }),
    })

    const client = createStorefrontClient({
      storeDomain: 'test-store',
      storefrontAccessToken: 'token',
    })

    const result = await client.query('query { products(first: 1) { edges { node { id title } } } }')
    expect(result).toEqual(mockData)
  })

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    })

    const client = createStorefrontClient({
      storeDomain: 'test-store',
      storefrontAccessToken: 'bad-token',
    })

    await expect(
      client.query('query { shop { name } }')
    ).rejects.toThrow('Storefront API error: 401 Unauthorized')
  })

  it('throws on GraphQL errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        errors: [{ message: 'Field "invalid" not found' }],
      }),
    })

    const client = createStorefrontClient({
      storeDomain: 'test-store',
      storefrontAccessToken: 'token',
    })

    await expect(
      client.query('query { invalid }')
    ).rejects.toThrow('Storefront API GraphQL error: Field "invalid" not found')
  })
})
