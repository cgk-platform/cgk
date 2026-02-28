/**
 * Shopify OAuth Auth Route Tests
 *
 * Critical test suite to prevent "Tenant not found" regression.
 * Tests tenant context flow from JWT → middleware → API route.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

import { GET, POST } from '../route'

// Mock dependencies
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))

vi.mock('@cgk-platform/shopify', () => ({
  initiateOAuth: vi.fn(),
  normalizeShopDomain: vi.fn((domain: string) => domain),
  ShopifyError: class ShopifyError extends Error {
    code: string
    constructor(message: string, code: string) {
      super(message)
      this.code = code
    }
  },
}))

import { headers } from 'next/headers'
import { initiateOAuth } from '@cgk-platform/shopify'

const mockHeaders = vi.mocked(headers)
const mockInitiateOAuth = vi.mocked(initiateOAuth)

describe('/api/admin/shopify-app/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://admin.example.com'
  })

  describe('GET - Tenant Context Validation', () => {
    it('should return 400 if x-tenant-slug header is missing', async () => {
      // Simulate middleware NOT setting tenant context (the bug we're fixing)
      mockHeaders.mockResolvedValue(
        new Headers({
          'x-user-id': 'user_123',
          'x-user-role': 'super_admin',
          // Missing: x-tenant-slug
        })
      )

      const request = new NextRequest(
        'https://admin.example.com/api/admin/shopify-app/auth?shop=test.myshopify.com'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Tenant not found')
      expect(data.debug?.message).toContain('Super admins must select a tenant')
    })

    it('should proceed with OAuth if x-tenant-slug is present (super admin with tenant context)', async () => {
      // Simulate middleware properly setting tenant context from JWT
      mockHeaders.mockResolvedValue(
        new Headers({
          'x-user-id': 'user_123',
          'x-user-role': 'super_admin',
          'x-tenant-slug': 'meliusly', // Super admin selected this tenant
          'x-tenant-id': 'org_789',
        })
      )

      mockInitiateOAuth.mockResolvedValue('https://test.myshopify.com/oauth/authorize?...')

      const request = new NextRequest(
        'https://admin.example.com/api/admin/shopify-app/auth?shop=test.myshopify.com'
      )

      const response = await GET(request)

      expect(response.status).toBe(307) // Redirect
      expect(mockInitiateOAuth).toHaveBeenCalledWith({
        tenantId: 'meliusly',
        shop: 'test.myshopify.com',
        redirectUri: 'https://admin.example.com/api/admin/shopify-app/callback',
      })
    })

    it('should proceed with OAuth for regular tenant user', async () => {
      // Simulate regular user with tenant membership
      mockHeaders.mockResolvedValue(
        new Headers({
          'x-user-id': 'user_456',
          'x-user-role': 'owner',
          'x-tenant-slug': 'rawdog', // From user's organization membership
          'x-tenant-id': 'org_123',
        })
      )

      mockInitiateOAuth.mockResolvedValue('https://test.myshopify.com/oauth/authorize?...')

      const request = new NextRequest(
        'https://admin.example.com/api/admin/shopify-app/auth?shop=test.myshopify.com'
      )

      const response = await GET(request)

      expect(response.status).toBe(307) // Redirect
      expect(mockInitiateOAuth).toHaveBeenCalledWith({
        tenantId: 'rawdog',
        shop: 'test.myshopify.com',
        redirectUri: 'https://admin.example.com/api/admin/shopify-app/callback',
      })
    })
  })

  describe('POST - Tenant Context Validation', () => {
    it('should return 400 if x-tenant-slug header is missing', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          'x-user-id': 'user_123',
          'x-user-role': 'super_admin',
          // Missing: x-tenant-slug
        })
      )

      const request = new NextRequest('https://admin.example.com/api/admin/shopify-app/auth', {
        method: 'POST',
        body: JSON.stringify({ shop: 'test.myshopify.com' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Tenant not found')
    })

    it('should return authUrl if x-tenant-slug is present', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          'x-user-id': 'user_123',
          'x-user-role': 'super_admin',
          'x-tenant-slug': 'meliusly',
          'x-tenant-id': 'org_789',
        })
      )

      mockInitiateOAuth.mockResolvedValue('https://test.myshopify.com/oauth/authorize?...')

      const request = new NextRequest('https://admin.example.com/api/admin/shopify-app/auth', {
        method: 'POST',
        body: JSON.stringify({ shop: 'test.myshopify.com' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.authUrl).toBe('https://test.myshopify.com/oauth/authorize?...')
    })
  })

  describe('Error Handling', () => {
    it('should return 400 if shop parameter is missing (GET)', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          'x-tenant-slug': 'meliusly',
        })
      )

      const request = new NextRequest(
        'https://admin.example.com/api/admin/shopify-app/auth' // No ?shop=
      )

      const response = await GET(request)

      expect(response.status).toBe(307) // Redirects to error page
      expect(response.headers.get('location')).toContain('error=shop_required')
    })

    it('should return 400 if shop parameter is missing (POST)', async () => {
      mockHeaders.mockResolvedValue(
        new Headers({
          'x-tenant-slug': 'meliusly',
        })
      )

      const request = new NextRequest('https://admin.example.com/api/admin/shopify-app/auth', {
        method: 'POST',
        body: JSON.stringify({}), // No shop field
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Shop domain required')
    })
  })
})
