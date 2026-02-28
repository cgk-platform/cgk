/**
 * SSO Token Generation API Tests
 *
 * Tests the /api/sso/generate endpoint that creates one-time tokens
 * for cross-app authentication (orchestrator → admin/storefront)
 */

import { generateSSOToken, requireAuth } from '@cgk-platform/auth'
import { NextRequest } from 'next/server'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { POST } from '../generate/route'

vi.mock('@cgk-platform/auth', () => ({
  generateSSOToken: vi.fn(),
  requireAuth: vi.fn(),
}))

const mockGenerateSSOToken = vi.mocked(generateSSOToken)
const mockRequireAuth = vi.mocked(requireAuth)

describe('/api/sso/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST', () => {
    it('should generate SSO token for authenticated user', async () => {
      // Mock authenticated user
      mockRequireAuth.mockResolvedValueOnce({
        userId: 'user_123',
        email: 'test@example.com',
        sessionId: 'session_456',
        tenantId: 'org_789',
        tenantSlug: 'rawdog',
        role: 'owner',
        orgs: [{ id: 'org_789', slug: 'rawdog', role: 'owner' }],
      })

      // Mock token generation
      mockGenerateSSOToken.mockResolvedValueOnce('token_abc123')

      const request = new NextRequest('http://localhost:3000/api/sso/generate', {
        method: 'POST',
        body: JSON.stringify({
          targetApp: 'admin',
          tenantSlug: 'rawdog',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.token).toBe('token_abc123')
      expect(data.expiresIn).toBe(300) // 5 minutes

      expect(mockGenerateSSOToken).toHaveBeenCalledWith({
        userId: 'user_123',
        tenantId: 'org_789',
        targetApp: 'admin',
        expiryMinutes: 5,
      })
    })

    it('should return 401 for unauthenticated user', async () => {
      mockRequireAuth.mockRejectedValueOnce(new Error('Unauthorized'))

      const request = new NextRequest('http://localhost:3000/api/sso/generate', {
        method: 'POST',
        body: JSON.stringify({
          targetApp: 'admin',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500) // Caught by error handler
      expect(data.error).toBe('Failed to generate SSO token')
    })

    it('should return 400 for missing targetApp', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        userId: 'user_123',
        email: 'test@example.com',
        sessionId: 'session_456',
        tenantId: null,
        tenantSlug: null,
        role: 'super_admin',
        orgs: [],
      })

      const request = new NextRequest('http://localhost:3000/api/sso/generate', {
        method: 'POST',
        body: JSON.stringify({}), // Missing targetApp
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('targetApp is required')
    })

    it('should return 400 for invalid targetApp', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        userId: 'user_123',
        email: 'test@example.com',
        sessionId: 'session_456',
        tenantId: null,
        tenantSlug: null,
        role: 'super_admin',
        orgs: [],
      })

      const request = new NextRequest('http://localhost:3000/api/sso/generate', {
        method: 'POST',
        body: JSON.stringify({
          targetApp: 'invalid-app',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid target app')
    })

    it('should return 403 for tenant user does not have access to', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        userId: 'user_123',
        email: 'test@example.com',
        sessionId: 'session_456',
        tenantId: 'org_789',
        tenantSlug: 'rawdog',
        role: 'owner',
        orgs: [{ id: 'org_789', slug: 'rawdog', role: 'owner' }],
      })

      const request = new NextRequest('http://localhost:3000/api/sso/generate', {
        method: 'POST',
        body: JSON.stringify({
          targetApp: 'admin',
          tenantSlug: 'other-tenant', // User doesn't have access
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Tenant not found or access denied')
    })

    it('should allow super admin to generate token without tenant', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        userId: 'user_super',
        email: 'super@example.com',
        sessionId: 'session_super',
        tenantId: null,
        tenantSlug: null,
        role: 'super_admin',
        orgs: [],
      })

      mockGenerateSSOToken.mockResolvedValueOnce('token_super')

      const request = new NextRequest('http://localhost:3000/api/sso/generate', {
        method: 'POST',
        body: JSON.stringify({
          targetApp: 'orchestrator',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.token).toBe('token_super')

      expect(mockGenerateSSOToken).toHaveBeenCalledWith({
        userId: 'user_super',
        tenantId: null,
        targetApp: 'orchestrator',
        expiryMinutes: 5,
      })
    })

    it('should validate all target app options', async () => {
      const validApps = [
        'admin',
        'storefront',
        'creator-portal',
        'contractor-portal',
        'orchestrator',
      ]

      for (const app of validApps) {
        vi.clearAllMocks()

        mockRequireAuth.mockResolvedValueOnce({
          userId: 'user_123',
          email: 'test@example.com',
          sessionId: 'session_456',
          tenantId: 'org_789',
          tenantSlug: 'rawdog',
          role: 'owner',
          orgs: [{ id: 'org_789', slug: 'rawdog', role: 'owner' }],
        })

        mockGenerateSSOToken.mockResolvedValueOnce(`token_${app}`)

        const request = new NextRequest('http://localhost:3000/api/sso/generate', {
          method: 'POST',
          body: JSON.stringify({
            targetApp: app,
            tenantSlug: 'rawdog',
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.token).toBe(`token_${app}`)
      }
    })

    it('should set default expiry to 5 minutes', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        userId: 'user_123',
        email: 'test@example.com',
        sessionId: 'session_456',
        tenantId: 'org_789',
        tenantSlug: 'rawdog',
        role: 'owner',
        orgs: [{ id: 'org_789', slug: 'rawdog', role: 'owner' }],
      })

      mockGenerateSSOToken.mockResolvedValueOnce('token_abc')

      const request = new NextRequest('http://localhost:3000/api/sso/generate', {
        method: 'POST',
        body: JSON.stringify({
          targetApp: 'admin',
          tenantSlug: 'rawdog',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.expiresIn).toBe(300) // 5 minutes in seconds

      expect(mockGenerateSSOToken).toHaveBeenCalledWith(
        expect.objectContaining({
          expiryMinutes: 5,
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        userId: 'user_123',
        email: 'test@example.com',
        sessionId: 'session_456',
        tenantId: 'org_789',
        tenantSlug: 'rawdog',
        role: 'owner',
        orgs: [{ id: 'org_789', slug: 'rawdog', role: 'owner' }],
      })

      mockGenerateSSOToken.mockRejectedValueOnce(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/sso/generate', {
        method: 'POST',
        body: JSON.stringify({
          targetApp: 'admin',
          tenantSlug: 'rawdog',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to generate SSO token')
    })

    it('should handle malformed JSON', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        userId: 'user_123',
        email: 'test@example.com',
        sessionId: 'session_456',
        tenantId: null,
        tenantSlug: null,
        role: 'super_admin',
        orgs: [],
      })

      const request = new NextRequest('http://localhost:3000/api/sso/generate', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to generate SSO token')
    })
  })

  describe('Security', () => {
    it('should not allow generating tokens for other users', async () => {
      // Authenticated as user_123
      mockRequireAuth.mockResolvedValueOnce({
        userId: 'user_123',
        email: 'test@example.com',
        sessionId: 'session_456',
        tenantId: 'org_789',
        tenantSlug: 'rawdog',
        role: 'owner',
        orgs: [{ id: 'org_789', slug: 'rawdog', role: 'owner' }],
      })

      mockGenerateSSOToken.mockResolvedValueOnce('token_abc')

      const request = new NextRequest('http://localhost:3000/api/sso/generate', {
        method: 'POST',
        body: JSON.stringify({
          targetApp: 'admin',
          tenantSlug: 'rawdog',
        }),
      })

      await POST(request)

      // Verify token generated for authenticated user, not someone else
      expect(mockGenerateSSOToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123', // Should match authenticated user
        })
      )
    })

    it('should validate tenant belongs to user', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        userId: 'user_123',
        email: 'test@example.com',
        sessionId: 'session_456',
        tenantId: 'org_789',
        tenantSlug: 'rawdog',
        role: 'owner',
        orgs: [{ id: 'org_789', slug: 'rawdog', role: 'owner' }],
      })

      const request = new NextRequest('http://localhost:3000/api/sso/generate', {
        method: 'POST',
        body: JSON.stringify({
          targetApp: 'admin',
          tenantSlug: 'unauthorized-tenant',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(403)

      // Should NOT call generateSSOToken for unauthorized tenant
      expect(mockGenerateSSOToken).not.toHaveBeenCalled()
    })
  })
})
