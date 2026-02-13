/**
 * Database Client for Migration Validation
 *
 * Provides separate connections to the source (RAWDOG) and
 * destination (CGK) databases for comparison queries.
 */

import pg from 'pg'
import { getConnectionUrl } from '../config.js'

const { Pool } = pg

let sourcePool: pg.Pool | null = null
let destinationPool: pg.Pool | null = null

/**
 * Get or create the source database pool (RAWDOG)
 */
export function getSourcePool(): pg.Pool {
  if (!sourcePool) {
    const connectionString = getConnectionUrl('source')
    if (!connectionString) {
      throw new Error(
        'RAWDOG_POSTGRES_URL environment variable is not set. This is required for migration validation.'
      )
    }
    sourcePool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  }
  return sourcePool
}

/**
 * Get or create the destination database pool (CGK)
 */
export function getDestinationPool(): pg.Pool {
  if (!destinationPool) {
    const connectionString = getConnectionUrl('destination')
    if (!connectionString) {
      throw new Error(
        'POSTGRES_URL environment variable is not set. This is required for migration validation.'
      )
    }
    destinationPool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  }
  return destinationPool
}

/**
 * Execute a query on the source database
 */
export async function querySource<T extends pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const pool = getSourcePool()
  return pool.query<T>(text, params)
}

/**
 * Execute a query on the destination database with tenant schema
 */
export async function queryDestination<T extends pg.QueryResultRow>(
  tenantSlug: string,
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const pool = getDestinationPool()
  const schemaName = `tenant_${tenantSlug}`

  // Set search path to tenant schema, then execute query
  const client = await pool.connect()
  try {
    await client.query(`SET search_path TO ${schemaName}, public`)
    return await client.query<T>(text, params)
  } finally {
    // Reset search path and release connection
    await client.query('SET search_path TO public')
    client.release()
  }
}

/**
 * Check if source database is accessible
 */
export async function checkSourceConnection(): Promise<boolean> {
  try {
    const pool = getSourcePool()
    await pool.query('SELECT 1')
    return true
  } catch {
    return false
  }
}

/**
 * Check if destination database is accessible
 */
export async function checkDestinationConnection(): Promise<boolean> {
  try {
    const pool = getDestinationPool()
    await pool.query('SELECT 1')
    return true
  } catch {
    return false
  }
}

/**
 * Check if tenant schema exists in destination database
 */
export async function tenantSchemaExists(tenantSlug: string): Promise<boolean> {
  const pool = getDestinationPool()
  const schemaName = `tenant_${tenantSlug}`

  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS(
      SELECT 1 FROM information_schema.schemata WHERE schema_name = $1
    ) as exists`,
    [schemaName]
  )

  return result.rows[0]?.exists ?? false
}

/**
 * Check if a table exists in the source database
 */
export async function sourceTableExists(tableName: string): Promise<boolean> {
  const pool = getSourcePool()

  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS(
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) as exists`,
    [tableName]
  )

  return result.rows[0]?.exists ?? false
}

/**
 * Check if a table exists in the destination tenant schema
 */
export async function destinationTableExists(
  tenantSlug: string,
  tableName: string
): Promise<boolean> {
  const pool = getDestinationPool()
  const schemaName = `tenant_${tenantSlug}`

  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS(
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = $1 AND table_name = $2
    ) as exists`,
    [schemaName, tableName]
  )

  return result.rows[0]?.exists ?? false
}

/**
 * Close all database connections
 */
export async function closeConnections(): Promise<void> {
  const closePromises: Promise<void>[] = []

  if (sourcePool) {
    closePromises.push(sourcePool.end())
    sourcePool = null
  }

  if (destinationPool) {
    closePromises.push(destinationPool.end())
    destinationPool = null
  }

  await Promise.all(closePromises)
}
