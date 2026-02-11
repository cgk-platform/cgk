import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing
vi.mock('@cgk/db', () => ({
  sql: vi.fn(),
}))

vi.mock('../jwt', () => ({
  signJWT: vi.fn().mockResolvedValue('mock-jwt-token'),
}))

vi.mock('../session', () => ({
  updateSessionOrganization: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../user-admin', () => ({
  logUserActivity: vi.fn().mockResolvedValue(undefined),
}))

import { sql } from '@cgk/db'

import {
  getDefaultTenant,
  getUserTenants,
  setDefaultTenant,
  shouldShowWelcomeModal,
  switchTenantContext,
  TenantAccessError,
  updateMembershipActivity,
} from '../tenant-context'

const mockSql = vi.mocked(sql)

describe('Tenant Context Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUserTenants', () => {
    it('returns all accessible tenants for user', async () => {
      const mockRows = [
        {
          id: 'org-1',
          slug: 'org-one',
          name: 'Organization One',
          logo_url: 'https://example.com/logo1.png',
          role: 'admin',
          is_default: true,
          last_active_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 'org-2',
          slug: 'org-two',
          name: 'Organization Two',
          logo_url: null,
          role: 'member',
          is_default: false,
          last_active_at: null,
        },
      ]

      mockSql.mockResolvedValueOnce({
        rows: mockRows,
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: [],
      } as never)

      const result = await getUserTenants('user-123')

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 'org-1',
        slug: 'org-one',
        name: 'Organization One',
        logoUrl: 'https://example.com/logo1.png',
        role: 'admin',
        isDefault: true,
        lastActiveAt: new Date('2025-01-01T00:00:00Z'),
      })
      expect(result[1]).toEqual({
        id: 'org-2',
        slug: 'org-two',
        name: 'Organization Two',
        logoUrl: null,
        role: 'member',
        isDefault: false,
        lastActiveAt: null,
      })
    })

    it('returns empty array if user has no tenants', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as never)

      const result = await getUserTenants('user-123')

      expect(result).toEqual([])
    })
  })

  describe('switchTenantContext', () => {
    it('throws error if user has no access to tenant', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as never)

      await expect(
        switchTenantContext('user-123', 'forbidden-tenant', 'session-123')
      ).rejects.toThrow(TenantAccessError)
    })

    it('throws error if tenant is suspended', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [{ id: 'org-1', slug: 'suspended', status: 'suspended', role: 'member' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as never)

      await expect(
        switchTenantContext('user-123', 'suspended', 'session-123')
      ).rejects.toThrow('Cannot switch to suspended or disabled tenant')
    })

    it('successfully switches tenant and returns new token', async () => {
      // Mock membership check
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'org-1',
            slug: 'target-org',
            name: 'Target Org',
            logo_url: null,
            role: 'admin',
            status: 'active',
            is_default: false,
          },
        ],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as never)

      // Mock user fetch
      mockSql.mockResolvedValueOnce({
        rows: [{ email: 'user@example.com' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as never)

      // Mock orgs fetch
      mockSql.mockResolvedValueOnce({
        rows: [{ id: 'org-1', slug: 'target-org', role: 'admin' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as never)

      // Mock last_active_at update
      mockSql.mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as never)

      const result = await switchTenantContext('user-123', 'target-org', 'session-123')

      expect(result.success).toBe(true)
      expect(result.token).toBe('mock-jwt-token')
      expect(result.tenant.slug).toBe('target-org')
      expect(result.tenant.role).toBe('admin')
    })
  })

  describe('setDefaultTenant', () => {
    it('throws error if user has no access to tenant', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as never)

      await expect(setDefaultTenant('user-123', 'org-forbidden')).rejects.toThrow(
        TenantAccessError
      )
    })

    it('clears existing default and sets new one', async () => {
      // Mock access check
      mockSql.mockResolvedValueOnce({
        rows: [{}],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as never)
      // Mock clear existing default
      mockSql.mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as never)
      // Mock set new default
      mockSql.mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as never)

      await setDefaultTenant('user-123', 'org-1')

      expect(mockSql).toHaveBeenCalledTimes(3)
    })
  })

  describe('getDefaultTenant', () => {
    it('returns null if no default set', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as never)

      const result = await getDefaultTenant('user-123')

      expect(result).toBeNull()
    })

    it('returns default tenant if set', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'org-1',
            slug: 'default-org',
            name: 'Default Org',
            logo_url: null,
            role: 'admin',
            is_default: true,
            last_active_at: null,
          },
        ],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as never)

      const result = await getDefaultTenant('user-123')

      expect(result).not.toBeNull()
      expect(result?.slug).toBe('default-org')
      expect(result?.isDefault).toBe(true)
    })
  })

  describe('updateMembershipActivity', () => {
    it('updates last_active_at timestamp', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as never)

      await updateMembershipActivity('user-123', 'org-1')

      expect(mockSql).toHaveBeenCalledTimes(1)
    })
  })

  describe('shouldShowWelcomeModal', () => {
    it('returns false if user has only one tenant', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [{ tenant_count: 1, default_count: 0 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as never)

      const result = await shouldShowWelcomeModal('user-123')

      expect(result).toBe(false)
    })

    it('returns false if user has a default set', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [{ tenant_count: 3, default_count: 1 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as never)

      const result = await shouldShowWelcomeModal('user-123')

      expect(result).toBe(false)
    })

    it('returns true if user has multiple tenants and no default', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [{ tenant_count: 3, default_count: 0 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as never)

      const result = await shouldShowWelcomeModal('user-123')

      expect(result).toBe(true)
    })
  })
})
