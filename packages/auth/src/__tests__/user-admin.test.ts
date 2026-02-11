/**
 * User Admin Service Tests
 *
 * Tests for platform-wide user management functions.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'

// Create mock functions
const mockSqlTemplate = vi.fn()
const mockSqlQuery = vi.fn()

// Mock @cgk/db
vi.mock('@cgk/db', () => ({
  sql: Object.assign((...args: unknown[]) => mockSqlTemplate(...args), {
    query: (...args: unknown[]) => mockSqlQuery(...args),
  }),
}))

// Mock super-admin and session modules
vi.mock('../super-admin', () => ({
  logAuditAction: vi.fn().mockResolvedValue(undefined),
  revokeAllSuperAdminSessions: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../session', () => ({
  revokeAllSessions: vi.fn().mockResolvedValue(undefined),
}))

import { logAuditAction, revokeAllSuperAdminSessions } from '../super-admin'
import { revokeAllSessions } from '../session'

import {
  getAllUsers,
  searchUsers,
  getUserWithMemberships,
  getUserActivityLog,
  logUserActivity,
  disableUser,
  enableUser,
  grantSuperAdmin,
  revokeSuperAdmin,
  getSuperAdminRegistry,
  TRACKED_ACTIONS,
} from '../user-admin'

describe('User Admin Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllUsers', () => {
    it('should return paginated users with default options', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User One',
          avatar_url: null,
          status: 'active',
          role: 'member',
          email_verified: true,
          last_login_at: '2026-02-10T00:00:00Z',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          disabled_at: null,
          disabled_by: null,
          disabled_reason: null,
          tenant_count: '2',
          is_super_admin: false,
        },
      ]

      mockSqlQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: mockUsers })

      const result = await getAllUsers()

      expect(result.users).toHaveLength(1)
      expect(result.users[0]).toEqual({
        id: 'user-1',
        email: 'user1@example.com',
        name: 'User One',
        avatarUrl: null,
        status: 'active',
        role: 'member',
        emailVerified: true,
        lastLoginAt: expect.any(Date),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        disabledAt: null,
        disabledBy: null,
        disabledReason: null,
        tenantCount: 2,
        isSuperAdmin: false,
      })
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(50)
    })

    it('should respect pagination options', async () => {
      mockSqlQuery
        .mockResolvedValueOnce({ rows: [{ total: '100' }] })
        .mockResolvedValueOnce({ rows: [] })

      const result = await getAllUsers({ page: 2, limit: 10 })

      expect(result.page).toBe(2)
      expect(result.limit).toBe(10)
      expect(result.totalPages).toBe(10)
    })

    it('should cap limit at 100', async () => {
      mockSqlQuery
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] })

      const result = await getAllUsers({ limit: 500 })

      expect(result.limit).toBe(100)
    })
  })

  describe('searchUsers', () => {
    it('should search users by query', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'john@example.com',
          name: 'John Doe',
          avatar_url: null,
          status: 'active',
          role: 'member',
          email_verified: true,
          last_login_at: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          disabled_at: null,
          disabled_by: null,
          disabled_reason: null,
          tenant_count: '1',
          is_super_admin: false,
        },
      ]

      mockSqlTemplate.mockResolvedValueOnce({ rows: mockUsers })

      const result = await searchUsers('john')

      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe('John Doe')
    })

    it('should respect limit option', async () => {
      mockSqlTemplate.mockResolvedValueOnce({ rows: [] })

      await searchUsers('test', { limit: 5 })

      // Verify the function was called
      expect(mockSqlTemplate).toHaveBeenCalled()
    })
  })

  describe('getUserWithMemberships', () => {
    it('should return user with memberships', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        avatar_url: null,
        status: 'active',
        role: 'member',
        email_verified: true,
        last_login_at: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        disabled_at: null,
        disabled_by: null,
        disabled_reason: null,
        tenant_count: '1',
        is_super_admin: false,
        super_admin_granted_by: null,
        super_admin_granted_at: null,
      }

      const mockMemberships = [
        {
          tenant_id: 'org-1',
          tenant_name: 'Test Org',
          tenant_slug: 'test-org',
          tenant_logo_url: null,
          role: 'admin',
          joined_at: '2026-01-15T00:00:00Z',
          is_active: true,
        },
      ]

      mockSqlTemplate
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: mockMemberships })

      const result = await getUserWithMemberships('user-1')

      expect(result).not.toBeNull()
      expect(result?.memberships).toHaveLength(1)
      expect(result?.memberships[0]?.tenantName).toBe('Test Org')
    })

    it('should return null for non-existent user', async () => {
      mockSqlTemplate.mockResolvedValueOnce({ rows: [] })

      const result = await getUserWithMemberships('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getUserActivityLog', () => {
    it('should return user activity entries', async () => {
      const mockActivities = [
        {
          id: 'activity-1',
          user_id: 'user-1',
          tenant_id: null,
          tenant_name: null,
          action: 'user.login',
          resource_type: null,
          resource_id: null,
          metadata: {},
          ip_address: '192.168.1.1',
          created_at: '2026-02-10T00:00:00Z',
        },
      ]

      mockSqlTemplate.mockResolvedValueOnce({ rows: mockActivities })

      const result = await getUserActivityLog('user-1')

      expect(result).toHaveLength(1)
      expect(result[0]?.action).toBe('user.login')
    })
  })

  describe('logUserActivity', () => {
    it('should log activity entry', async () => {
      mockSqlTemplate.mockResolvedValueOnce({ rows: [] })

      await logUserActivity({
        userId: 'user-1',
        action: 'user.login',
        ipAddress: '192.168.1.1',
      })

      expect(mockSqlTemplate).toHaveBeenCalled()
    })
  })

  describe('disableUser', () => {
    it('should disable user and revoke sessions', async () => {
      // Super admin count check
      mockSqlTemplate.mockResolvedValueOnce({ rows: [{ count: '2' }] })
      // Is super admin check
      mockSqlTemplate.mockResolvedValueOnce({ rows: [] })
      // Update user status
      mockSqlTemplate.mockResolvedValueOnce({ rows: [] })
      // Log user activity
      mockSqlTemplate.mockResolvedValueOnce({ rows: [] })

      await disableUser('user-1', 'Violated terms of service', 'admin-1')

      expect(revokeAllSessions).toHaveBeenCalledWith('user-1')
      expect(logAuditAction).toHaveBeenCalled()
    })

    it('should not allow disabling last super admin', async () => {
      // Super admin count check
      mockSqlTemplate.mockResolvedValueOnce({ rows: [{ count: '1' }] })
      // Is super admin check (user is the last super admin)
      mockSqlTemplate.mockResolvedValueOnce({ rows: [{ user_id: 'user-1' }] })

      await expect(
        disableUser('user-1', 'Test reason', 'admin-1')
      ).rejects.toThrow('Cannot disable the last super admin')
    })
  })

  describe('enableUser', () => {
    it('should enable user', async () => {
      // Update user status
      mockSqlTemplate.mockResolvedValueOnce({ rows: [] })
      // Log user activity
      mockSqlTemplate.mockResolvedValueOnce({ rows: [] })

      await enableUser('user-1', 'admin-1')

      expect(mockSqlTemplate).toHaveBeenCalled()
      expect(logAuditAction).toHaveBeenCalled()
    })
  })

  describe('grantSuperAdmin', () => {
    it('should grant super admin access', async () => {
      // Granter check (has canManageSuperAdmins)
      mockSqlTemplate.mockResolvedValueOnce({ rows: [{ can_manage_super_admins: true }] })
      // Existing super admin check
      mockSqlTemplate.mockResolvedValueOnce({ rows: [] })
      // Insert super admin record
      mockSqlTemplate.mockResolvedValueOnce({ rows: [] })
      // Update user role
      mockSqlTemplate.mockResolvedValueOnce({ rows: [] })
      // Log user activity
      mockSqlTemplate.mockResolvedValueOnce({ rows: [] })

      await grantSuperAdmin('user-1', 'admin-1', 'Platform team member')

      expect(logAuditAction).toHaveBeenCalled()
    })

    it('should not allow non-super-admin to grant access', async () => {
      mockSqlTemplate.mockResolvedValueOnce({ rows: [] })

      await expect(
        grantSuperAdmin('user-1', 'regular-user', 'Test')
      ).rejects.toThrow('Only super admins can grant super admin access')
    })

    it('should not allow granting without canManageSuperAdmins permission', async () => {
      mockSqlTemplate.mockResolvedValueOnce({ rows: [{ can_manage_super_admins: false }] })

      await expect(
        grantSuperAdmin('user-1', 'admin-1', 'Test')
      ).rejects.toThrow('You do not have permission to manage super admins')
    })
  })

  describe('revokeSuperAdmin', () => {
    it('should revoke super admin access', async () => {
      // Super admin count check
      mockSqlTemplate.mockResolvedValueOnce({ rows: [{ count: '2' }] })
      // Revoker permission check
      mockSqlTemplate.mockResolvedValueOnce({ rows: [{ can_manage_super_admins: true }] })
      // Deactivate super admin
      mockSqlTemplate.mockResolvedValueOnce({ rows: [] })
      // Update user role
      mockSqlTemplate.mockResolvedValueOnce({ rows: [] })
      // Log user activity
      mockSqlTemplate.mockResolvedValueOnce({ rows: [] })

      await revokeSuperAdmin('user-1', 'admin-2')

      expect(revokeAllSuperAdminSessions).toHaveBeenCalledWith('user-1', 'super_admin_revoked')
      expect(logAuditAction).toHaveBeenCalled()
    })

    it('should not allow self-revocation', async () => {
      await expect(
        revokeSuperAdmin('admin-1', 'admin-1')
      ).rejects.toThrow('Cannot revoke your own super admin access')
    })

    it('should not allow revoking last super admin', async () => {
      mockSqlTemplate.mockResolvedValueOnce({ rows: [{ count: '1' }] })

      await expect(
        revokeSuperAdmin('user-1', 'admin-2')
      ).rejects.toThrow('Cannot revoke the last super admin')
    })
  })

  describe('getSuperAdminRegistry', () => {
    it('should return list of super admins', async () => {
      const mockAdmins = [
        {
          user_id: 'admin-1',
          email: 'admin@example.com',
          name: 'Admin User',
          avatar_url: null,
          granted_at: '2026-01-01T00:00:00Z',
          granted_by_user_id: null,
          granted_by_name: null,
          can_access_all_tenants: true,
          can_impersonate: true,
          can_manage_super_admins: true,
          mfa_enabled: true,
          last_access_at: '2026-02-10T00:00:00Z',
        },
      ]

      mockSqlTemplate.mockResolvedValueOnce({ rows: mockAdmins })

      const result = await getSuperAdminRegistry()

      expect(result).toHaveLength(1)
      expect(result[0]?.email).toBe('admin@example.com')
      expect(result[0]?.canManageSuperAdmins).toBe(true)
    })
  })

  describe('TRACKED_ACTIONS', () => {
    it('should include all expected actions', () => {
      expect(TRACKED_ACTIONS).toContain('user.login')
      expect(TRACKED_ACTIONS).toContain('user.logout')
      expect(TRACKED_ACTIONS).toContain('super_admin.granted')
      expect(TRACKED_ACTIONS).toContain('super_admin.revoked')
      expect(TRACKED_ACTIONS).toContain('user.disabled')
      expect(TRACKED_ACTIONS).toContain('user.enabled')
    })
  })
})
