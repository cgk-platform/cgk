import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock @cgk-platform/db
vi.mock('@cgk-platform/db', () => ({
  sql: vi.fn(),
}))

import { sql } from '@cgk-platform/db'
import {
  createSession,
  validateSession,
  validateSessionById,
  revokeSession,
  revokeAllSessions,
  getUserSessions,
} from '../session'

const mockSql = vi.mocked(sql)

describe('session management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSession', () => {
    it('should create a session and return token', async () => {
      const mockSession = {
        id: 'session_123',
        user_id: 'user_456',
        organization_id: 'org_789',
        token_hash: 'hashed_token',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        ip_address: null,
        user_agent: null,
        created_at: new Date().toISOString(),
        revoked_at: null,
      }

      mockSql.mockResolvedValueOnce({
        rows: [mockSession],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as never)

      const result = await createSession('user_456', 'org_789')

      expect(result.session).toBeDefined()
      expect(result.session.id).toBe('session_123')
      expect(result.session.userId).toBe('user_456')
      expect(result.token).toBeDefined()
      expect(result.token.length).toBe(32) // nanoid length
    })

    it('should extract IP from x-forwarded-for header', async () => {
      const mockSession = {
        id: 'session_123',
        user_id: 'user_456',
        organization_id: null,
        token_hash: 'hashed_token',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        created_at: new Date().toISOString(),
        revoked_at: null,
      }

      mockSql.mockResolvedValueOnce({
        rows: [mockSession],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as never)

      const mockRequest = new Request('https://example.com', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
          'user-agent': 'Mozilla/5.0',
        },
      })

      const result = await createSession('user_456', null, mockRequest)

      expect(result.session.ipAddress).toBe('192.168.1.1')
      expect(result.session.userAgent).toBe('Mozilla/5.0')
    })
  })

  describe('validateSession', () => {
    it('should return session if valid', async () => {
      const mockSession = {
        id: 'session_123',
        user_id: 'user_456',
        organization_id: 'org_789',
        token_hash: 'hashed_token',
        expires_at: new Date(Date.now() + 1000000).toISOString(),
        ip_address: null,
        user_agent: null,
        created_at: new Date().toISOString(),
        revoked_at: null,
      }

      mockSql.mockResolvedValueOnce({
        rows: [mockSession],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      const result = await validateSession('raw_token')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('session_123')
    })

    it('should return null if session not found', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      const result = await validateSession('invalid_token')

      expect(result).toBeNull()
    })
  })

  describe('validateSessionById', () => {
    it('should return session if valid', async () => {
      const mockSession = {
        id: 'session_123',
        user_id: 'user_456',
        organization_id: 'org_789',
        token_hash: 'hashed_token',
        expires_at: new Date(Date.now() + 1000000).toISOString(),
        ip_address: null,
        user_agent: null,
        created_at: new Date().toISOString(),
        revoked_at: null,
      }

      mockSql.mockResolvedValueOnce({
        rows: [mockSession],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      const result = await validateSessionById('session_123')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('session_123')
    })
  })

  describe('revokeSession', () => {
    it('should revoke a session', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as never)

      await revokeSession('session_123')

      expect(mockSql).toHaveBeenCalled()
    })
  })

  describe('revokeAllSessions', () => {
    it('should revoke all user sessions', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [],
        rowCount: 3,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as never)

      await revokeAllSessions('user_456')

      expect(mockSql).toHaveBeenCalled()
    })
  })

  describe('getUserSessions', () => {
    it('should return all active sessions for user', async () => {
      const mockSessions = [
        {
          id: 'session_1',
          user_id: 'user_456',
          organization_id: 'org_789',
          token_hash: 'hash1',
          expires_at: new Date(Date.now() + 1000000).toISOString(),
          ip_address: null,
          user_agent: null,
          created_at: new Date().toISOString(),
          revoked_at: null,
        },
        {
          id: 'session_2',
          user_id: 'user_456',
          organization_id: 'org_789',
          token_hash: 'hash2',
          expires_at: new Date(Date.now() + 1000000).toISOString(),
          ip_address: null,
          user_agent: null,
          created_at: new Date().toISOString(),
          revoked_at: null,
        },
      ]

      mockSql.mockResolvedValueOnce({
        rows: mockSessions,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      const result = await getUserSessions('user_456')

      expect(result).toHaveLength(2)
      expect(result[0]?.id).toBe('session_1')
      expect(result[1]?.id).toBe('session_2')
    })
  })
})
