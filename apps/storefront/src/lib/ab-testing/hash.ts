/**
 * Consistent hashing for A/B test variant assignment
 *
 * Uses a simple but effective hashing algorithm that produces consistent
 * results for the same input, ensuring visitors always see the same variant.
 */

/**
 * Simple 32-bit FNV-1a hash implementation
 *
 * FNV-1a is fast, has good distribution, and is simple to implement.
 * Perfect for A/B testing where we need consistent bucket assignment.
 *
 * @param input - String to hash
 * @returns 32-bit unsigned integer hash
 */
export function fnv1aHash(input: string): number {
  const FNV_PRIME = 0x01000193
  const FNV_OFFSET_BASIS = 0x811c9dc5

  let hash = FNV_OFFSET_BASIS

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, FNV_PRIME)
  }

  // Convert to unsigned 32-bit
  return hash >>> 0
}

/**
 * Get a consistent bucket (0-99) for a visitor/test combination
 *
 * The bucket determines which variant the visitor sees based on weights.
 *
 * @param visitorId - Unique visitor identifier
 * @param testId - Test identifier
 * @returns Number 0-99 representing the bucket
 */
export function getHashBucket(visitorId: string, testId: string): number {
  // Combine visitor and test ID for consistent per-test bucketing
  const input = `${visitorId}:${testId}`
  const hash = fnv1aHash(input)

  // Map to 0-99 range
  return hash % 100
}

/**
 * Determine variant index based on bucket and variant weights
 *
 * @param bucket - The visitor's bucket (0-99)
 * @param weights - Array of variant weights (must sum to 100)
 * @returns Index of the selected variant
 */
export function getVariantIndex(bucket: number, weights: number[]): number {
  let accumulated = 0

  for (let i = 0; i < weights.length; i++) {
    accumulated += weights[i]
    if (bucket < accumulated) {
      return i
    }
  }

  // Fallback to last variant (should not happen with proper weights)
  return weights.length - 1
}

/**
 * Check if a visitor should be included in a test based on traffic allocation
 *
 * @param visitorId - Unique visitor identifier
 * @param testId - Test identifier
 * @param trafficAllocation - Percentage of traffic to include (0-100)
 * @returns true if visitor should be included in the test
 */
export function isInTrafficAllocation(
  visitorId: string,
  testId: string,
  trafficAllocation: number
): boolean {
  // Use a different salt for traffic allocation to avoid correlation
  const input = `traffic:${visitorId}:${testId}`
  const hash = fnv1aHash(input)
  const bucket = hash % 100

  return bucket < trafficAllocation
}

/**
 * Generate a deterministic visitor ID seed from available identifiers
 *
 * @param identifiers - Object containing potential identifiers
 * @returns Consistent visitor seed
 */
export function generateVisitorSeed(identifiers: {
  userId?: string
  sessionId?: string
  browserFingerprint?: string
}): string {
  // Prefer stable identifiers
  if (identifiers.userId) {
    return `user:${identifiers.userId}`
  }

  if (identifiers.sessionId) {
    return `session:${identifiers.sessionId}`
  }

  if (identifiers.browserFingerprint) {
    return `fp:${identifiers.browserFingerprint}`
  }

  // Fallback to timestamp-based (not ideal but prevents errors)
  return `anon:${Date.now()}`
}
