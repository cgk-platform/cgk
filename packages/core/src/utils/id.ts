/**
 * Generate unique IDs with optional prefixes
 *
 * @ai-pattern id-generation
 * @ai-required Use for generating unique identifiers
 *
 * @example
 * ```ts
 * createId() // 'ckl3j2k4m0000'
 * createId('usr') // 'usr_ckl3j2k4m0000'
 * createId('ord') // 'ord_ckl3j2k4m0000'
 * ```
 */
export function createId(prefix?: string): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  const id = `${timestamp}${random}`
  return prefix ? `${prefix}_${id}` : id
}
