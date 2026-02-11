import { describe, expect, it } from 'vitest'

import {
  expandWildcards,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  isValidPermissionFormat,
  isWildcardPermission,
  resolvePermissions,
} from '../permissions/checker'

describe('hasPermission', () => {
  describe('exact match', () => {
    it('returns true for exact permission match', () => {
      const permissions = ['orders.view', 'orders.manage']
      expect(hasPermission(permissions, 'orders.view')).toBe(true)
    })

    it('returns false when permission is not in list', () => {
      const permissions = ['orders.view']
      expect(hasPermission(permissions, 'orders.manage')).toBe(false)
    })
  })

  describe('full wildcard', () => {
    it('grants all permissions when user has *', () => {
      const permissions = ['*']
      expect(hasPermission(permissions, 'orders.view')).toBe(true)
      expect(hasPermission(permissions, 'creators.payments.approve')).toBe(true)
      expect(hasPermission(permissions, 'anything.else')).toBe(true)
    })
  })

  describe('category wildcard', () => {
    it('grants all permissions in category with category.*', () => {
      const permissions = ['orders.*']
      expect(hasPermission(permissions, 'orders.view')).toBe(true)
      expect(hasPermission(permissions, 'orders.manage')).toBe(true)
    })

    it('does not grant permissions in other categories', () => {
      const permissions = ['orders.*']
      expect(hasPermission(permissions, 'creators.view')).toBe(false)
    })

    it('grants nested permissions with category wildcard', () => {
      const permissions = ['creators.*']
      expect(hasPermission(permissions, 'creators.payments.approve')).toBe(true)
      expect(hasPermission(permissions, 'creators.contracts.sign')).toBe(true)
    })
  })

  describe('action wildcard', () => {
    it('grants view permission across categories with *.view', () => {
      const permissions = ['*.view']
      expect(hasPermission(permissions, 'orders.view')).toBe(true)
      expect(hasPermission(permissions, 'creators.view')).toBe(true)
      expect(hasPermission(permissions, 'products.view')).toBe(true)
    })

    it('does not grant non-view permissions with *.view', () => {
      const permissions = ['*.view']
      expect(hasPermission(permissions, 'orders.manage')).toBe(false)
    })

    it('does not apply action wildcard to nested permissions', () => {
      const permissions = ['*.view']
      // This has more than 2 parts, so *.view doesn't apply
      expect(hasPermission(permissions, 'creators.payments.view')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('returns false for empty permissions array', () => {
      expect(hasPermission([], 'orders.view')).toBe(false)
    })

    it('returns false for null/undefined permissions', () => {
      expect(hasPermission(null as unknown as string[], 'orders.view')).toBe(false)
      expect(hasPermission(undefined as unknown as string[], 'orders.view')).toBe(false)
    })

    it('returns false for single-part permission without exact match', () => {
      const permissions = ['orders.*']
      expect(hasPermission(permissions, 'orders')).toBe(false)
    })
  })
})

describe('hasAnyPermission', () => {
  it('returns true if user has any of the required permissions', () => {
    const permissions = ['orders.view']
    expect(hasAnyPermission(permissions, ['orders.view', 'orders.manage'])).toBe(true)
  })

  it('returns false if user has none of the required permissions', () => {
    const permissions = ['creators.view']
    expect(hasAnyPermission(permissions, ['orders.view', 'orders.manage'])).toBe(false)
  })

  it('works with wildcards', () => {
    const permissions = ['orders.*']
    expect(hasAnyPermission(permissions, ['orders.view', 'creators.view'])).toBe(true)
  })
})

describe('hasAllPermissions', () => {
  it('returns true if user has all required permissions', () => {
    const permissions = ['orders.view', 'orders.manage', 'creators.view']
    expect(hasAllPermissions(permissions, ['orders.view', 'orders.manage'])).toBe(true)
  })

  it('returns false if user is missing any required permission', () => {
    const permissions = ['orders.view']
    expect(hasAllPermissions(permissions, ['orders.view', 'orders.manage'])).toBe(false)
  })

  it('works with wildcards', () => {
    const permissions = ['orders.*']
    expect(hasAllPermissions(permissions, ['orders.view', 'orders.manage'])).toBe(true)
  })
})

describe('resolvePermissions', () => {
  it('merges role and parent permissions', () => {
    const rolePerms = ['orders.view']
    const parentPerms = ['creators.view']
    const result = resolvePermissions(rolePerms, parentPerms)
    expect(result).toContain('orders.view')
    expect(result).toContain('creators.view')
  })

  it('deduplicates permissions', () => {
    const rolePerms = ['orders.view', 'orders.manage']
    const parentPerms = ['orders.view', 'creators.view']
    const result = resolvePermissions(rolePerms, parentPerms)
    expect(result.filter((p) => p === 'orders.view')).toHaveLength(1)
  })

  it('works without parent permissions', () => {
    const rolePerms = ['orders.view']
    const result = resolvePermissions(rolePerms)
    expect(result).toEqual(['orders.view'])
  })
})

describe('expandWildcards', () => {
  const allPermissions = [
    'orders.view',
    'orders.manage',
    'creators.view',
    'creators.manage',
    'products.view',
    'products.sync',
  ]

  it('expands full wildcard to all permissions', () => {
    const result = expandWildcards(['*'], allPermissions)
    expect(result).toEqual(expect.arrayContaining(allPermissions))
  })

  it('expands category wildcard', () => {
    const result = expandWildcards(['orders.*'], allPermissions)
    expect(result).toContain('orders.view')
    expect(result).toContain('orders.manage')
    expect(result).not.toContain('creators.view')
  })

  it('expands action wildcard', () => {
    const result = expandWildcards(['*.view'], allPermissions)
    expect(result).toContain('orders.view')
    expect(result).toContain('creators.view')
    expect(result).toContain('products.view')
    expect(result).not.toContain('orders.manage')
  })

  it('preserves specific permissions', () => {
    const result = expandWildcards(['orders.view', 'creators.manage'], allPermissions)
    expect(result).toEqual(['orders.view', 'creators.manage'])
  })
})

describe('isWildcardPermission', () => {
  it('returns true for full wildcard', () => {
    expect(isWildcardPermission('*')).toBe(true)
  })

  it('returns true for category wildcard', () => {
    expect(isWildcardPermission('orders.*')).toBe(true)
  })

  it('returns true for action wildcard', () => {
    expect(isWildcardPermission('*.view')).toBe(true)
  })

  it('returns false for specific permissions', () => {
    expect(isWildcardPermission('orders.view')).toBe(false)
  })
})

describe('isValidPermissionFormat', () => {
  it('accepts full wildcard', () => {
    expect(isValidPermissionFormat('*')).toBe(true)
  })

  it('accepts category wildcard', () => {
    expect(isValidPermissionFormat('orders.*')).toBe(true)
  })

  it('accepts action wildcard', () => {
    expect(isValidPermissionFormat('*.view')).toBe(true)
  })

  it('accepts simple category.action format', () => {
    expect(isValidPermissionFormat('orders.view')).toBe(true)
  })

  it('accepts nested permissions', () => {
    expect(isValidPermissionFormat('creators.payments.approve')).toBe(true)
  })

  it('rejects single part without dots', () => {
    expect(isValidPermissionFormat('orders')).toBe(false)
  })

  it('rejects empty category', () => {
    expect(isValidPermissionFormat('.view')).toBe(false)
  })

  it('rejects empty action', () => {
    expect(isValidPermissionFormat('orders.')).toBe(false)
  })

  it('rejects double wildcards', () => {
    expect(isValidPermissionFormat('*.*')).toBe(false)
  })
})
