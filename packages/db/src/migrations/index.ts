/**
 * Migration system exports
 */

// Types
export type {
  Migration,
  MigrationOptions,
  MigrationRecord,
  MigrationResult,
  SchemaType,
} from './types.js'

// Loader
export { loadMigrations, loadPublicMigrations, loadTenantMigrations } from './loader.js'

// Runner
export {
  createTenantSchema,
  getMigrationStatus,
  runPublicMigrations,
  runTenantMigrations,
  tenantSchemaExists,
} from './runner.js'

// Auto-migration
export {
  autoMigrateAllTenants,
  autoMigrateTenant,
  checkAndMigrate,
  hasPendingMigrations,
} from './auto-migrate.js'
