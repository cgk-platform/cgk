/**
 * SSO Token Verification API Tests
 *
 * Tests the /api/sso/verify endpoint that validates one-time tokens
 * and creates authenticated sessions
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../verify/route'

// Mock dependencies
vi.mock('@cgk-platform/auth', () => ({
  validateSSOToken: vi.fn(),
  getUserById: vi.fn(),
  createSession: vi.fn(),
  signJWT: vi.fn(),
  setAuthCookie: vi.fn(),
}))

vi.mock('@cgk-platform/db', () => ({
  sql: vi.fn(),
}))

import {
  validateSSOToken,
  getUserById,
  createSession,
  signJWT,
  setAuthCookie,
} from '@cgk-platform/auth'
import { sql } from '@cgk-platform/db'

const mockValidateSSOToken = vi.mocked(validateSSOToken)
const mockGetUserById = vi.mocked(getUserById)
const mockCreateSession = vi.mocked(createSession)
const mockSignJWT = vi.mocked(signJWT)
const mockSetAuthCookie = vi.mocked(setAuthCookie)
const mockSql = vi.mocked(sql)

describe('/api/sso/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should verify token and create session', async () => {
      // Mock successful token validation
      mockValidateSSOToken.mockResolvedValueOnce({
        valid: true,
        userId: 'user_123',
        tenantId: 'org_789',
      })

      // Mock user lookup
      mockGetUserById.mockResolvedValueOnce({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'owner',
        status: 'active',
        emailVerified: true,
        passwordHash: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Mock organization lookup
      mockSql.mockResolvedValueOnce({
        rows: [
          { id: 'org_789', slug: 'rawdog', role: 'owner' },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      // Mock session creation
      mockCreateSession.mockResolvedValueOnce({
        session: {
          id: 'session_456',
          userId: 'user_123',
          organizationId: 'org_789',
          tokenHash: 'hash',
          expiresAt: new Date(),
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(),
          revokedAt: null,
        },
        token: 'session_token_abc',
      })

      // Mock JWT signing
      mockSignJWT.mockResolvedValueOnce('jwt_token_xyz')

      const request = new NextRequest(
        'http://localhost:3000/api/sso/verify?token=sso_token_123&redirect=/'
      )

      const response = await GET(request)

      // Should redirect
      expect(response.status).toBe(307) // Temporary redirect
      expect(response.headers.get('location')).toBe('http://localhost:3000/')

      // Verify token validated
      expect(mockValidateSSOToken).toHaveBeenCalledWith('sso_token_123', 'admin')

      // Verify user fetched
      expect(mockGetUserById).toHaveBeenCalledWith('user_123')

      // Verify session created
      expect(mockCreateSession).toHaveBeenCalledWith('user_123', 'org_789', request)

      // Verify JWT signed
      expect(mockSignJWT).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          sessionId: 'session_456',
          email: 'test@example.com',
        })
      )

      // Verify cookie set
      expect(mockSetAuthCookie).toHaveBeenCalledWith(response, 'jwt_token_xyz')
    })

    it('should return 400 for missing token', async () => {
      const request = new NextRequest('http://localhost:3000/api/sso/verify') // No token

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Token is required')

      // Should not validate or create session
      expect(mockValidateSSOToken).not.toHaveBeenCalled()
      expect(mockCreateSession).not.toHaveBeenCalled()
    })

    it('should redirect to login for invalid token', async () => {
      mockValidateSSOToken.mockResolvedValueOnce({
        valid: false,
        error: 'Token not found',
      })

      const request = new NextRequest(
        'http://localhost:3000/api/sso/verify?token=invalid_token'
      )

      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
      expect(response.headers.get('location')).toContain('error=Token+not+found')

      // Should not create session for invalid token
      expect(mockCreateSession).not.toHaveBeenCalled()
    })

    it('should redirect to login for used token', async () => {
      mockValidateSSOToken.mockResolvedValueOnce({
        valid: false,
        error: 'Token already used',
      })

      const request = new NextRequest(
        'http://localhost:3000/api/sso/verify?token=used_token'
      )

      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
      expect(response.headers.get('location')).toContain('error=Token+already+used')
    })

    it('should redirect to login for expired token', async () => {
      mockValidateSSOToken.mockResolvedValueOnce({
        valid: false,
        error: 'Token expired',
      })

      const request = new NextRequest(
        'http://localhost:3000/api/sso/verify?token=expired_token'
      )

      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
      expect(response.headers.get('location')).toContain('error=Token+expired')
    })

    it('should return 404 for user not found', async () => {
      mockValidateSSOToken.mockResolvedValueOnce({
        valid: true,
        userId: 'nonexistent_user',
        tenantId: 'org_789',
      })

      mockGetUserById.mockResolvedValueOnce(null) // User not found

      const request = new NextRequest(
        'http://localhost:3000/api/sso/verify?token=valid_token'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')

      // Should not create session if user doesn't exist
      expect(mockCreateSession).not.toHaveBeenCalled()
    })

    it('should handle custom redirect path', async () => {
      mockValidateSSOToken.mockResolvedValueOnce({
        valid: true,
        userId: 'user_123',
        tenantId: 'org_789',
      })

      mockGetUserById.mockResolvedValueOnce({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'owner',
        status: 'active',
        emailVerified: true,
        passwordHash: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockSql.mockResolvedValueOnce({
        rows: [{ id: 'org_789', slug: 'rawdog', role: 'owner' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      mockCreateSession.mockResolvedValueOnce({
        session: {
          id: 'session_456',
          userId: 'user_123',
          organizationId: 'org_789',
          tokenHash: 'hash',
          expiresAt: new Date(),
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(),
          revokedAt: null,
        },
        token: 'session_token',
      })

      mockSignJWT.mockResolvedValueOnce('jwt_token')

      const request = new NextRequest(
        'http://localhost:3000/api/sso/verify?token=sso_token&redirect=/orders'
      )

      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/orders')
    })

    it('should use default redirect if not specified', async () => {
      mockValidateSSOToken.mockResolvedValueOnce({
        valid: true,
        userId: 'user_123',
        tenantId: 'org_789',
      })

      mockGetUserById.mockResolvedValueOnce({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'owner',
        status: 'active',
        emailVerified: true,
        passwordHash: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockSql.mockResolvedValueOnce({
        rows: [{ id: 'org_789', slug: 'rawdog', role: 'owner' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      mockCreateSession.mockResolvedValueOnce({
        session: {
          id: 'session_456',
          userId: 'user_123',
          organizationId: 'org_789',
          tokenHash: 'hash',
          expiresAt: new Date(),
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(),
          revokedAt: null,
        },
        token: 'session_token',
      })

      mockSignJWT.mockResolvedValueOnce('jwt_token')

      const request = new NextRequest(
        'http://localhost:3000/api/sso/verify?token=sso_token'
      ) // No redirect param

      const response = await GET(request)

      expect(response.headers.get('location')).toBe('http://localhost:3000/')
    })

    it('should handle token without tenant (super admin)', async () => {
      mockValidateSSOToken.mockResolvedValueOnce({
        valid: true,
        userId: 'user_super',
        tenantId: null, // No tenant
      })

      mockGetUserById.mockResolvedValueOnce({
        id: 'user_super',
        email: 'super@example.com',
        name: 'Super Admin',
        role: 'super_admin',
        status: 'active',
        emailVerified: true,
        passwordHash: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockSql.mockResolvedValueOnce({
        rows: [], // No orgs
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      mockCreateSession.mockResolvedValueOnce({
        session: {
          id: 'session_super',
          userId: 'user_super',
          organizationId: null,
          tokenHash: 'hash',
          expiresAt: new Date(),
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(),
          revokedAt: null,
        },
        token: 'session_token',
      })

      mockSignJWT.mockResolvedValueOnce('jwt_token')

      const request = new NextRequest(
        'http://localhost:3000/api/sso/verify?token=sso_token'
      )

      const response = await GET(request)

      expect(response.status).toBe(307)

      // Session created without tenant
      expect(mockCreateSession).toHaveBeenCalledWith('user_super', null, request)

      // JWT signed without tenant context
      expect(mockSignJWT).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_super',
          orgSlug: '',
          orgId: '',
          role: 'super_admin',
        })
      )
    })

    it('should use first available org if tenant not specified', async () => {
      mockValidateSSOToken.mockResolvedValueOnce({
        valid: true,
        userId: 'user_123',
        tenantId: null, // Tenant not specified in token
      })

      mockGetUserById.mockResolvedValueOnce({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        status: 'active',
        emailVerified: true,
        passwordHash: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockSql.mockResolvedValueOnce({
        rows: [
          { id: 'org_first', slug: 'first-org', role: 'owner' },
          { id: 'org_second', slug: 'second-org', role: 'admin' },
        ],
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      mockCreateSession.mockResolvedValueOnce({
        session: {
          id: 'session_456',
          userId: 'user_123',
          organizationId: 'org_first',
          tokenHash: 'hash',
          expiresAt: new Date(),
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(),
          revokedAt: null,
        },
        token: 'session_token',
      })

      mockSignJWT.mockResolvedValueOnce('jwt_token')

      const request = new NextRequest(
        'http://localhost:3000/api/sso/verify?token=sso_token'
      )

      await GET(request)

      // Should use first org
      expect(mockCreateSession).toHaveBeenCalledWith('user_123', 'org_first', request)

      expect(mockSignJWT).toHaveBeenCalledWith(
        expect.objectContaining({
          orgSlug: 'first-org',
          orgId: 'org_first',
          role: 'owner', // Role from first org
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should redirect to login on error', async () => {
      mockValidateSSOToken.mockRejectedValueOnce(new Error('Database error'))

      const request = new NextRequest(
        'http://localhost:3000/api/sso/verify?token=sso_token'
      )

      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
      expect(response.headers.get('location')).toContain('error=SSO+verification+failed')
    })

    it('should handle session creation failure', async () => {
      mockValidateSSOToken.mockResolvedValueOnce({
        valid: true,
        userId: 'user_123',
        tenantId: 'org_789',
      })

      mockGetUserById.mockResolvedValueOnce({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'owner',
        status: 'active',
        emailVerified: true,
        passwordHash: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockSql.mockResolvedValueOnce({
        rows: [{ id: 'org_789', slug: 'rawdog', role: 'owner' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      mockCreateSession.mockRejectedValueOnce(new Error('Session creation failed'))

      const request = new NextRequest(
        'http://localhost:3000/api/sso/verify?token=sso_token'
      )

      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })
  })

  describe('Security', () => {
    it('should validate target app matches', async () => {
      mockValidateSSOToken.mockResolvedValueOnce({
        valid: true,
        userId: 'user_123',
        tenantId: 'org_789',
      })

      const request = new NextRequest(
        'http://localhost:3000/api/sso/verify?token=sso_token'
      )

      await GET(request)

      // Should validate token for 'admin' app specifically
      expect(mockValidateSSOToken).toHaveBeenCalledWith('sso_token', 'admin')
    })

    it('should query only active organizations', async () => {
      mockValidateSSOToken.mockResolvedValueOnce({
        valid: true,
        userId: 'user_123',
        tenantId: 'org_789',
      })

      mockGetUserById.mockResolvedValueOnce({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'owner',
        status: 'active',
        emailVerified: true,
        passwordHash: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockSql.mockResolvedValueOnce({
        rows: [{ id: 'org_789', slug: 'rawdog', role: 'owner' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      mockCreateSession.mockResolvedValueOnce({
        session: {
          id: 'session_456',
          userId: 'user_123',
          organizationId: 'org_789',
          tokenHash: 'hash',
          expiresAt: new Date(),
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(),
          revokedAt: null,
        },
        token: 'session_token',
      })

      mockSignJWT.mockResolvedValueOnce('jwt_token')

      const request = new NextRequest(
        'http://localhost:3000/api/sso/verify?token=sso_token'
      )

      await GET(request)

      // Verify SQL query filters for active status
      const sqlCall = mockSql.mock.calls[0]
      const templateStrings = sqlCall?.[0] as string[] | TemplateStringsArray
      const joinedQuery = Array.isArray(templateStrings) ? templateStrings.join('') : String(templateStrings)

      expect(joinedQuery).toContain('status')
      expect(joinedQuery).toContain('active')
    })
  })
})
