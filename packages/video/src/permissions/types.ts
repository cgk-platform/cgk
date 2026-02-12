/**
 * @cgk/video - Permission types
 */

import type { PermissionLevel } from '../types.js'

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  /**
   * Whether access is granted
   */
  allowed: boolean

  /**
   * The permission level granted (if allowed)
   */
  level: PermissionLevel | null

  /**
   * Reason for denial (if not allowed)
   */
  reason?: string

  /**
   * Whether password is required
   */
  passwordRequired?: boolean

  /**
   * Whether the permission has expired
   */
  expired?: boolean
}

/**
 * Permission target type
 */
export type PermissionTargetType = 'user' | 'email' | 'public' | 'team'

/**
 * Permission target
 */
export interface PermissionTarget {
  type: PermissionTargetType
  value?: string // userId or email
}

/**
 * User context for permission checks
 */
export interface PermissionUserContext {
  userId?: string
  email?: string
  isTeamMember?: boolean
}
