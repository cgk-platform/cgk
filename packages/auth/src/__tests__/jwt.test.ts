import { describe, expect, it } from 'vitest'

import { decodeJWT, signJWT, verifyJWT } from '../jwt'
import type { OrgContext, UserRole } from '../types'

describe('JWT utilities', () => {
  const mockOrgs: OrgContext[] = [
    { id: 'org_123', slug: 'test-org', role: 'admin' as UserRole },
  ]

  const mockPayload = {
    userId: 'user_123',
    sessionId: 'session_456',
    email: 'test@example.com',
    orgSlug: 'test-org',
    orgId: 'org_123',
    role: 'admin' as UserRole,
    orgs: mockOrgs,
  }

  describe('signJWT', () => {
    it('should sign a JWT', async () => {
      const token = await signJWT(mockPayload)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3) // JWT has 3 parts
    })

    it('should include all payload fields', async () => {
      const token = await signJWT(mockPayload)
      const decoded = decodeJWT(token)

      expect(decoded).not.toBeNull()
      expect(decoded?.sub).toBe(mockPayload.userId)
      expect(decoded?.sid).toBe(mockPayload.sessionId)
      expect(decoded?.email).toBe(mockPayload.email)
      expect(decoded?.org).toBe(mockPayload.orgSlug)
      expect(decoded?.orgId).toBe(mockPayload.orgId)
      expect(decoded?.role).toBe(mockPayload.role)
    })

    it('should set expiration', async () => {
      const token = await signJWT(mockPayload)
      const decoded = decodeJWT(token)

      expect(decoded?.exp).toBeDefined()
      expect(decoded?.iat).toBeDefined()
      // Expiration should be in the future (7 days)
      expect(decoded!.exp).toBeGreaterThan(decoded!.iat)
    })
  })

  describe('verifyJWT', () => {
    it('should verify a valid JWT', async () => {
      const token = await signJWT(mockPayload)
      const payload = await verifyJWT(token)

      expect(payload.sub).toBe(mockPayload.userId)
      expect(payload.sid).toBe(mockPayload.sessionId)
      expect(payload.email).toBe(mockPayload.email)
    })

    it('should reject invalid JWT', async () => {
      const invalidToken = 'invalid.token.here'

      await expect(verifyJWT(invalidToken)).rejects.toThrow()
    })

    it('should reject tampered JWT', async () => {
      const token = await signJWT(mockPayload)
      // Tamper with the payload
      const [header, , signature] = token.split('.')
      const tamperedToken = `${header}.eyJ0ZXN0IjoidGFtcGVyZWQifQ.${signature}`

      await expect(verifyJWT(tamperedToken)).rejects.toThrow()
    })
  })

  describe('decodeJWT', () => {
    it('should decode a valid JWT without verification', async () => {
      const token = await signJWT(mockPayload)
      const decoded = decodeJWT(token)

      expect(decoded).not.toBeNull()
      expect(decoded?.sub).toBe(mockPayload.userId)
    })

    it('should return null for invalid JWT format', () => {
      const decoded = decodeJWT('not-a-jwt')

      expect(decoded).toBeNull()
    })
  })
})
