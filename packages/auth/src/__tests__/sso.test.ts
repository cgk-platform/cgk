import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { sql } from '@cgk-platform/db'
import {
  generateSSOToken,
  validateSSOToken,
  cleanupSSOTokens,
  type TargetApp,
} from '../sso'

// Mock database
vi.mock('@cgk-platform/db', () => ({
  sql: vi.fn(),
}))

const mockSql = vi.mocked(sql)

describe('SSO Token Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset time to current for each test
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-27T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('generateSSOToken', () => {
    it('should generate a token and store in database', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as never)

      const token = await generateSSOToken({
        userId: 'user_123',
        tenantId: 'org_456',
        targetApp: 'admin',
        expiryMinutes: 5,
      })

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('INSERT INTO public.sso_tokens')]),
        expect.any(String), // token ID
        'user_123',
        'org_456',
        'admin',
        expect.any(String) // expires_at
      )
    })

    it('should set expiry to 5 minutes by default', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as never)

      await generateSSOToken({
        userId: 'user_123',
        targetApp: 'admin',
      })

      const sqlCall = mockSql.mock.calls[0]
      const expiresAt = sqlCall?.[5] as string

      // Should expire 5 minutes from now
      const expectedExpiry = new Date(Date.now() + 5 * 60 * 1000)
      const actualExpiry = new Date(expiresAt)

      expect(Math.abs(actualExpiry.getTime() - expectedExpiry.getTime())).toBeLessThan(1000)
    })

    it('should allow custom expiry minutes', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as never)

      await generateSSOToken({
        userId: 'user_123',
        targetApp: 'admin',
        expiryMinutes: 10,
      })

      const sqlCall = mockSql.mock.calls[0]
      const expiresAt = sqlCall?.[5] as string

      const expectedExpiry = new Date(Date.now() + 10 * 60 * 1000)
      const actualExpiry = new Date(expiresAt)

      expect(Math.abs(actualExpiry.getTime() - expectedExpiry.getTime())).toBeLessThan(1000)
    })

    it('should allow null tenantId for super admins', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as never)

      const token = await generateSSOToken({
        userId: 'user_123',
        tenantId: null,
        targetApp: 'orchestrator',
      })

      expect(token).toBeDefined()
      expect(mockSql).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'user_123',
        null, // tenantId should be null
        'orchestrator',
        expect.anything()
      )
    })
  })

  describe('validateSSOToken', () => {
    it('should validate a valid unused token', async () => {
      const now = new Date('2026-02-27T12:00:00Z')
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000) // 5 min from now

      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'token_123',
            user_id: 'user_456',
            tenant_id: 'org_789',
            target_app: 'admin',
            expires_at: expiresAt.toISOString(),
            used_at: null,
            created_at: now.toISOString(),
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      // Mock the UPDATE query (mark as used)
      mockSql.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as never)

      const result = await validateSSOToken('token_123', 'admin')

      expect(result.valid).toBe(true)
      expect(result.userId).toBe('user_456')
      expect(result.tenantId).toBe('org_789')
      expect(result.error).toBeUndefined()

      // Verify token was marked as used
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('UPDATE public.sso_tokens')]),
        'token_123'
      )
    })

    it('should reject token that does not exist', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      const result = await validateSSOToken('nonexistent', 'admin')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Token not found')
      expect(result.userId).toBeUndefined()
    })

    it('should reject token that was already used', async () => {
      const now = new Date('2026-02-27T12:00:00Z')

      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'token_123',
            user_id: 'user_456',
            tenant_id: 'org_789',
            target_app: 'admin',
            expires_at: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
            used_at: now.toISOString(), // Already used!
            created_at: new Date(now.getTime() - 1000).toISOString(),
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      const result = await validateSSOToken('token_123', 'admin')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Token already used')

      // Should NOT call UPDATE since token is invalid
      expect(mockSql).toHaveBeenCalledTimes(1) // Only SELECT
    })

    it('should reject expired token', async () => {
      const now = new Date('2026-02-27T12:00:00Z')
      const expiredAt = new Date(now.getTime() - 1000) // Expired 1 second ago

      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'token_123',
            user_id: 'user_456',
            tenant_id: 'org_789',
            target_app: 'admin',
            expires_at: expiredAt.toISOString(),
            used_at: null,
            created_at: new Date(now.getTime() - 6 * 60 * 1000).toISOString(),
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      const result = await validateSSOToken('token_123', 'admin')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Token expired')

      // Should NOT call UPDATE since token is invalid
      expect(mockSql).toHaveBeenCalledTimes(1)
    })

    it('should reject token for wrong target app', async () => {
      const now = new Date('2026-02-27T12:00:00Z')

      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'token_123',
            user_id: 'user_456',
            tenant_id: 'org_789',
            target_app: 'storefront', // Token is for storefront
            expires_at: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
            used_at: null,
            created_at: now.toISOString(),
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      // Try to use it in admin app
      const result = await validateSSOToken('token_123', 'admin')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid target app')

      // Should NOT call UPDATE since token is invalid
      expect(mockSql).toHaveBeenCalledTimes(1)
    })

    it('should handle null tenantId (super admin tokens)', async () => {
      const now = new Date('2026-02-27T12:00:00Z')

      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'token_123',
            user_id: 'user_456',
            tenant_id: null, // No tenant context
            target_app: 'orchestrator',
            expires_at: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
            used_at: null,
            created_at: now.toISOString(),
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      mockSql.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as never)

      const result = await validateSSOToken('token_123', 'orchestrator')

      expect(result.valid).toBe(true)
      expect(result.userId).toBe('user_456')
      expect(result.tenantId).toBeNull()
    })

    it('should mark token as used after validation', async () => {
      const now = new Date('2026-02-27T12:00:00Z')

      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'token_123',
            user_id: 'user_456',
            tenant_id: 'org_789',
            target_app: 'admin',
            expires_at: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
            used_at: null,
            created_at: now.toISOString(),
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      mockSql.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as never)

      await validateSSOToken('token_123', 'admin')

      // Verify UPDATE query was called (2 calls: SELECT then UPDATE)
      expect(mockSql).toHaveBeenCalledTimes(2)

      // Second call should be UPDATE
      const updateCall = mockSql.mock.calls[1]
      expect(updateCall).toBeDefined()

      // @vercel/postgres sql`` calls are arrays where:
      // - First element is template strings array
      // - Remaining elements are interpolated values
      const templateStrings = updateCall?.[0] as string[] | TemplateStringsArray
      const joinedQuery = Array.isArray(templateStrings) ? templateStrings.join('') : String(templateStrings)

      expect(joinedQuery).toContain('UPDATE')
      expect(joinedQuery).toContain('sso_tokens')
      expect(updateCall?.[1]).toBe('token_123')
    })
  })

  describe('cleanupSSOTokens', () => {
    it('should delete tokens older than specified hours', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [{ id: 'token_1' }, { id: 'token_2' }, { id: 'token_3' }],
        rowCount: 3,
        command: 'DELETE',
        oid: 0,
        fields: [],
      } as never)

      const deleted = await cleanupSSOTokens(24)

      expect(deleted).toBe(3)

      // Verify DELETE query was called
      expect(mockSql).toHaveBeenCalled()

      const deleteCall = mockSql.mock.calls[0]
      const templateStrings = deleteCall?.[0] as string[] | TemplateStringsArray
      const joinedQuery = Array.isArray(templateStrings) ? templateStrings.join('') : String(templateStrings)

      expect(joinedQuery).toContain('DELETE')
      expect(joinedQuery).toContain('sso_tokens')
      expect(joinedQuery).toContain('created_at')

      // Should pass cutoff date as parameter
      expect(deleteCall?.[1]).toBeDefined()
    })

    it('should use 24 hours as default cutoff', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'DELETE',
        oid: 0,
        fields: [],
      } as never)

      await cleanupSSOTokens()

      const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const deleteCall = mockSql.mock.calls[0]
      const cutoffParam = deleteCall?.[1] as string

      const expectedCutoff = new Date(cutoffParam)
      expect(Math.abs(expectedCutoff.getTime() - cutoffDate.getTime())).toBeLessThan(1000)
    })

    it('should only delete used or expired tokens', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'DELETE',
        oid: 0,
        fields: [],
      } as never)

      await cleanupSSOTokens(48)

      const deleteCall = mockSql.mock.calls[0]
      const templateStrings = deleteCall?.[0] as string[] | TemplateStringsArray
      const joinedQuery = Array.isArray(templateStrings) ? templateStrings.join('') : String(templateStrings)

      // Verify query logic includes used_at and expires_at checks
      expect(joinedQuery).toContain('used_at')
      expect(joinedQuery).toContain('expires_at')
    })

    it('should return count of deleted tokens', async () => {
      mockSql.mockResolvedValueOnce({
        rows: Array(10).fill({ id: 'token' }),
        rowCount: 10,
        command: 'DELETE',
        oid: 0,
        fields: [],
      } as never)

      const deleted = await cleanupSSOTokens(24)

      expect(deleted).toBe(10)
    })
  })

  describe('SSO Token Lifecycle', () => {
    it('should enforce single-use tokens', async () => {
      const now = new Date('2026-02-27T12:00:00Z')

      // First validation - token is valid
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'token_123',
            user_id: 'user_456',
            tenant_id: 'org_789',
            target_app: 'admin',
            expires_at: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
            used_at: null,
            created_at: now.toISOString(),
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      mockSql.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as never)

      const firstValidation = await validateSSOToken('token_123', 'admin')
      expect(firstValidation.valid).toBe(true)

      // Second validation - token now marked as used
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'token_123',
            user_id: 'user_456',
            tenant_id: 'org_789',
            target_app: 'admin',
            expires_at: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
            used_at: now.toISOString(), // Now used!
            created_at: now.toISOString(),
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      const secondValidation = await validateSSOToken('token_123', 'admin')
      expect(secondValidation.valid).toBe(false)
      expect(secondValidation.error).toBe('Token already used')
    })

    it('should allow independent tokens for same user', async () => {
      const now = new Date('2026-02-27T12:00:00Z')

      // Token 1
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'token_1',
            user_id: 'user_456',
            tenant_id: 'org_789',
            target_app: 'admin',
            expires_at: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
            used_at: null,
            created_at: now.toISOString(),
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      mockSql.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as never)

      const result1 = await validateSSOToken('token_1', 'admin')
      expect(result1.valid).toBe(true)

      // Token 2 (different token, same user)
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'token_2',
            user_id: 'user_456',
            tenant_id: 'org_789',
            target_app: 'admin',
            expires_at: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
            used_at: null,
            created_at: now.toISOString(),
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      mockSql.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as never)

      const result2 = await validateSSOToken('token_2', 'admin')
      expect(result2.valid).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle database errors gracefully', async () => {
      mockSql.mockRejectedValueOnce(new Error('Database connection failed'))

      await expect(
        generateSSOToken({
          userId: 'user_123',
          targetApp: 'admin',
        })
      ).rejects.toThrow('Database connection failed')
    })

    it('should validate target app enum values', async () => {
      const validApps: TargetApp[] = [
        'admin',
        'storefront',
        'creator-portal',
        'contractor-portal',
        'orchestrator',
      ]

      for (const app of validApps) {
        mockSql.mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
          command: 'INSERT',
          oid: 0,
          fields: [],
        } as never)

        const token = await generateSSOToken({
          userId: 'user_123',
          targetApp: app,
        })

        expect(token).toBeDefined()
      }
    })
  })
})
