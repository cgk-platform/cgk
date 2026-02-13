/**
 * Types for the migration validation system
 */

import type { MigratableTable } from '../config.js'

/**
 * Result of a single validation check
 */
export interface ValidationResult {
  /** Type of validation performed */
  type: 'count' | 'sum' | 'sample' | 'foreign_key'
  /** Table being validated */
  table: MigratableTable | string
  /** Whether validation passed */
  passed: boolean
  /** Human-readable message about the result */
  message: string
  /** Detailed information about the check */
  details: Record<string, unknown>
}

/**
 * Row count validation details
 */
export interface CountValidationDetails {
  sourceCount: number
  destinationCount: number
  difference: number
  [key: string]: unknown
}

/**
 * Financial sum validation details
 */
export interface SumValidationDetails {
  column: string
  sourceSum: bigint | number
  destinationSum: bigint | number
  difference: bigint | number
  /** Sum expressed in human-readable currency format */
  sourceSumFormatted: string
  destinationSumFormatted: string
  [key: string]: unknown
}

/**
 * Sample data validation details
 */
export interface SampleValidationDetails {
  sampleSize: number
  matchedCount: number
  mismatchedCount: number
  mismatches: SampleMismatch[]
  [key: string]: unknown
}

/**
 * Single sample mismatch
 */
export interface SampleMismatch {
  id: string
  column: string
  sourceValue: unknown
  destinationValue: unknown
}

/**
 * Foreign key validation details
 */
export interface ForeignKeyValidationDetails {
  relationship: string
  orphanedCount: number
  orphanedIds: string[]
  [key: string]: unknown
}

/**
 * Overall validation report
 */
export interface ValidationReport {
  /** Timestamp when validation started */
  startedAt: Date
  /** Timestamp when validation completed */
  completedAt: Date
  /** Total duration in milliseconds */
  durationMs: number
  /** Tenant slug being validated */
  tenantSlug: string
  /** All validation results */
  results: ValidationResult[]
  /** Overall pass/fail status */
  passed: boolean
  /** Summary statistics */
  summary: {
    total: number
    passed: number
    failed: number
  }
}

/**
 * Database row type for generic operations
 */
export type DatabaseRow = Record<string, unknown>

/**
 * Options for validation functions
 */
export interface ValidationOptions {
  /** Tenant slug to validate */
  tenantSlug: string
  /** Whether to output verbose logs */
  verbose?: boolean
  /** Tables to validate (defaults to all) */
  tables?: MigratableTable[]
}

/**
 * Progress callback for long-running operations
 */
export type ProgressCallback = (message: string, progress?: number) => void
