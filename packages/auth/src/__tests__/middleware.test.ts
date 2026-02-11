import { describe, expect, it } from 'vitest'

import { hasRole } from '../middleware'
import type { UserRole } from '../types'

describe('middleware utilities', () => {
  describe('hasRole', () => {
    it('should grant super_admin access to all roles', () => {
      const userRole: UserRole = 'super_admin'

      expect(hasRole(userRole, 'super_admin')).toBe(true)
      expect(hasRole(userRole, 'owner')).toBe(true)
      expect(hasRole(userRole, 'admin')).toBe(true)
      expect(hasRole(userRole, 'member')).toBe(true)
    })

    it('should grant owner access to owner and below', () => {
      const userRole: UserRole = 'owner'

      expect(hasRole(userRole, 'super_admin')).toBe(false)
      expect(hasRole(userRole, 'owner')).toBe(true)
      expect(hasRole(userRole, 'admin')).toBe(true)
      expect(hasRole(userRole, 'member')).toBe(true)
    })

    it('should grant admin access to admin and below', () => {
      const userRole: UserRole = 'admin'

      expect(hasRole(userRole, 'super_admin')).toBe(false)
      expect(hasRole(userRole, 'owner')).toBe(false)
      expect(hasRole(userRole, 'admin')).toBe(true)
      expect(hasRole(userRole, 'member')).toBe(true)
    })

    it('should grant member access only to member', () => {
      const userRole: UserRole = 'member'

      expect(hasRole(userRole, 'super_admin')).toBe(false)
      expect(hasRole(userRole, 'owner')).toBe(false)
      expect(hasRole(userRole, 'admin')).toBe(false)
      expect(hasRole(userRole, 'member')).toBe(true)
    })
  })
})
