/**
 * Consistent Hashing for Feature Flags
 *
 * Uses SHA-256 for deterministic, stable rollout assignments.
 * Each flag has its own salt to ensure independent rollouts.
 */

import type { FlagVariant } from './types.js'

/**
 * Generate a hash value from 0 to 99 for percentage rollouts
 *
 * @param identifier - User/tenant identifier to hash
 * @param salt - Flag-specific salt for independent rollouts
 * @returns Number from 0 to 99
 */
export async function computeRolloutHash(identifier: string, salt: string): Promise<number> {
  const input = `${salt}:${identifier}`
  const hash = await sha256(input)
  // Use first 8 hex chars (32 bits) and mod 100
  const hashInt = parseInt(hash.substring(0, 8), 16)
  return hashInt % 100
}

/**
 * Synchronous version using simpler hash for performance
 * Uses FNV-1a hash which is fast and has good distribution
 */
export function computeRolloutHashSync(identifier: string, salt: string): number {
  const input = `${salt}:${identifier}`
  const hash = fnv1a(input)
  return Math.abs(hash) % 100
}

/**
 * Select a variant based on weighted distribution
 *
 * @param identifier - User/tenant identifier
 * @param salt - Flag-specific salt
 * @param variants - Array of variants with weights
 * @returns Selected variant key
 */
export async function selectVariant(
  identifier: string,
  salt: string,
  variants: FlagVariant[]
): Promise<string> {
  if (variants.length === 0) {
    throw new Error('Cannot select from empty variants array')
  }

  if (variants.length === 1) {
    return variants[0]!.key
  }

  // Calculate total weight
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0)
  if (totalWeight <= 0) {
    throw new Error('Total variant weight must be greater than 0')
  }

  // Get a hash value from 0 to totalWeight - 1
  const input = `${salt}:variant:${identifier}`
  const hash = await sha256(input)
  const hashInt = parseInt(hash.substring(0, 8), 16)
  const target = hashInt % totalWeight

  // Find the variant
  let cumulative = 0
  for (const variant of variants) {
    cumulative += variant.weight
    if (target < cumulative) {
      return variant.key
    }
  }

  // Fallback to last variant (should never reach here)
  return variants[variants.length - 1]!.key
}

/**
 * Synchronous variant selection using FNV-1a
 */
export function selectVariantSync(
  identifier: string,
  salt: string,
  variants: FlagVariant[]
): string {
  if (variants.length === 0) {
    throw new Error('Cannot select from empty variants array')
  }

  if (variants.length === 1) {
    return variants[0]!.key
  }

  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0)
  if (totalWeight <= 0) {
    throw new Error('Total variant weight must be greater than 0')
  }

  const input = `${salt}:variant:${identifier}`
  const hash = fnv1a(input)
  const target = Math.abs(hash) % totalWeight

  let cumulative = 0
  for (const variant of variants) {
    cumulative += variant.weight
    if (target < cumulative) {
      return variant.key
    }
  }

  return variants[variants.length - 1]!.key
}

/**
 * Generate a random salt for a new flag
 */
export function generateFlagSalt(): string {
  const array = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * SHA-256 hash function
 */
async function sha256(message: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // Web Crypto API (browser/edge runtime)
    const msgBuffer = new TextEncoder().encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  // Fallback to Node.js crypto
  const nodeCrypto = await import('crypto')
  return nodeCrypto.createHash('sha256').update(message).digest('hex')
}

/**
 * FNV-1a hash - fast, simple, good distribution
 * 32-bit version for sync operations
 */
function fnv1a(str: string): number {
  let hash = 0x811c9dc5 // FNV offset basis

  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    // FNV prime * hash using bit operations
    // 0x01000193 = 16777619
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }

  return hash >>> 0 // Convert to unsigned 32-bit integer
}

/**
 * Check if an identifier falls within a percentage rollout
 *
 * @param identifier - User/tenant identifier
 * @param salt - Flag-specific salt
 * @param percentage - Rollout percentage (0-100)
 * @returns true if identifier should be included in rollout
 */
export function isInRollout(identifier: string, salt: string, percentage: number): boolean {
  if (percentage <= 0) return false
  if (percentage >= 100) return true

  const hash = computeRolloutHashSync(identifier, salt)
  return hash < percentage
}

/**
 * Check if an identifier falls within a percentage rollout (async)
 */
export async function isInRolloutAsync(
  identifier: string,
  salt: string,
  percentage: number
): Promise<boolean> {
  if (percentage <= 0) return false
  if (percentage >= 100) return true

  const hash = await computeRolloutHash(identifier, salt)
  return hash < percentage
}
