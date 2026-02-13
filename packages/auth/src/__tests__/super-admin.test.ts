import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the database module
vi.mock('@cgk-platform/db', () => ({
  sql: vi.fn(),
}))

import { sql } from '@cgk-platform/db'
import {
  isSuperAdmin,
  getSuperAdminUser,
  checkRateLimit,
  checkIpAllowlist,
} from '../super-admin'

describe('Super Admin Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isSuperAdmin', () => {
    it('should return true for active super admin', async () => {
      const mockSql = sql as unknown as ReturnType<typeof vi.fn>
      mockSql.mockResolvedValueOnce({
        rows: [{ user_id: 'user-123' }],
      })

      const result = await isSuperAdmin('user-123')
      expect(result).toBe(true)
      expect(mockSql).toHaveBeenCalled()
    })

    it('should return false for non-super admin', async () => {
      const mockSql = sql as unknown as ReturnType<typeof vi.fn>
      mockSql.mockResolvedValueOnce({
        rows: [],
      })

      const result = await isSuperAdmin('user-456')
      expect(result).toBe(false)
    })

    it('should return false for inactive super admin', async () => {
      const mockSql = sql as unknown as ReturnType<typeof vi.fn>
      // Query checks for is_active = TRUE, so inactive returns empty
      mockSql.mockResolvedValueOnce({
        rows: [],
      })

      const result = await isSuperAdmin('user-789')
      expect(result).toBe(false)
    })
  })

  describe('getSuperAdminUser', () => {
    it('should return super admin user details', async () => {
      const mockSql = sql as unknown as ReturnType<typeof vi.fn>
      const mockDate = new Date().toISOString()
      mockSql.mockResolvedValueOnce({
        rows: [{
          user_id: 'user-123',
          granted_at: mockDate,
          granted_by: 'admin-user',
          notes: 'Platform owner',
          can_access_all_tenants: true,
          can_impersonate: true,
          can_manage_super_admins: true,
          mfa_enabled: true,
          mfa_verified_at: mockDate,
          last_access_at: mockDate,
          last_access_ip: '192.168.1.1',
          is_active: true,
          created_at: mockDate,
          updated_at: mockDate,
        }],
      })

      const result = await getSuperAdminUser('user-123')
      expect(result).not.toBeNull()
      expect(result?.userId).toBe('user-123')
      expect(result?.canAccessAllTenants).toBe(true)
      expect(result?.canImpersonate).toBe(true)
      expect(result?.canManageSuperAdmins).toBe(true)
      expect(result?.mfaEnabled).toBe(true)
      expect(result?.isActive).toBe(true)
    })

    it('should return null for non-existent user', async () => {
      const mockSql = sql as unknown as ReturnType<typeof vi.fn>
      mockSql.mockResolvedValueOnce({
        rows: [],
      })

      const result = await getSuperAdminUser('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('checkRateLimit', () => {
    it('should allow first request', async () => {
      const mockSql = sql as unknown as ReturnType<typeof vi.fn>
      // First call: check for existing record
      mockSql.mockResolvedValueOnce({
        rows: [],
      })
      // Second call: insert new record
      mockSql.mockResolvedValueOnce({
        rows: [],
      })

      const result = await checkRateLimit('user-123', 'api', 100, 60)
      expect(result).toBe(true)
    })

    it('should allow requests under limit', async () => {
      const mockSql = sql as unknown as ReturnType<typeof vi.fn>
      const now = new Date()
      mockSql.mockResolvedValueOnce({
        rows: [{
          request_count: 50,
          window_start: now.toISOString(),
          window_seconds: 60,
        }],
      })
      // Update call
      mockSql.mockResolvedValueOnce({
        rows: [],
      })

      const result = await checkRateLimit('user-123', 'api', 100, 60)
      expect(result).toBe(true)
    })

    it('should block requests over limit', async () => {
      const mockSql = sql as unknown as ReturnType<typeof vi.fn>
      const now = new Date()
      mockSql.mockResolvedValueOnce({
        rows: [{
          request_count: 100,
          window_start: now.toISOString(),
          window_seconds: 60,
        }],
      })

      const result = await checkRateLimit('user-123', 'api', 100, 60)
      expect(result).toBe(false)
    })

    it('should reset window after expiration', async () => {
      const mockSql = sql as unknown as ReturnType<typeof vi.fn>
      const oldWindow = new Date(Date.now() - 120000) // 2 minutes ago
      mockSql.mockResolvedValueOnce({
        rows: [{
          request_count: 100,
          window_start: oldWindow.toISOString(),
          window_seconds: 60,
        }],
      })
      // Reset call
      mockSql.mockResolvedValueOnce({
        rows: [],
      })

      const result = await checkRateLimit('user-123', 'api', 100, 60)
      expect(result).toBe(true)
    })
  })

  describe('checkIpAllowlist', () => {
    it('should allow all when no allowlist configured', async () => {
      const mockSql = sql as unknown as ReturnType<typeof vi.fn>
      mockSql.mockResolvedValueOnce({
        rows: [{ count: 0 }],
      })

      const result = await checkIpAllowlist('192.168.1.1')
      expect(result).toBe(true)
    })

    it('should allow IP in allowlist', async () => {
      const mockSql = sql as unknown as ReturnType<typeof vi.fn>
      // Count check
      mockSql.mockResolvedValueOnce({
        rows: [{ count: 1 }],
      })
      // IP check
      mockSql.mockResolvedValueOnce({
        rows: [{ id: 'ip-123' }],
      })

      const result = await checkIpAllowlist('192.168.1.1')
      expect(result).toBe(true)
    })

    it('should block IP not in allowlist', async () => {
      const mockSql = sql as unknown as ReturnType<typeof vi.fn>
      // Count check
      mockSql.mockResolvedValueOnce({
        rows: [{ count: 1 }],
      })
      // IP check - not found
      mockSql.mockResolvedValueOnce({
        rows: [],
      })

      const result = await checkIpAllowlist('10.0.0.1')
      expect(result).toBe(false)
    })
  })
})

describe('Super Admin Middleware Logic', () => {
  describe('Sensitive Route Detection', () => {
    const sensitiveRoutes = [
      '/brands/new',
      '/users/impersonate',
      '/users/super-admins',
      '/settings',
      '/api/platform/brands',
      '/api/platform/users/super-admins',
    ]

    const nonSensitiveRoutes = [
      '/',
      '/dashboard',
      '/tenants',
      '/api/platform/overview',
    ]

    it.each(sensitiveRoutes)('should identify %s as sensitive', (route) => {
      const isSensitive = sensitiveRoutes.some((pattern) => {
        if (pattern.endsWith('/')) {
          return route === pattern.slice(0, -1) || route.startsWith(pattern)
        }
        return route === pattern || route.startsWith(pattern + '/')
      })
      expect(isSensitive).toBe(true)
    })

    it.each(nonSensitiveRoutes)('should identify %s as non-sensitive', (route) => {
      const isSensitive = sensitiveRoutes.some((pattern) => {
        if (pattern.endsWith('/')) {
          return route === pattern.slice(0, -1) || route.startsWith(pattern)
        }
        return route === pattern || route.startsWith(pattern + '/')
      })
      expect(isSensitive).toBe(false)
    })
  })

  describe('Session Expiration', () => {
    it('should detect expired session by time limit', () => {
      const expiresAt = new Date(Date.now() - 1000) // 1 second ago
      const isExpired = expiresAt < new Date()
      expect(isExpired).toBe(true)
    })

    it('should detect valid session within time limit', () => {
      const expiresAt = new Date(Date.now() + 3600000) // 1 hour from now
      const isExpired = expiresAt < new Date()
      expect(isExpired).toBe(false)
    })

    it('should detect inactivity timeout', () => {
      const lastActivityAt = new Date(Date.now() - 35 * 60000) // 35 minutes ago
      const timeoutMinutes = 30
      const inactivityLimit = new Date(Date.now() - timeoutMinutes * 60000)
      const isInactive = lastActivityAt < inactivityLimit
      expect(isInactive).toBe(true)
    })

    it('should allow activity within timeout', () => {
      const lastActivityAt = new Date(Date.now() - 10 * 60000) // 10 minutes ago
      const timeoutMinutes = 30
      const inactivityLimit = new Date(Date.now() - timeoutMinutes * 60000)
      const isInactive = lastActivityAt < inactivityLimit
      expect(isInactive).toBe(false)
    })
  })
})
