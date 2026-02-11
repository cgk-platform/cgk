/**
 * Database (PostgreSQL) health monitor
 *
 * Checks database connectivity and performance metrics.
 */

import { sql } from '@cgk/db'

import { evaluateLatencyHealth } from '../evaluator.js'
import type { HealthCheckResult, HealthMonitor } from '../types.js'

/**
 * Pool statistics from pg_stat_activity
 */
interface PoolStats {
  active: number
  idle: number
  waiting: number
  total: number
}

/**
 * Get database connection pool statistics
 */
async function getPoolStats(): Promise<PoolStats> {
  try {
    const result = await sql<{
      state: string
      count: string
    }>`
      SELECT state, count(*)::text as count
      FROM pg_stat_activity
      WHERE datname = current_database()
      GROUP BY state
    `

    let active = 0
    let idle = 0
    let waiting = 0

    for (const row of result.rows) {
      const count = parseInt(row.count, 10)
      switch (row.state) {
        case 'active':
          active = count
          break
        case 'idle':
          idle = count
          break
        case 'idle in transaction':
        case 'idle in transaction (aborted)':
          waiting += count
          break
      }
    }

    return {
      active,
      idle,
      waiting,
      total: active + idle + waiting,
    }
  } catch {
    return { active: 0, idle: 0, waiting: 0, total: 0 }
  }
}

/**
 * Check database health with optional tenant context
 */
export async function checkDatabase(tenantId?: string): Promise<HealthCheckResult> {
  const startTime = Date.now()

  try {
    if (tenantId) {
      // Tenant-specific check: verify tenant schema exists and is accessible
      const schemaName = `tenant_${tenantId}`
      const result = await sql<{ exists: boolean }>`
        SELECT EXISTS(
          SELECT 1 FROM information_schema.schemata
          WHERE schema_name = ${schemaName}
        ) as exists
      `

      if (!result.rows[0]?.exists) {
        return {
          status: 'unhealthy',
          latencyMs: Date.now() - startTime,
          details: {
            error: `Tenant schema ${schemaName} does not exist`,
            tenantId,
          },
        }
      }

      // Quick query in tenant schema
      await sql`
        SELECT set_config('search_path', ${`${schemaName}, public`}, true)
      `
      await sql`SELECT 1`
      await sql`SELECT set_config('search_path', 'public', true)`
    } else {
      // Platform check: query the organizations table
      await sql`SELECT 1 FROM public.organizations LIMIT 1`
    }

    const latencyMs = Date.now() - startTime
    const poolStats = await getPoolStats()
    const status = evaluateLatencyHealth(latencyMs, 100, 500)

    return {
      status,
      latencyMs,
      details: {
        poolSize: poolStats.total,
        activeConnections: poolStats.active,
        idleConnections: poolStats.idle,
        waitingQueries: poolStats.waiting,
        ...(tenantId && { tenantId }),
      },
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        ...(tenantId && { tenantId }),
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Database health monitor configuration
 */
export const databaseMonitor: HealthMonitor = {
  name: 'database',
  tier: 'critical',
  check: checkDatabase,
  requiresTenant: false,
}
