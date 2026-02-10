/**
 * Tenant-isolated cache utilities
 *
 * Provides a Redis cache wrapper that automatically prefixes all keys
 * with the tenant slug to ensure complete isolation between tenants.
 */

/**
 * Cache entry with optional expiration
 */
export interface CacheEntry<T = unknown> {
  value: T
  expiresAt?: number
}

/**
 * Options for cache operations
 */
export interface CacheOptions {
  /** Time-to-live in seconds */
  ttl?: number
}

/**
 * Tenant-isolated cache interface
 *
 * All operations are automatically scoped to the tenant.
 */
export interface TenantCache {
  /** Tenant slug this cache is scoped to */
  readonly tenantSlug: string

  /** Key prefix used for all operations */
  readonly keyPrefix: string

  /**
   * Get a value from cache
   * @returns The cached value, or undefined if not found/expired
   */
  get<T = unknown>(key: string): Promise<T | undefined>

  /**
   * Set a value in cache
   * @param key - Cache key (will be prefixed with tenant)
   * @param value - Value to cache (must be JSON-serializable)
   * @param options - Cache options (ttl, etc.)
   */
  set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void>

  /**
   * Delete a value from cache
   * @param key - Cache key to delete
   * @returns true if key existed and was deleted
   */
  delete(key: string): Promise<boolean>

  /**
   * Check if a key exists in cache
   */
  exists(key: string): Promise<boolean>

  /**
   * Get the full prefixed key for a cache key
   * Useful for debugging or direct Redis access
   */
  prefixKey(key: string): string

  /**
   * Delete all keys for this tenant
   * WARNING: Use with caution in production
   */
  clear(): Promise<void>
}

/**
 * In-memory cache implementation for development/testing
 */
class InMemoryCache implements TenantCache {
  private cache = new Map<string, CacheEntry>()

  constructor(
    public readonly tenantSlug: string,
    public readonly keyPrefix: string
  ) {}

  prefixKey(key: string): string {
    return `${this.keyPrefix}:${key}`
  }

  async get<T = unknown>(key: string): Promise<T | undefined> {
    const fullKey = this.prefixKey(key)
    const entry = this.cache.get(fullKey)

    if (!entry) {
      return undefined
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(fullKey)
      return undefined
    }

    return entry.value as T
  }

  async set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const fullKey = this.prefixKey(key)
    const entry: CacheEntry = { value }

    if (options?.ttl) {
      entry.expiresAt = Date.now() + options.ttl * 1000
    }

    this.cache.set(fullKey, entry)
  }

  async delete(key: string): Promise<boolean> {
    const fullKey = this.prefixKey(key)
    return this.cache.delete(fullKey)
  }

  async exists(key: string): Promise<boolean> {
    const fullKey = this.prefixKey(key)
    const entry = this.cache.get(fullKey)

    if (!entry) {
      return false
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(fullKey)
      return false
    }

    return true
  }

  async clear(): Promise<void> {
    // Delete all keys with this prefix
    for (const key of this.cache.keys()) {
      if (key.startsWith(this.keyPrefix)) {
        this.cache.delete(key)
      }
    }
  }
}

/**
 * Redis cache implementation using Upstash REST API
 */
class UpstashRedisCache implements TenantCache {
  private baseUrl: string
  private token: string

  constructor(
    public readonly tenantSlug: string,
    public readonly keyPrefix: string
  ) {
    // Support both Vercel's KV_* naming and direct UPSTASH_* naming
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token) {
      throw new Error('KV_REST_API_URL/TOKEN or UPSTASH_REDIS_REST_URL/TOKEN required')
    }

    this.baseUrl = url
    this.token = token
  }

  private async command<T>(args: (string | number)[]): Promise<T> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
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

  prefixKey(key: string): string {
    return `${this.keyPrefix}:${key}`
  }

  async get<T = unknown>(key: string): Promise<T | undefined> {
    const fullKey = this.prefixKey(key)
    const result = await this.command<string | null>(['GET', fullKey])

    if (result === null) {
      return undefined
    }

    try {
      return JSON.parse(result) as T
    } catch {
      return result as unknown as T
    }
  }

  async set<T = unknown>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const fullKey = this.prefixKey(key)
    const serialized = JSON.stringify(value)

    if (options?.ttl) {
      await this.command(['SET', fullKey, serialized, 'EX', options.ttl])
    } else {
      await this.command(['SET', fullKey, serialized])
    }
  }

  async delete(key: string): Promise<boolean> {
    const fullKey = this.prefixKey(key)
    const result = await this.command<number>(['DEL', fullKey])
    return result > 0
  }

  async exists(key: string): Promise<boolean> {
    const fullKey = this.prefixKey(key)
    const result = await this.command<number>(['EXISTS', fullKey])
    return result > 0
  }

  async clear(): Promise<void> {
    // Get all keys matching the prefix
    const pattern = `${this.keyPrefix}:*`
    const keys = await this.command<string[]>(['KEYS', pattern])

    if (keys.length > 0) {
      await this.command(['DEL', ...keys])
    }
  }
}

/**
 * Create a tenant-isolated cache instance
 *
 * Returns a cache that automatically prefixes all keys with the tenant slug,
 * ensuring complete isolation between tenants.
 *
 * @param tenantSlug - Tenant slug for key prefixing
 * @returns TenantCache instance
 *
 * @example
 * ```ts
 * const cache = createTenantCache('rawdog')
 *
 * // Stored as: tenant:rawdog:pricing-config
 * await cache.set('pricing-config', { freeShippingThreshold: 5000 })
 *
 * // Retrieved from: tenant:rawdog:pricing-config
 * const config = await cache.get('pricing-config')
 * ```
 */
export function createTenantCache(tenantSlug: string): TenantCache {
  const keyPrefix = `tenant:${tenantSlug}`

  // Use Upstash if configured, otherwise fall back to in-memory
  // Support both Vercel's KV_* naming and direct UPSTASH_* naming
  const hasRedisConfig =
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

  if (hasRedisConfig) {
    return new UpstashRedisCache(tenantSlug, keyPrefix)
  }

  // Fall back to in-memory cache (for development/testing)
  console.warn(
    `[cache] Using in-memory cache for tenant ${tenantSlug}. Set KV_REST_API_URL for production.`
  )
  return new InMemoryCache(tenantSlug, keyPrefix)
}

/**
 * Create a global (non-tenant-scoped) cache instance
 *
 * Use this for platform-wide caching that doesn't belong to a tenant.
 *
 * @example
 * ```ts
 * const globalCache = createGlobalCache()
 * await globalCache.set('platform-settings', settings)
 * ```
 */
export function createGlobalCache(): TenantCache {
  const keyPrefix = 'platform'

  const hasRedisConfig =
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

  if (hasRedisConfig) {
    return new UpstashRedisCache('_global', keyPrefix)
  }

  return new InMemoryCache('_global', keyPrefix)
}
