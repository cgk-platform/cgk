/**
 * Redis health monitor
 *
 * Checks Redis connectivity and memory/performance metrics.
 */

import type { HealthCheckResult, HealthMonitor, HealthStatus } from '../types.js'

/**
 * Get Redis configuration from environment
 */
function getRedisConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return { url, token }
}

/**
 * Execute Redis command via REST API
 */
async function redisCommand<T>(
  config: { url: string; token: string },
  args: string[]
): Promise<T> {
  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  })

  if (!response.ok) {
    throw new Error(`Redis command failed: ${response.statusText}`)
  }

  const data = (await response.json()) as { result: T }
  return data.result
}

/**
 * Parse Redis INFO response to extract a specific field
 */
function parseRedisInfo(info: string, field: string): number {
  const regex = new RegExp(`${field}:(\\d+)`)
  const match = info.match(regex)
  return match ? parseInt(match[1] ?? '0', 10) : 0
}

/**
 * Determine health status based on memory usage percentage
 */
function getMemoryHealthStatus(memoryPercent: number): HealthStatus {
  if (memoryPercent < 70) return 'healthy'
  if (memoryPercent < 90) return 'degraded'
  return 'unhealthy'
}

/**
 * Check Redis health
 */
export async function checkRedis(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  const config = getRedisConfig()

  if (!config) {
    return {
      status: 'unknown',
      latencyMs: 0,
      details: {
        error: 'Redis not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN.',
      },
    }
  }

  try {
    // Ping test
    await redisCommand(config, ['PING'])

    // Get server info
    const info = await redisCommand<string>(config, ['INFO'])

    const memoryUsage = parseRedisInfo(info, 'used_memory')
    const maxMemory = parseRedisInfo(info, 'maxmemory')
    const connectedClients = parseRedisInfo(info, 'connected_clients')
    const evictedKeys = parseRedisInfo(info, 'evicted_keys')
    const hitRate = parseRedisInfo(info, 'keyspace_hits')
    const missRate = parseRedisInfo(info, 'keyspace_misses')

    const latencyMs = Date.now() - startTime

    // Calculate memory percentage (0 if maxmemory not set)
    const memoryPercent = maxMemory > 0 ? (memoryUsage / maxMemory) * 100 : 0

    // Calculate hit rate percentage
    const totalOps = hitRate + missRate
    const hitRatePercent = totalOps > 0 ? (hitRate / totalOps) * 100 : 100

    const status = getMemoryHealthStatus(memoryPercent)

    return {
      status,
      latencyMs,
      details: {
        memoryUsedMB: Math.round(memoryUsage / 1024 / 1024),
        memoryPercent: Math.round(memoryPercent * 100) / 100,
        maxMemoryMB: maxMemory > 0 ? Math.round(maxMemory / 1024 / 1024) : 'unlimited',
        connectedClients,
        evictedKeys,
        hitRatePercent: Math.round(hitRatePercent * 100) / 100,
      },
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Redis health monitor configuration
 */
export const redisMonitor: HealthMonitor = {
  name: 'redis',
  tier: 'critical',
  check: checkRedis,
  requiresTenant: false,
}
