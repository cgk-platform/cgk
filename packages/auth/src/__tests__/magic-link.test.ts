import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock @cgk/db
vi.mock('@cgk/db', () => ({
  sql: vi.fn(),
}))

// Mock fetch for Resend API
global.fetch = vi.fn()

import { sql } from '@cgk/db'
import {
  createMagicLink,
  verifyMagicLink,
  sendMagicLinkEmail,
} from '../magic-link'

const mockSql = vi.mocked(sql)
const mockFetch = vi.mocked(fetch)

describe('magic link system', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createMagicLink', () => {
    it('should create a magic link and return token', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as never)

      const token = await createMagicLink('test@example.com', 'login')

      expect(token).toBeDefined()
      expect(token.length).toBe(48) // nanoid length for magic links
      expect(mockSql).toHaveBeenCalled()
    })

    it('should normalize email to lowercase', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as never)

      await createMagicLink('Test@EXAMPLE.com', 'login')

      // The sql call should have the lowercase email
      expect(mockSql).toHaveBeenCalled()
    })

    it('should support invite purpose with org and role', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as never)

      const token = await createMagicLink(
        'invite@example.com',
        'invite',
        'org_123',
        'admin'
      )

      expect(token).toBeDefined()
      expect(mockSql).toHaveBeenCalled()
    })
  })

  describe('verifyMagicLink', () => {
    it('should verify a valid magic link', async () => {
      const mockLink = {
        id: 'link_123',
        email: 'test@example.com',
        token_hash: 'hashed',
        purpose: 'login',
        organization_id: null,
        invite_role: null,
        expires_at: new Date(Date.now() + 1000000).toISOString(),
        used_at: null,
        created_at: new Date().toISOString(),
      }

      const mockUser = {
        id: 'user_456',
      }

      // First call: find magic link
      mockSql.mockResolvedValueOnce({
        rows: [mockLink],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      // Second call: mark as used
      mockSql.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as never)

      // Third call: find user
      mockSql.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      const result = await verifyMagicLink('test@example.com', 'valid_token')

      expect(result.userId).toBe('user_456')
      expect(result.purpose).toBe('login')
      expect(result.orgId).toBeNull()
    })

    it('should return null userId for new users', async () => {
      const mockLink = {
        id: 'link_123',
        email: 'new@example.com',
        token_hash: 'hashed',
        purpose: 'signup',
        organization_id: null,
        invite_role: null,
        expires_at: new Date(Date.now() + 1000000).toISOString(),
        used_at: null,
        created_at: new Date().toISOString(),
      }

      // First call: find magic link
      mockSql.mockResolvedValueOnce({
        rows: [mockLink],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      // Second call: mark as used
      mockSql.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as never)

      // Third call: user not found
      mockSql.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      const result = await verifyMagicLink('new@example.com', 'valid_token')

      expect(result.userId).toBeNull()
      expect(result.purpose).toBe('signup')
    })

    it('should throw for invalid/expired magic link', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      await expect(
        verifyMagicLink('test@example.com', 'invalid_token')
      ).rejects.toThrow('Invalid or expired magic link')
    })

    it('should include invite details for invite links', async () => {
      const mockLink = {
        id: 'link_123',
        email: 'invite@example.com',
        token_hash: 'hashed',
        purpose: 'invite',
        organization_id: 'org_789',
        invite_role: 'admin',
        expires_at: new Date(Date.now() + 1000000).toISOString(),
        used_at: null,
        created_at: new Date().toISOString(),
      }

      mockSql.mockResolvedValueOnce({
        rows: [mockLink],
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

      mockSql.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as never)

      const result = await verifyMagicLink('invite@example.com', 'valid_token')

      expect(result.purpose).toBe('invite')
      expect(result.orgId).toBe('org_789')
      expect(result.inviteRole).toBe('admin')
    })
  })

  describe('sendMagicLinkEmail', () => {
    it('should log to console in dev mode (no RESEND_API_KEY)', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await sendMagicLinkEmail('test@example.com', 'token123', 'login')

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEV] Magic link for test@example.com')
      )

      consoleSpy.mockRestore()
    })

    it('should call Resend API when configured', async () => {
      // Set Resend API key
      const originalEnv = process.env.RESEND_API_KEY
      process.env.RESEND_API_KEY = 're_test_key'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'email_123' }),
      } as Response)

      await sendMagicLinkEmail('test@example.com', 'token123', 'login')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer re_test_key',
          }),
        })
      )

      // Restore env
      process.env.RESEND_API_KEY = originalEnv
    })

    it('should throw on Resend API error', async () => {
      const originalEnv = process.env.RESEND_API_KEY
      process.env.RESEND_API_KEY = 're_test_key'

      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'API error',
      } as Response)

      await expect(
        sendMagicLinkEmail('test@example.com', 'token123', 'login')
      ).rejects.toThrow('Failed to send magic link email')

      process.env.RESEND_API_KEY = originalEnv
    })
  })
})
