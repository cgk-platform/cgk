/**
 * Foreign Key Integrity Validation
 *
 * Checks for orphaned records in the destination database where
 * foreign key references point to non-existent parent records.
 */

import { FOREIGN_KEY_RELATIONSHIPS, type MigratableTable } from '../config.js'
import { queryDestination, destinationTableExists } from './db-client.js'
import type {
  ValidationResult,
  ForeignKeyValidationDetails,
} from './types.js'

/**
 * Validate a single foreign key relationship
 */
export async function validateForeignKey(
  childTable: MigratableTable,
  childColumn: string,
  parentTable: MigratableTable,
  parentColumn: string,
  tenantSlug: string
): Promise<ValidationResult> {
  const relationship = `${childTable}.${childColumn} -> ${parentTable}.${parentColumn}`

  // Check if both tables exist
  const [childExists, parentExists] = await Promise.all([
    destinationTableExists(tenantSlug, childTable),
    destinationTableExists(tenantSlug, parentTable),
  ])

  if (!childExists || !parentExists) {
    return {
      type: 'foreign_key',
      table: childTable,
      passed: true,
      message: `Skipped FK check: ${!childExists ? childTable : parentTable} does not exist`,
      details: {
        relationship,
        orphanedCount: 0,
        orphanedIds: [],
        skipped: true,
      },
    }
  }

  // Find orphaned records (child records with no matching parent)
  const orphanedResult = await queryDestination<{ id: string }>(
    tenantSlug,
    `SELECT c.id::text as id
     FROM ${childTable} c
     LEFT JOIN ${parentTable} p ON c.${childColumn}::text = p.${parentColumn}::text
     WHERE c.${childColumn} IS NOT NULL AND p.${parentColumn} IS NULL
     LIMIT 100`
  )

  const orphanedIds = orphanedResult.rows.map((row: { id: string }) => row.id)
  const orphanedCount = orphanedIds.length
  const passed = orphanedCount === 0

  // If we found 100, there might be more
  let countMessage = `${orphanedCount}`
  if (orphanedCount === 100) {
    // Get exact count
    const countResult = await queryDestination<{ count: string }>(
      tenantSlug,
      `SELECT COUNT(*) as count
       FROM ${childTable} c
       LEFT JOIN ${parentTable} p ON c.${childColumn}::text = p.${parentColumn}::text
       WHERE c.${childColumn} IS NOT NULL AND p.${parentColumn} IS NULL`
    )
    countMessage = countResult.rows[0]?.count ?? '100+'
  }

  const details: ForeignKeyValidationDetails = {
    relationship,
    orphanedCount,
    orphanedIds: orphanedIds.slice(0, 10), // Limit to first 10 for readability
  }

  return {
    type: 'foreign_key',
    table: childTable,
    passed,
    message: passed
      ? `FK integrity OK: ${relationship}`
      : `FK violation: ${countMessage} orphaned records in ${relationship}`,
    details,
  }
}

/**
 * Validate all defined foreign key relationships
 */
export async function validateAllForeignKeys(
  tenantSlug: string,
  onProgress?: (relationship: string) => void
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = []

  for (const fk of FOREIGN_KEY_RELATIONSHIPS) {
    const relationship = `${fk.childTable}.${fk.childColumn} -> ${fk.parentTable}.${fk.parentColumn}`

    if (onProgress) {
      onProgress(relationship)
    }

    const result = await validateForeignKey(
      fk.childTable,
      fk.childColumn,
      fk.parentTable,
      fk.parentColumn,
      tenantSlug
    )
    results.push(result)
  }

  return results
}

/**
 * Discover additional foreign key relationships in destination schema
 * This can find FKs that aren't in our hardcoded list
 */
export async function discoverForeignKeys(
  tenantSlug: string
): Promise<
  { childTable: string; childColumn: string; parentTable: string; parentColumn: string }[]
> {
  const schemaName = `tenant_${tenantSlug}`

  const result = await queryDestination<{
    child_table: string
    child_column: string
    parent_table: string
    parent_column: string
  }>(
    tenantSlug,
    `SELECT
       tc.table_name as child_table,
       kcu.column_name as child_column,
       ccu.table_name as parent_table,
       ccu.column_name as parent_column
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
     JOIN information_schema.constraint_column_usage ccu
       ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_schema = $1`,
    [schemaName]
  )

  return result.rows.map((row) => ({
    childTable: row.child_table,
    childColumn: row.child_column,
    parentTable: row.parent_table,
    parentColumn: row.parent_column,
  }))
}

/**
 * Check for circular references that could cause issues
 */
export async function checkCircularReferences(
  tenantSlug: string
): Promise<{ hasCircular: boolean; cycles: string[][] }> {
  const fks = await discoverForeignKeys(tenantSlug)

  // Build adjacency list
  const graph = new Map<string, string[]>()
  for (const fk of fks) {
    if (!graph.has(fk.childTable)) {
      graph.set(fk.childTable, [])
    }
    graph.get(fk.childTable)!.push(fk.parentTable)
  }

  // DFS to find cycles
  const visited = new Set<string>()
  const stack = new Set<string>()
  const cycles: string[][] = []

  function dfs(node: string, path: string[]): void {
    if (stack.has(node)) {
      // Found a cycle
      const cycleStart = path.indexOf(node)
      cycles.push(path.slice(cycleStart).concat(node))
      return
    }

    if (visited.has(node)) {
      return
    }

    visited.add(node)
    stack.add(node)

    const neighbors = graph.get(node) || []
    for (const neighbor of neighbors) {
      dfs(neighbor, [...path, node])
    }

    stack.delete(node)
  }

  for (const table of graph.keys()) {
    dfs(table, [])
  }

  return {
    hasCircular: cycles.length > 0,
    cycles,
  }
}

/**
 * Generate a summary of foreign key validation results
 */
export function summarizeForeignKeyResults(results: ValidationResult[]): {
  totalChecks: number
  passedChecks: number
  failedChecks: number
  totalOrphanedRecords: number
  violatedRelationships: string[]
} {
  let passedChecks = 0
  let failedChecks = 0
  let totalOrphanedRecords = 0
  const violatedRelationships: string[] = []

  for (const result of results) {
    const details = result.details as ForeignKeyValidationDetails & {
      skipped?: boolean
    }

    if (details.skipped) {
      continue
    }

    if (result.passed) {
      passedChecks++
    } else {
      failedChecks++
      totalOrphanedRecords += details.orphanedCount
      violatedRelationships.push(details.relationship)
    }
  }

  return {
    totalChecks: results.length,
    passedChecks,
    failedChecks,
    totalOrphanedRecords,
    violatedRelationships,
  }
}
