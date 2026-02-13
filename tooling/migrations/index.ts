/**
 * Migration Tooling Index
 *
 * Exports all validation utilities for programmatic use.
 */

// Configuration
export {
  BATCH_SIZE,
  VALIDATION_SAMPLE_SIZE,
  TABLE_MIGRATION_ORDER,
  FINANCIAL_TABLES,
  FOREIGN_KEY_RELATIONSHIPS,
  DB_CONNECTIONS,
  getConnectionUrl,
  validateEnvironment,
  type MigratableTable,
} from './config.js'

// Types
export type {
  ValidationResult,
  ValidationReport,
  ValidationOptions,
  CountValidationDetails,
  SumValidationDetails,
  SampleValidationDetails,
  SampleMismatch,
  ForeignKeyValidationDetails,
  DatabaseRow,
  ProgressCallback,
} from './lib/types.js'

// Database client
export {
  getSourcePool,
  getDestinationPool,
  querySource,
  queryDestination,
  checkSourceConnection,
  checkDestinationConnection,
  tenantSchemaExists,
  sourceTableExists,
  destinationTableExists,
  closeConnections,
} from './lib/db-client.js'

// Validation functions
export {
  validateTableCount,
  validateAllCounts,
  summarizeCountResults,
} from './lib/validate-count.js'

export {
  validateColumnSum,
  validateAllSums,
  summarizeSumResults,
} from './lib/validate-sum.js'

export {
  validateTableSample,
  validateAllSamples,
  summarizeSampleResults,
} from './lib/validate-sample.js'

export {
  validateForeignKey,
  validateAllForeignKeys,
  discoverForeignKeys,
  checkCircularReferences,
  summarizeForeignKeyResults,
} from './lib/validate-fk.js'
