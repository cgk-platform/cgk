/**
 * @cgk-platform/auth/node - Node.js-only auth utilities
 *
 * This entry point exports utilities that depend on Node.js-only
 * modules (bcryptjs). Do NOT import from Edge Runtime or middleware.
 *
 * @example
 * ```ts
 * import { hashPassword, verifyPassword } from '@cgk-platform/auth/node'
 * ```
 */
export { hashPassword, verifyPassword } from './password'
