/**
 * MCP Rate Limiting
 *
 * Implements sliding window rate limiting for MCP requests with:
 * - Per-tenant rate limiting
 * - Per-tool rate limiting (some tools more expensive)
 * - Redis-backed for distributed rate limiting
 * - Configurable limits via tenant settings
 *
 * Uses Upstash Redis REST API for Edge runtime compatibility.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Rate limit configuration for a tenant
 */
export interface RateLimitConfig {
  /** Maximum requests per window (default: 100) */
  maxRequests: number
  /** Window size in seconds (default: 60) */
  windowSeconds: number
  /** Maximum tokens per minute for expensive operations (default: 1000) */
  maxTokensPerMinute?: number
  /** Tool-specific overrides */
  toolLimits?: Record<string, ToolRateLimit>
}

/**
 * Rate limit configuration for a specific tool
 */
export interface ToolRateLimit {
  /** Maximum calls per window for this tool */
  maxCalls: number
  /** Window size in seconds (default: same as tenant window) */
  windowSeconds?: number
  /** Token cost per call (default: 1) */
  tokenCost?: number
}

/**
 * Result of a rate limit check
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean
  /** Remaining requests in current window */
  remaining: number
  /** Total limit for the window */
  limit: number
  /** Seconds until the window resets */
  resetSeconds: number
  /** Retry after seconds (only if not allowed) */
  retryAfter?: number
  /** Reason for denial (only if not allowed) */
  reason?: string
}

/**
 * Rate limiter interface
 */
export interface RateLimiter {
  /**
   * Check if a request is allowed and consume quota
   *
   * @param tenantId - The tenant ID
   * @param operation - The operation type (e.g., 'tools/call', 'resources/read')
   * @param toolName - Optional tool name for tool-specific limits
   * @returns Rate limit result
   */
  checkAndConsume(
    tenantId: string,
    operation: string,
    toolName?: string
  ): Promise<RateLimitResult>

  /**
   * Get current rate limit status without consuming quota
   *
   * @param tenantId - The tenant ID
   * @param operation - The operation type
   * @returns Current rate limit status
   */
  getStatus(tenantId: string, operation: string): Promise<RateLimitResult>

  /**
   * Get tenant rate limit configuration
   *
   * @param tenantId - The tenant ID
   * @returns Rate limit configuration
   */
  getConfig(tenantId: string): Promise<RateLimitConfig>

  /**
   * Set tenant rate limit configuration
   *
   * @param tenantId - The tenant ID
   * @param config - New rate limit configuration
   */
  setConfig(tenantId: string, config: RateLimitConfig): Promise<void>
}

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default rate limit configuration
 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowSeconds: 60,
  maxTokensPerMinute: 1000,
  toolLimits: {},
}

/**
 * Default tool costs (tokens consumed per call)
 * Higher cost = more "expensive" operations
 */
export const DEFAULT_TOOL_COSTS: Record<string, number> = {
  // Standard tools - low cost
  get_tenant_info: 1,
  ping: 0,

  // Search tools - medium cost
  search_orders: 5,
  search_customers: 5,
  search_products: 5,

  // List tools - low cost
  list_orders: 2,
  list_customers: 2,
  list_products: 2,
  list_creators: 2,

  // Get tools - low cost
  get_order: 1,
  get_customer: 1,
  get_product: 1,
  get_creator: 1,
  get_inventory: 1,

  // Update tools - medium cost
  update_order_status: 3,
  update_product: 3,
  update_inventory: 3,
  sync_product: 5,

  // Analytics tools - high cost
  export_analytics: 20,
  analyze_trends: 15,
  generate_report: 15,

  // Bulk operations - very high cost
  bulk_update: 25,
  import_data: 25,
  sync_inventory: 20,

  // Cancellation - medium cost
  cancel_order: 5,

  // Default for unknown tools
  _default: 2,
}

/**
 * Tools that should have stricter rate limits
 */
export const EXPENSIVE_TOOLS = new Set([
  'export_analytics',
  'analyze_trends',
  'generate_report',
  'bulk_update',
  'import_data',
  'sync_inventory',
])

// =============================================================================
// Redis Rate Limiter Implementation
// =============================================================================

/**
 * Sliding window rate limiter using Redis
 *
 * Uses a sorted set to track requests within the window.
 * Each request is added with the current timestamp as score.
 * Old entries are removed and remaining count is checked.
 */
class RedisRateLimiter implements RateLimiter {
  private baseUrl: string
  private token: string
  private configCache = new Map<string, { config: RateLimitConfig; expiresAt: number }>()
  private readonly CONFIG_CACHE_TTL_MS = 60 * 1000 // 1 minute

  constructor() {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token) {
      throw new Error('Redis not configured. Set KV_REST_API_URL/TOKEN or UPSTASH_REDIS_REST_URL/TOKEN')
    }

    this.baseUrl = url
    this.token = token
  }

  private async redisCommand<T>(args: (string | number)[]): Promise<T> {
    const response = await fetch(this.baseUrl, {
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

  private async redisPipeline(commands: (string | number)[][]): Promise<unknown[]> {
    const response = await fetch(`${this.baseUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    })

    if (!response.ok) {
      throw new Error(`Redis pipeline failed: ${response.statusText}`)
    }

    const data = (await response.json()) as { result: unknown }[]
    return data.map((r) => r.result)
  }

  /**
   * Build the Redis key for rate limiting
   */
  private buildKey(tenantId: string, operation: string, toolName?: string): string {
    const parts = ['mcp', 'ratelimit', tenantId, operation]
    if (toolName) {
      parts.push(toolName)
    }
    return parts.join(':')
  }

  /**
   * Build the config key for tenant settings
   */
  private buildConfigKey(tenantId: string): string {
    return `mcp:ratelimit:config:${tenantId}`
  }

  async checkAndConsume(
    tenantId: string,
    operation: string,
    toolName?: string
  ): Promise<RateLimitResult> {
    const config = await this.getConfig(tenantId)
    const now = Date.now()
    const key = this.buildKey(tenantId, operation, toolName)

    // Determine limit and window for this operation
    let maxRequests = config.maxRequests
    let windowSeconds = config.windowSeconds

    // Check for tool-specific limits
    if (toolName && config.toolLimits?.[toolName]) {
      const toolLimit = config.toolLimits[toolName]
      maxRequests = toolLimit.maxCalls
      windowSeconds = toolLimit.windowSeconds ?? config.windowSeconds
    }

    // For expensive tools without explicit config, apply stricter limits
    if (toolName && EXPENSIVE_TOOLS.has(toolName) && !config.toolLimits?.[toolName]) {
      maxRequests = Math.min(maxRequests, 10) // Max 10 expensive tool calls per window
    }

    const windowMs = windowSeconds * 1000
    const windowStart = now - windowMs

    // Use pipeline for atomic operations
    const commands = [
      // Remove old entries outside the window
      ['ZREMRANGEBYSCORE', key, 0, windowStart],
      // Count current entries
      ['ZCARD', key],
      // Add new entry with current timestamp
      ['ZADD', key, now, `${now}:${Math.random().toString(36).slice(2)}`],
      // Set expiry to prevent key from growing indefinitely
      ['EXPIRE', key, windowSeconds * 2],
    ]

    const results = await this.redisPipeline(commands)
    const currentCount = results[1] as number

    // Calculate remaining and reset time
    const remaining = Math.max(0, maxRequests - currentCount - 1)
    const oldestEntry = await this.redisCommand<string[] | null>(['ZRANGE', key, 0, 0])
    const oldestTimestamp = oldestEntry?.[0] ? parseInt(oldestEntry[0].split(':')[0]!) : now
    const resetSeconds = Math.ceil((oldestTimestamp + windowMs - now) / 1000)

    // Check if allowed
    if (currentCount >= maxRequests) {
      // Remove the entry we just added since request is denied
      await this.redisCommand(['ZREMRANGEBYSCORE', key, now, now + 1])

      return {
        allowed: false,
        remaining: 0,
        limit: maxRequests,
        resetSeconds: Math.max(1, resetSeconds),
        retryAfter: Math.max(1, resetSeconds),
        reason: toolName
          ? `Rate limit exceeded for tool: ${toolName}`
          : `Rate limit exceeded for operation: ${operation}`,
      }
    }

    // Also check token budget if tool has a cost
    if (toolName) {
      const tokenCost = this.getToolCost(toolName, config)
      if (tokenCost > 0 && config.maxTokensPerMinute) {
        const tokenResult = await this.checkTokenBudget(tenantId, tokenCost, config.maxTokensPerMinute)
        if (!tokenResult.allowed) {
          // Remove the request entry since we're denying
          await this.redisCommand(['ZREMRANGEBYSCORE', key, now, now + 1])
          return tokenResult
        }
      }
    }

    return {
      allowed: true,
      remaining,
      limit: maxRequests,
      resetSeconds: Math.max(1, resetSeconds),
    }
  }

  /**
   * Check token budget for expensive operations
   */
  private async checkTokenBudget(
    tenantId: string,
    cost: number,
    maxTokensPerMinute: number
  ): Promise<RateLimitResult> {
    const key = `mcp:ratelimit:tokens:${tenantId}`
    const now = Date.now()
    const windowMs = 60 * 1000 // 1 minute window for tokens
    const windowStart = now - windowMs

    // Remove old entries and get current total
    await this.redisCommand(['ZREMRANGEBYSCORE', key, 0, windowStart])
    const entries = await this.redisCommand<string[]>(['ZRANGE', key, 0, -1, 'WITHSCORES'])

    // Calculate current token usage
    let currentTokens = 0
    for (let i = 0; i < entries.length; i += 2) {
      const tokenValue = entries[i]
      if (tokenValue) {
        const parts = tokenValue.split(':')
        if (parts[1]) {
          currentTokens += parseInt(parts[1])
        }
      }
    }

    if (currentTokens + cost > maxTokensPerMinute) {
      return {
        allowed: false,
        remaining: Math.max(0, maxTokensPerMinute - currentTokens),
        limit: maxTokensPerMinute,
        resetSeconds: 60,
        retryAfter: 60,
        reason: `Token budget exceeded. Used: ${currentTokens}/${maxTokensPerMinute}`,
      }
    }

    // Add the token cost
    await this.redisPipeline([
      ['ZADD', key, now, `${now}:${cost}`],
      ['EXPIRE', key, 120], // 2 minute expiry
    ])

    return {
      allowed: true,
      remaining: maxTokensPerMinute - currentTokens - cost,
      limit: maxTokensPerMinute,
      resetSeconds: 60,
    }
  }

  /**
   * Get the token cost for a tool
   */
  private getToolCost(toolName: string, config: RateLimitConfig): number {
    // Check config-specific cost first
    if (config.toolLimits?.[toolName]?.tokenCost !== undefined) {
      return config.toolLimits[toolName]!.tokenCost!
    }
    // Fall back to default costs
    return DEFAULT_TOOL_COSTS[toolName] ?? DEFAULT_TOOL_COSTS._default ?? 1
  }

  async getStatus(tenantId: string, operation: string): Promise<RateLimitResult> {
    const config = await this.getConfig(tenantId)
    const now = Date.now()
    const key = this.buildKey(tenantId, operation)

    const windowMs = config.windowSeconds * 1000
    const windowStart = now - windowMs

    // Remove old entries and count current
    await this.redisCommand(['ZREMRANGEBYSCORE', key, 0, windowStart])
    const currentCount = await this.redisCommand<number>(['ZCARD', key])

    const remaining = Math.max(0, config.maxRequests - currentCount)
    const oldestEntry = await this.redisCommand<string[] | null>(['ZRANGE', key, 0, 0])
    const oldestTimestamp = oldestEntry?.[0] ? parseInt(oldestEntry[0].split(':')[0]!) : now
    const resetSeconds = Math.ceil((oldestTimestamp + windowMs - now) / 1000)

    return {
      allowed: remaining > 0,
      remaining,
      limit: config.maxRequests,
      resetSeconds: Math.max(1, resetSeconds),
    }
  }

  async getConfig(tenantId: string): Promise<RateLimitConfig> {
    // Check cache first
    const cached = this.configCache.get(tenantId)
    if (cached && Date.now() < cached.expiresAt) {
      return cached.config
    }

    // Fetch from Redis
    const key = this.buildConfigKey(tenantId)
    const stored = await this.redisCommand<string | null>(['GET', key])

    const config: RateLimitConfig = stored
      ? (JSON.parse(stored) as RateLimitConfig)
      : { ...DEFAULT_RATE_LIMIT_CONFIG }

    // Cache the config
    this.configCache.set(tenantId, {
      config,
      expiresAt: Date.now() + this.CONFIG_CACHE_TTL_MS,
    })

    return config
  }

  async setConfig(tenantId: string, config: RateLimitConfig): Promise<void> {
    const key = this.buildConfigKey(tenantId)
    await this.redisCommand(['SET', key, JSON.stringify(config)])

    // Update cache
    this.configCache.set(tenantId, {
      config,
      expiresAt: Date.now() + this.CONFIG_CACHE_TTL_MS,
    })
  }
}

// =============================================================================
// In-Memory Rate Limiter (Fallback for development)
// =============================================================================

/**
 * In-memory rate limiter for development/testing
 *
 * Note: This does not work across multiple instances.
 * Use Redis in production.
 */
class InMemoryRateLimiter implements RateLimiter {
  private requests = new Map<string, number[]>()
  private tokens = new Map<string, { time: number; cost: number }[]>()
  private configs = new Map<string, RateLimitConfig>()

  private buildKey(tenantId: string, operation: string, toolName?: string): string {
    const parts = [tenantId, operation]
    if (toolName) {
      parts.push(toolName)
    }
    return parts.join(':')
  }

  async checkAndConsume(
    tenantId: string,
    operation: string,
    toolName?: string
  ): Promise<RateLimitResult> {
    const config = await this.getConfig(tenantId)
    const now = Date.now()
    const key = this.buildKey(tenantId, operation, toolName)

    // Determine limit and window
    let maxRequests = config.maxRequests
    let windowSeconds = config.windowSeconds

    if (toolName && config.toolLimits?.[toolName]) {
      const toolLimit = config.toolLimits[toolName]
      maxRequests = toolLimit.maxCalls
      windowSeconds = toolLimit.windowSeconds ?? config.windowSeconds
    }

    if (toolName && EXPENSIVE_TOOLS.has(toolName) && !config.toolLimits?.[toolName]) {
      maxRequests = Math.min(maxRequests, 10)
    }

    const windowMs = windowSeconds * 1000
    const windowStart = now - windowMs

    // Get and clean requests
    let requests = this.requests.get(key) || []
    requests = requests.filter((t) => t > windowStart)

    if (requests.length >= maxRequests) {
      const resetSeconds = Math.ceil((requests[0]! + windowMs - now) / 1000)
      return {
        allowed: false,
        remaining: 0,
        limit: maxRequests,
        resetSeconds: Math.max(1, resetSeconds),
        retryAfter: Math.max(1, resetSeconds),
        reason: toolName
          ? `Rate limit exceeded for tool: ${toolName}`
          : `Rate limit exceeded for operation: ${operation}`,
      }
    }

    // Check token budget
    if (toolName) {
      const tokenCost = DEFAULT_TOOL_COSTS[toolName] ?? DEFAULT_TOOL_COSTS._default ?? 1
      if (tokenCost > 0 && config.maxTokensPerMinute) {
        const tokenKey = tenantId
        let tokenEntries = this.tokens.get(tokenKey) || []
        const tokenWindowStart = now - 60000
        tokenEntries = tokenEntries.filter((t) => t.time > tokenWindowStart)

        const currentTokens = tokenEntries.reduce((sum, t) => sum + t.cost, 0)
        if (currentTokens + tokenCost > config.maxTokensPerMinute) {
          return {
            allowed: false,
            remaining: Math.max(0, config.maxTokensPerMinute - currentTokens),
            limit: config.maxTokensPerMinute,
            resetSeconds: 60,
            retryAfter: 60,
            reason: `Token budget exceeded. Used: ${currentTokens}/${config.maxTokensPerMinute}`,
          }
        }

        tokenEntries.push({ time: now, cost: tokenCost })
        this.tokens.set(tokenKey, tokenEntries)
      }
    }

    // Add request
    requests.push(now)
    this.requests.set(key, requests)

    const remaining = maxRequests - requests.length
    const resetSeconds = Math.ceil((requests[0]! + windowMs - now) / 1000)

    return {
      allowed: true,
      remaining,
      limit: maxRequests,
      resetSeconds: Math.max(1, resetSeconds),
    }
  }

  async getStatus(tenantId: string, operation: string): Promise<RateLimitResult> {
    const config = await this.getConfig(tenantId)
    const now = Date.now()
    const key = this.buildKey(tenantId, operation)

    const windowMs = config.windowSeconds * 1000
    const windowStart = now - windowMs

    let requests = this.requests.get(key) || []
    requests = requests.filter((t) => t > windowStart)
    this.requests.set(key, requests)

    const remaining = Math.max(0, config.maxRequests - requests.length)
    const resetSeconds = requests.length > 0
      ? Math.ceil((requests[0]! + windowMs - now) / 1000)
      : config.windowSeconds

    return {
      allowed: remaining > 0,
      remaining,
      limit: config.maxRequests,
      resetSeconds: Math.max(1, resetSeconds),
    }
  }

  async getConfig(tenantId: string): Promise<RateLimitConfig> {
    return this.configs.get(tenantId) || { ...DEFAULT_RATE_LIMIT_CONFIG }
  }

  async setConfig(tenantId: string, config: RateLimitConfig): Promise<void> {
    this.configs.set(tenantId, config)
  }
}

// =============================================================================
// Factory Function
// =============================================================================

let rateLimiterInstance: RateLimiter | null = null

/**
 * Get the rate limiter instance
 *
 * Returns Redis-backed limiter if configured, otherwise in-memory fallback.
 */
export function getRateLimiter(): RateLimiter {
  if (rateLimiterInstance) {
    return rateLimiterInstance
  }

  const hasRedisConfig =
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

  if (hasRedisConfig) {
    rateLimiterInstance = new RedisRateLimiter()
  } else {
    console.warn('[mcp/rate-limit] Using in-memory rate limiter. Set Redis env vars for production.')
    rateLimiterInstance = new InMemoryRateLimiter()
  }

  return rateLimiterInstance
}

/**
 * Create a rate limiter instance (for testing)
 */
export function createRateLimiter(options?: { forceInMemory?: boolean }): RateLimiter {
  if (options?.forceInMemory) {
    return new InMemoryRateLimiter()
  }

  const hasRedisConfig =
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

  if (hasRedisConfig) {
    return new RedisRateLimiter()
  }

  return new InMemoryRateLimiter()
}

// =============================================================================
// Middleware Helper
// =============================================================================

/**
 * Rate limit error for MCP
 */
export class RateLimitError extends Error {
  readonly code = -32006 // Custom MCP error code for rate limiting
  readonly result: RateLimitResult

  constructor(result: RateLimitResult) {
    super(result.reason || 'Rate limit exceeded')
    this.name = 'RateLimitError'
    this.result = result
  }
}

/**
 * Check rate limit and throw if exceeded
 *
 * Convenience function for use in MCP route handlers.
 *
 * @param tenantId - The tenant ID
 * @param operation - The operation type
 * @param toolName - Optional tool name
 * @throws RateLimitError if rate limit exceeded
 */
export async function checkRateLimit(
  tenantId: string,
  operation: string,
  toolName?: string
): Promise<RateLimitResult> {
  const limiter = getRateLimiter()
  const result = await limiter.checkAndConsume(tenantId, operation, toolName)

  if (!result.allowed) {
    throw new RateLimitError(result)
  }

  return result
}

/**
 * Add rate limit headers to a Response
 */
export function addRateLimitHeaders(
  headers: Record<string, string>,
  result: RateLimitResult
): Record<string, string> {
  return {
    ...headers,
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetSeconds),
    ...(result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : {}),
  }
}

/**
 * Create a rate limit exceeded response
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string> = {}
): Response {
  const response = {
    jsonrpc: '2.0' as const,
    id: null,
    error: {
      code: -32006,
      message: result.reason || 'Rate limit exceeded',
      data: {
        limit: result.limit,
        remaining: result.remaining,
        resetSeconds: result.resetSeconds,
        retryAfter: result.retryAfter,
      },
    },
  }

  return new Response(JSON.stringify(response), {
    status: 429,
    headers: addRateLimitHeaders(
      {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
      result
    ),
  })
}
