/**
 * Log retention management
 *
 * Defines cleanup jobs for enforcing retention policies per log level.
 */

import { LOG_RETENTION_DAYS } from './types.js'

/** Job definition for log cleanup */
export interface CleanupJobConfig {
  name: string
  schedule: string // cron expression
  handler: () => Promise<CleanupResult>
}

/** Result of a cleanup operation */
export interface CleanupResult {
  deletedCount: number
  oldestDeleted: Date | null
  duration: number // milliseconds
  partitionsDropped: string[]
}

/**
 * Delete old logs based on retention policy
 */
export async function cleanupLogsByRetention(): Promise<CleanupResult> {
  const { sql } = await import('@cgk-platform/db')

  const startTime = Date.now()
  let totalDeleted = 0
  let oldestDeleted: Date | null = null

  // Delete logs for each level based on retention
  for (const [level, days] of Object.entries(LOG_RETENTION_DAYS)) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    // Get oldest before deletion
    const oldest = await sql`
      SELECT MIN(timestamp) as oldest
      FROM platform_logs
      WHERE level = ${level}
        AND timestamp < ${cutoffDate.toISOString()}
    `

    if (oldest.rows[0]?.oldest && !oldestDeleted) {
      oldestDeleted = new Date(oldest.rows[0].oldest as string)
    }

    // Delete in batches to avoid long-running transactions
    let deleted = 0
    let batchDeleted = 1

    while (batchDeleted > 0) {
      const result = await sql`
        DELETE FROM platform_logs
        WHERE id IN (
          SELECT id FROM platform_logs
          WHERE level = ${level}
            AND timestamp < ${cutoffDate.toISOString()}
          LIMIT 1000
        )
      `

      batchDeleted = result.rowCount ?? 0
      deleted += batchDeleted
    }

    totalDeleted += deleted
  }

  return {
    deletedCount: totalDeleted,
    oldestDeleted,
    duration: Date.now() - startTime,
    partitionsDropped: [], // Partition management is separate
  }
}

/**
 * Drop old partitions (older than 90 days)
 */
export async function dropOldPartitions(): Promise<string[]> {
  const { sql } = await import('@cgk-platform/db')

  // Get partitions older than 90 days
  const cutoffDate = new Date()
  cutoffDate.setMonth(cutoffDate.getMonth() - 3) // 3 months ago

  const cutoffYYYYMM = `${cutoffDate.getFullYear()}${String(cutoffDate.getMonth() + 1).padStart(2, '0')}`

  // Find old partitions
  const partitions = await sql`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'platform_logs_p%'
    ORDER BY tablename
  `

  const droppedPartitions: string[] = []

  for (const row of partitions.rows) {
    const tablename = row.tablename as string

    // Extract YYYYMM from partition name (e.g., platform_logs_p202501)
    const match = tablename.match(/platform_logs_p(\d{6})/)
    if (match && match[1]) {
      const partitionYYYYMM = match[1]
      if (partitionYYYYMM < cutoffYYYYMM) {
        // Drop this partition using parameterized query
        // Note: We can't use parameterized identifiers, so we validate the format
        if (/^platform_logs_p\d{6}$/.test(tablename)) {
          await sql`SELECT drop_partition_if_exists(${tablename})`
          droppedPartitions.push(tablename)
        }
      }
    }
  }

  return droppedPartitions
}

/**
 * Create new monthly partition if needed
 */
export async function ensureCurrentPartition(): Promise<string | null> {
  const { sql } = await import('@cgk-platform/db')

  const now = new Date()
  const currentYYYYMM = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const partitionName = `platform_logs_p${currentYYYYMM}`

  // Check if partition exists
  const exists = await sql`
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = ${partitionName}
  `

  if (exists.rows.length > 0) {
    return null // Already exists
  }

  // Create partition for current month using the helper function
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  await sql`SELECT create_platform_logs_partition_for_month(${startDate.toISOString()}, ${endDate.toISOString()}, ${partitionName})`

  return partitionName
}

/**
 * Create next month's partition proactively
 */
export async function ensureNextMonthPartition(): Promise<string | null> {
  const { sql } = await import('@cgk-platform/db')

  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextYYYYMM = `${nextMonth.getFullYear()}${String(nextMonth.getMonth() + 1).padStart(2, '0')}`
  const partitionName = `platform_logs_p${nextYYYYMM}`

  // Check if partition exists
  const exists = await sql`
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = ${partitionName}
  `

  if (exists.rows.length > 0) {
    return null // Already exists
  }

  // Create partition for next month
  const startDate = nextMonth
  const endDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 1)

  await sql`SELECT create_platform_logs_partition_for_month(${startDate.toISOString()}, ${endDate.toISOString()}, ${partitionName})`

  return partitionName
}

/**
 * Get the cleanup job definition for use with @cgk-platform/jobs
 */
export function getCleanupJobDefinition(): CleanupJobConfig {
  return {
    name: 'platform-logs-cleanup',
    schedule: '0 3 * * *', // Daily at 3am
    handler: async () => {
      // Run retention cleanup
      const cleanupResult = await cleanupLogsByRetention()

      // Drop old partitions
      const droppedPartitions = await dropOldPartitions()

      // Ensure current and next month partitions exist
      await ensureCurrentPartition()
      await ensureNextMonthPartition()

      return {
        ...cleanupResult,
        partitionsDropped: droppedPartitions,
      }
    },
  }
}
