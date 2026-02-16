/**
 * Multi-Layer Caching for Feature Flags
 *
 * - Memory cache: 10 second TTL
 * - Redis cache: 60 second TTL
 * - Pub/sub for cross-instance invalidation
 */

import type { FeatureFlag, FlagOverride } from './types.js'

/**
 * Cache configuration
 */
export interface FlagCacheConfig {
  /** Memory cache TTL in milliseconds (default: 10000 = 10s) */
  memoryTtlMs?: number
  /** Redis cache TTL in seconds (default: 60) */
  redisTtlSeconds?: number
  /** Redis URL for cache and pub/sub */
  redisUrl?: string
  /** Redis REST API URL (Upstash) */
  redisRestUrl?: string
  /** Redis REST API token (Upstash) */
  redisRestToken?: string
}

/**
 * Memory cache entry
 */
interface MemoryCacheEntry<T> {
  value: T
  expiresAt: number
}

/**
 * In-memory cache with TTL
 */
class MemoryCache {
  private cache = new Map<string, MemoryCacheEntry<unknown>>()
  private ttlMs: number

  constructor(ttlMs: number = 10000) {
    this.ttlMs = ttlMs
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }

    return entry.value as T
  }

  set<T>(key: string, value: T): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    })
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }
}

/**
 * Redis cache layer using Upstash REST API
 */
class RedisCache {
  private baseUrl: string
  private token: string
  private ttlSeconds: number

  constructor(baseUrl: string, token: string, ttlSeconds: number = 60) {
    this.baseUrl = baseUrl
    this.token = token
    this.ttlSeconds = ttlSeconds
  }

  private async command<T>(args: (string | number)[]): Promise<T | null> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(args),
      })

      if (!response.ok) {
        console.error(`Redis command failed: ${response.statusText}`)
        return null
      }

      const data = (await response.json()) as { result: T }
      return data.result
    } catch (error) {
      console.error('Redis command error:', error)
      return null
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    const result = await this.command<string | null>(['GET', key])
    if (result === null) return undefined

    try {
      const parsed: unknown = JSON.parse(result)
      return parsed as T
    } catch {
      // If parsing fails, return the raw string as the value
      return result as unknown as T
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const serialized = JSON.stringify(value)
    await this.command(['SET', key, serialized, 'EX', this.ttlSeconds])
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.command<number>(['DEL', key])
    return result !== null && result > 0
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.command(['PUBLISH', channel, message])
  }
}

/**
 * Flag cache interface
 */
export interface FlagCache {
  /** Get a flag by key */
  getFlag(key: string): Promise<FeatureFlag | undefined>
  /** Get all flags */
  getAllFlags(): Promise<FeatureFlag[]>
  /** Get overrides for a flag */
  getOverrides(flagKey: string): Promise<FlagOverride[]>
  /** Set a flag in cache */
  setFlag(flag: FeatureFlag): Promise<void>
  /** Set all flags in cache */
  setAllFlags(flags: FeatureFlag[]): Promise<void>
  /** Set overrides for a flag */
  setOverrides(flagKey: string, overrides: FlagOverride[]): Promise<void>
  /** Invalidate a flag */
  invalidateFlag(key: string): Promise<void>
  /** Invalidate all flags */
  invalidateAll(): Promise<void>
  /** Subscribe to invalidation events */
  onInvalidation(callback: (flagKey: string | null) => void): void
  /** Cache hit statistics */
  getStats(): CacheStats
}

/**
 * Cache statistics
 */
export interface CacheStats {
  memoryHits: number
  memoryMisses: number
  redisHits: number
  redisMisses: number
  totalRequests: number
}

/**
 * Invalidation callback type
 */
type InvalidationCallback = (flagKey: string | null) => void

/**
 * Flag cache implementation with multi-layer caching
 */
export class MultiLayerFlagCache implements FlagCache {
  private memoryCache: MemoryCache
  private redisCache: RedisCache | null = null
  private invalidationCallbacks: InvalidationCallback[] = []
  private stats: CacheStats = {
    memoryHits: 0,
    memoryMisses: 0,
    redisHits: 0,
    redisMisses: 0,
    totalRequests: 0,
  }

  // Cache keys
  private readonly FLAG_PREFIX = 'feature-flags:flag:'
  private readonly ALL_FLAGS_KEY = 'feature-flags:all'
  private readonly OVERRIDES_PREFIX = 'feature-flags:overrides:'
  private readonly INVALIDATION_CHANNEL = 'feature-flags:invalidate'

  constructor(config: FlagCacheConfig = {}) {
    this.memoryCache = new MemoryCache(config.memoryTtlMs || 10000)

    // Initialize Redis if configured
    const redisRestUrl =
      config.redisRestUrl || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
    const redisRestToken =
      config.redisRestToken || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

    if (redisRestUrl && redisRestToken) {
      this.redisCache = new RedisCache(redisRestUrl, redisRestToken, config.redisTtlSeconds || 60)
    }

    // Periodic cleanup of memory cache
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.memoryCache.cleanup(), 30000)
    }
  }

  async getFlag(key: string): Promise<FeatureFlag | undefined> {
    this.stats.totalRequests++
    const cacheKey = `${this.FLAG_PREFIX}${key}`

    // Try memory cache first
    const memoryResult = this.memoryCache.get<FeatureFlag>(cacheKey)
    if (memoryResult) {
      this.stats.memoryHits++
      return memoryResult
    }
    this.stats.memoryMisses++

    // Try Redis cache
    if (this.redisCache) {
      const redisResult = await this.redisCache.get<FeatureFlag>(cacheKey)
      if (redisResult) {
        this.stats.redisHits++
        // Populate memory cache
        this.memoryCache.set(cacheKey, redisResult)
        return redisResult
      }
      this.stats.redisMisses++
    }

    return undefined
  }

  async getAllFlags(): Promise<FeatureFlag[]> {
    this.stats.totalRequests++

    // Try memory cache first
    const memoryResult = this.memoryCache.get<FeatureFlag[]>(this.ALL_FLAGS_KEY)
    if (memoryResult) {
      this.stats.memoryHits++
      return memoryResult
    }
    this.stats.memoryMisses++

    // Try Redis cache
    if (this.redisCache) {
      const redisResult = await this.redisCache.get<FeatureFlag[]>(this.ALL_FLAGS_KEY)
      if (redisResult) {
        this.stats.redisHits++
        // Populate memory cache
        this.memoryCache.set(this.ALL_FLAGS_KEY, redisResult)
        return redisResult
      }
      this.stats.redisMisses++
    }

    return []
  }

  async getOverrides(flagKey: string): Promise<FlagOverride[]> {
    const cacheKey = `${this.OVERRIDES_PREFIX}${flagKey}`

    // Try memory cache first
    const memoryResult = this.memoryCache.get<FlagOverride[]>(cacheKey)
    if (memoryResult) {
      return memoryResult
    }

    // Try Redis cache
    if (this.redisCache) {
      const redisResult = await this.redisCache.get<FlagOverride[]>(cacheKey)
      if (redisResult) {
        this.memoryCache.set(cacheKey, redisResult)
        return redisResult
      }
    }

    return []
  }

  async setFlag(flag: FeatureFlag): Promise<void> {
    const cacheKey = `${this.FLAG_PREFIX}${flag.key}`

    // Set in memory cache
    this.memoryCache.set(cacheKey, flag)

    // Set in Redis cache
    if (this.redisCache) {
      await this.redisCache.set(cacheKey, flag)
    }

    // Invalidate all flags cache since it's now stale
    this.memoryCache.delete(this.ALL_FLAGS_KEY)
    if (this.redisCache) {
      await this.redisCache.delete(this.ALL_FLAGS_KEY)
    }
  }

  async setAllFlags(flags: FeatureFlag[]): Promise<void> {
    // Set in memory cache
    this.memoryCache.set(this.ALL_FLAGS_KEY, flags)

    // Also set individual flags
    for (const flag of flags) {
      const cacheKey = `${this.FLAG_PREFIX}${flag.key}`
      this.memoryCache.set(cacheKey, flag)
    }

    // Set in Redis cache
    if (this.redisCache) {
      await this.redisCache.set(this.ALL_FLAGS_KEY, flags)
      for (const flag of flags) {
        const cacheKey = `${this.FLAG_PREFIX}${flag.key}`
        await this.redisCache.set(cacheKey, flag)
      }
    }
  }

  async setOverrides(flagKey: string, overrides: FlagOverride[]): Promise<void> {
    const cacheKey = `${this.OVERRIDES_PREFIX}${flagKey}`

    this.memoryCache.set(cacheKey, overrides)

    if (this.redisCache) {
      await this.redisCache.set(cacheKey, overrides)
    }
  }

  async invalidateFlag(key: string): Promise<void> {
    const cacheKey = `${this.FLAG_PREFIX}${key}`
    const overridesCacheKey = `${this.OVERRIDES_PREFIX}${key}`

    // Clear from memory
    this.memoryCache.delete(cacheKey)
    this.memoryCache.delete(overridesCacheKey)
    this.memoryCache.delete(this.ALL_FLAGS_KEY)

    // Clear from Redis
    if (this.redisCache) {
      await this.redisCache.delete(cacheKey)
      await this.redisCache.delete(overridesCacheKey)
      await this.redisCache.delete(this.ALL_FLAGS_KEY)

      // Publish invalidation event
      await this.redisCache.publish(this.INVALIDATION_CHANNEL, key)
    }

    // Notify local callbacks
    this.notifyInvalidation(key)
  }

  async invalidateAll(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear()

    // Publish invalidation event for all
    if (this.redisCache) {
      await this.redisCache.publish(this.INVALIDATION_CHANNEL, '*')
    }

    // Notify local callbacks
    this.notifyInvalidation(null)
  }

  onInvalidation(callback: InvalidationCallback): void {
    this.invalidationCallbacks.push(callback)
  }

  private notifyInvalidation(flagKey: string | null): void {
    for (const callback of this.invalidationCallbacks) {
      try {
        callback(flagKey)
      } catch (error) {
        console.error('Error in invalidation callback:', error)
      }
    }
  }

  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      memoryHits: 0,
      memoryMisses: 0,
      redisHits: 0,
      redisMisses: 0,
      totalRequests: 0,
    }
  }
}

/**
 * Create a flag cache instance
 */
export function createFlagCache(config?: FlagCacheConfig): FlagCache {
  return new MultiLayerFlagCache(config)
}

/**
 * Global flag cache instance (singleton)
 */
let globalCache: FlagCache | null = null

/**
 * Get or create the global flag cache
 */
export function getGlobalFlagCache(config?: FlagCacheConfig): FlagCache {
  if (!globalCache) {
    globalCache = createFlagCache(config)
  }
  return globalCache
}

/**
 * Reset the global cache (for testing)
 */
export function resetGlobalFlagCache(): void {
  globalCache = null
}
