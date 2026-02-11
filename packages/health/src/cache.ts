/**
 * Health check caching with tier-based TTLs
 *
 * Uses Redis when available, falls back to in-memory cache.
 */

import type { HealthCheckResult, ServiceTier } from './types.js'

/**
 * Cache TTLs by service tier (in seconds)
 */
export const CACHE_TTL: Record<ServiceTier, number> = {
  critical: 30,
  core: 120,
  integrations: 300,
  external: 600,
}

/**
 * In-memory cache for development/fallback
 */
const memoryCache = new Map<string, { value: string; expiresAt: number }>()

/**
 * Get Redis client if available
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
async function redisCommand<T>(args: (string | number)[]): Promise<T> {
  const config = getRedisConfig()
  if (!config) {
    throw new Error('Redis not configured')
  }

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
 * Build cache key for health result
 */
function buildHealthKey(service: string, tenantId?: string): string {
  return tenantId
    ? `health:${service}:${tenantId}`
    : `health:${service}:platform`
}

/**
 * Cache a health check result
 */
export async function cacheHealthResult(
  service: string,
  tenantId: string | undefined,
  tier: ServiceTier,
  result: HealthCheckResult
): Promise<void> {
  const key = buildHealthKey(service, tenantId)
  const ttl = CACHE_TTL[tier]
  const value = JSON.stringify({
    ...result,
    cachedAt: new Date().toISOString(),
  })

  const config = getRedisConfig()
  if (config) {
    await redisCommand(['SET', key, value, 'EX', ttl])
  } else {
    memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    })
  }
}

/**
 * Get cached health result
 */
export async function getCachedHealth(
  service: string,
  tenantId?: string
): Promise<(HealthCheckResult & { cachedAt: string }) | null> {
  const key = buildHealthKey(service, tenantId)

  const config = getRedisConfig()
  if (config) {
    const result = await redisCommand<string | null>(['GET', key])
    if (!result) return null
    try {
      return JSON.parse(result) as HealthCheckResult & { cachedAt: string }
    } catch {
      return null
    }
  }

  const entry = memoryCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key)
    return null
  }
  try {
    return JSON.parse(entry.value) as HealthCheckResult & { cachedAt: string }
  } catch {
    return null
  }
}

/**
 * Invalidate cached health result (e.g., on threshold breach)
 */
export async function invalidateHealthCache(
  service: string,
  tenantId?: string
): Promise<void> {
  const key = buildHealthKey(service, tenantId)

  const config = getRedisConfig()
  if (config) {
    await redisCommand(['DEL', key])
  } else {
    memoryCache.delete(key)
  }
}

/**
 * Build key for last run time tracking
 */
function buildLastRunKey(service: string): string {
  return `health:lastrun:${service}`
}

/**
 * Track when a service was last checked
 */
export async function setLastRunTime(service: string, timestamp: number): Promise<void> {
  const key = buildLastRunKey(service)
  const value = timestamp.toString()

  const config = getRedisConfig()
  if (config) {
    await redisCommand(['SET', key, value])
  } else {
    memoryCache.set(key, { value, expiresAt: Date.now() + 3600000 })
  }
}

/**
 * Get when a service was last checked
 */
export async function getLastRunTime(service: string): Promise<number> {
  const key = buildLastRunKey(service)

  const config = getRedisConfig()
  if (config) {
    const result = await redisCommand<string | null>(['GET', key])
    return result ? parseInt(result, 10) : 0
  }

  const entry = memoryCache.get(key)
  return entry ? parseInt(entry.value, 10) : 0
}

/**
 * Store consecutive failure count for a service
 */
export async function setConsecutiveFailures(
  service: string,
  tenantId: string | undefined,
  count: number
): Promise<void> {
  const key = tenantId
    ? `health:failures:${service}:${tenantId}`
    : `health:failures:${service}:platform`

  const config = getRedisConfig()
  if (config) {
    await redisCommand(['SET', key, count.toString(), 'EX', 3600])
  } else {
    memoryCache.set(key, {
      value: count.toString(),
      expiresAt: Date.now() + 3600000,
    })
  }
}

/**
 * Get consecutive failure count for a service
 */
export async function getConsecutiveFailures(
  service: string,
  tenantId?: string
): Promise<number> {
  const key = tenantId
    ? `health:failures:${service}:${tenantId}`
    : `health:failures:${service}:platform`

  const config = getRedisConfig()
  if (config) {
    const result = await redisCommand<string | null>(['GET', key])
    return result ? parseInt(result, 10) : 0
  }

  const entry = memoryCache.get(key)
  return entry ? parseInt(entry.value, 10) : 0
}

/**
 * Clear memory cache (for testing)
 */
export function clearMemoryCache(): void {
  memoryCache.clear()
}
