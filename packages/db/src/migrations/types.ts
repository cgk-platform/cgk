/**
 * Migration type definitions
 */

/**
 * Represents a database migration
 */
export interface Migration {
  /** Migration version number (extracted from filename, e.g., 001, 002) */
  version: number
  /** Migration name (extracted from filename, e.g., "platform_config") */
  name: string
  /** Full filename (e.g., "001_platform_config.sql") */
  filename: string
  /** SQL content to execute */
  sql: string
}

/**
 * Result of applying a migration
 */
export interface MigrationResult {
  /** Migration that was applied */
  migration: Migration
  /** Whether the migration was successful */
  success: boolean
  /** Error message if failed */
  error?: string
  /** Duration in milliseconds */
  durationMs: number
}

/**
 * Record stored in schema_migrations table
 */
export interface MigrationRecord {
  version: number
  name: string
  applied_at: Date
}

/**
 * Options for running migrations
 */
export interface MigrationOptions {
  /** Run in dry-run mode (don't actually apply) */
  dryRun?: boolean
  /** Target version to migrate to (default: latest) */
  targetVersion?: number
  /** Callback for progress updates */
  onProgress?: (migration: Migration, status: 'pending' | 'running' | 'complete' | 'error') => void
}

/**
 * Schema type for migrations
 */
export type SchemaType = 'public' | 'tenant'
