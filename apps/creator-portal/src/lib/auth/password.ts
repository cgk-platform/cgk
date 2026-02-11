/**
 * Password hashing utilities for creator authentication
 * Uses bcrypt with 12 rounds for secure password storage
 */

import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12
const MIN_PASSWORD_LENGTH = 8

/**
 * Hash a password using bcrypt
 *
 * @param password - Plain text password to hash
 * @returns Promise resolving to the hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  }
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a password against a hash
 *
 * @param password - Plain text password to verify
 * @param hash - Bcrypt hash to verify against
 * @returns Promise resolving to true if password matches, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Check if a password meets minimum requirements
 *
 * @param password - Password to validate
 * @returns Object with isValid flag and any error message
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password) {
    return { isValid: false, error: 'Password is required' }
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      isValid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    }
  }

  // Additional strength checks can be added here
  // For now, just checking minimum length

  return { isValid: true }
}
