/**
 * @cgk-platform/db/migrations - Node.js only migration utilities
 *
 * WARNING: This entry point uses Node.js fs/path modules.
 * DO NOT import from middleware or Edge Runtime code.
 *
 * @example
 * ```typescript
 * // In CLI/API routes (Node.js Runtime) - OK
 * import { runPublicMigrations, createTenantSchema } from '@cgk-platform/db/migrations'
 *
 * // In middleware (Edge Runtime) - BREAKS
 * import { runPublicMigrations } from '@cgk-platform/db/migrations' // ❌ NEVER
 * ```
 */

// Types (Edge-safe, re-exported for convenience)
export type {
  Migration,
  MigrationOptions,
  MigrationRecord,
  MigrationResult,
  SchemaType,
} from './migrations/types.js'

// Loader (Node.js only - uses fs/path)
export {
  loadMigrations,
  loadPublicMigrations,
  loadTenantMigrations,
} from './migrations/loader.js'

// Runner (Node.js only - depends on loader)
export {
  createTenantSchema,
  getMigrationStatus,
  runPublicMigrations,
  runTenantMigrations,
  tenantSchemaExists,
} from './migrations/runner.js'
