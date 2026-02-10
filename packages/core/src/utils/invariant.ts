/**
 * Assert a condition is true, throwing an error if not
 *
 * @ai-pattern assertion
 * @ai-required Use for runtime assertions that should never fail
 *
 * @example
 * ```ts
 * invariant(user !== null, 'User must exist')
 * // user is now narrowed to non-null
 * ```
 */
export function invariant(
  condition: unknown,
  message: string
): asserts condition {
  if (!condition) {
    throw new Error(`Invariant violation: ${message}`)
  }
}
