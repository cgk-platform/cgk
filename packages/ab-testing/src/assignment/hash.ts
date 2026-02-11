/**
 * Consistent Hashing for A/B Test Assignment
 *
 * Uses MurmurHash3 for fast, deterministic visitor assignment.
 * Same visitor + same test = same variant every time.
 */

/**
 * MurmurHash3 32-bit implementation
 * Fast, non-cryptographic hash with excellent distribution
 *
 * @param key - String to hash
 * @param seed - Optional seed for different hash streams
 * @returns 32-bit unsigned integer hash
 */
export function murmurHash3(key: string, seed: number = 0): number {
  const c1 = 0xcc9e2d51
  const c2 = 0x1b873593

  let h1 = seed
  const len = key.length
  let i = 0

  // Process 4-byte chunks
  while (i + 4 <= len) {
    let k1 =
      (key.charCodeAt(i) & 0xff) |
      ((key.charCodeAt(i + 1) & 0xff) << 8) |
      ((key.charCodeAt(i + 2) & 0xff) << 16) |
      ((key.charCodeAt(i + 3) & 0xff) << 24)

    k1 = Math.imul(k1, c1)
    k1 = (k1 << 15) | (k1 >>> 17)
    k1 = Math.imul(k1, c2)

    h1 ^= k1
    h1 = (h1 << 13) | (h1 >>> 19)
    h1 = Math.imul(h1, 5) + 0xe6546b64
    i += 4
  }

  // Process remaining bytes (MurmurHash3 uses intentional fallthrough, rewritten as if-else)
  const remaining = len - i
  let k1 = 0

  if (remaining >= 3) {
    k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16
  }
  if (remaining >= 2) {
    k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8
  }
  if (remaining >= 1) {
    k1 ^= key.charCodeAt(i) & 0xff
    k1 = Math.imul(k1, c1)
    k1 = (k1 << 15) | (k1 >>> 17)
    k1 = Math.imul(k1, c2)
    h1 ^= k1
  }

  // Finalization
  h1 ^= len
  h1 ^= h1 >>> 16
  h1 = Math.imul(h1, 0x85ebca6b)
  h1 ^= h1 >>> 13
  h1 = Math.imul(h1, 0xc2b2ae35)
  h1 ^= h1 >>> 16

  return h1 >>> 0 // Convert to unsigned
}

/**
 * Get a normalized hash value between 0 and 1
 *
 * @param visitorId - Unique visitor identifier
 * @param testId - Test identifier (acts as salt)
 * @returns Number between 0 and 1 (exclusive)
 */
export function getNormalizedHash(visitorId: string, testId: string): number {
  const hash = murmurHash3(`${visitorId}:${testId}`)
  return hash / 0xffffffff
}

/**
 * Get a hash bucket (0-99) for percentage-based allocation
 *
 * @param visitorId - Unique visitor identifier
 * @param testId - Test identifier
 * @returns Number from 0 to 99
 */
export function getHashBucket(visitorId: string, testId: string): number {
  const hash = murmurHash3(`${visitorId}:${testId}`)
  return hash % 100
}

/**
 * Check if visitor is in a percentage rollout
 *
 * @param visitorId - Unique visitor identifier
 * @param testId - Test identifier
 * @param percentage - Rollout percentage (0-100)
 * @returns true if visitor should be included
 */
export function isInPercentage(visitorId: string, testId: string, percentage: number): boolean {
  if (percentage <= 0) return false
  if (percentage >= 100) return true
  return getHashBucket(visitorId, testId) < percentage
}
