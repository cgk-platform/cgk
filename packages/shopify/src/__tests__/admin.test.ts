import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAdminClient } from '../admin'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('createAdminClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a client with correct properties', () => {
    const client = createAdminClient({
      storeDomain: 'test-store',
      adminAccessToken: 'admin-token-123',
    })

    expect(client.storeDomain).toBe('test-store.myshopify.com')
    expect(client.apiVersion).toBe('2024-01')
  })

  it('makes requests to admin API endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { orders: [] } }),
    })

    const client = createAdminClient({
      storeDomain: 'test-store',
      adminAccessToken: 'admin-token',
    })

    await client.query('query { orders(first: 10) { edges { node { id } } } }')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://test-store.myshopify.com/admin/api/2024-01/graphql.json',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': 'admin-token',
        }),
      })
    )
  })

  it('returns data from response', async () => {
    const mockData = { order: { id: '1', name: '#1001' } }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockData }),
    })

    const client = createAdminClient({
      storeDomain: 'test-store',
      adminAccessToken: 'token',
    })

    const result = await client.query('query { order(id: "1") { id name } }')
    expect(result).toEqual(mockData)
  })

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    })

    const client = createAdminClient({
      storeDomain: 'test-store',
      adminAccessToken: 'bad-token',
    })

    await expect(
      client.query('query { shop { name } }')
    ).rejects.toThrow('Admin API error: 403 Forbidden')
  })

  it('throws on GraphQL errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        errors: [{ message: 'Access denied for field' }],
      }),
    })

    const client = createAdminClient({
      storeDomain: 'test-store',
      adminAccessToken: 'token',
    })

    await expect(
      client.query('query { restrictedField }')
    ).rejects.toThrow('Admin API GraphQL error: Access denied for field')
  })
})
