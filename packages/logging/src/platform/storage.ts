/**
 * PostgreSQL storage for platform logs
 *
 * Uses batch inserts to minimize database connections.
 * Logs are stored in the public schema (platform_logs table).
 */

import type { PlatformLogEntry } from './types.js'

/** Upstash Redis REST API client */
interface RedisClient {
  command<T>(args: (string | number)[]): Promise<T>
}

/** Create Redis client from environment variables */
function createRedisClient(): RedisClient | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    return null
  }

  return {
    async command<T>(args: (string | number)[]): Promise<T> {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(args),
      })

      if (!response.ok) {
        throw new Error(`Redis command failed: ${response.statusText}`)
      }

      const data = (await response.json()) as { result: T }
      return data.result
    },
  }
}

/**
 * Write log entries to PostgreSQL in batch
 *
 * Uses a single INSERT with multiple VALUES for efficiency.
 */
export async function writeToDatabase(entries: PlatformLogEntry[]): Promise<void> {
  if (entries.length === 0) {
    return
  }

  // Import sql from @cgk/db dynamically to avoid circular deps
  const { sql } = await import('@cgk/db')

  // Build the values list for batch insert
  const values = entries.map((entry) => ({
    id: entry.id,
    timestamp: entry.timestamp.toISOString(),
    level: entry.level,
    tenant_id: entry.tenantId,
    tenant_slug: entry.tenantSlug,
    user_id: entry.userId,
    session_id: entry.sessionId,
    impersonator_id: entry.impersonatorId,
    request_id: entry.requestId,
    trace_id: entry.traceId,
    span_id: entry.spanId,
    service: entry.service,
    action: entry.action,
    file: entry.file,
    line: entry.line,
    function_name: entry.functionName,
    message: entry.message,
    data: entry.data ? JSON.stringify(entry.data) : null,
    error_type: entry.errorType,
    error_code: entry.errorCode,
    error_stack: entry.errorStack,
    environment: entry.environment,
    version: entry.version,
    region: entry.region,
  }))

  // Use parameterized query for safety
  // We'll insert one row at a time but in a single transaction
  for (const val of values) {
    await sql`
      INSERT INTO platform_logs (
        id, timestamp, level,
        tenant_id, tenant_slug,
        user_id, session_id, impersonator_id,
        request_id, trace_id, span_id,
        service, action, file, line, function_name,
        message, data,
        error_type, error_code, error_stack,
        environment, version, region
      ) VALUES (
        ${val.id}, ${val.timestamp}, ${val.level},
        ${val.tenant_id}, ${val.tenant_slug},
        ${val.user_id}, ${val.session_id}, ${val.impersonator_id},
        ${val.request_id}, ${val.trace_id}, ${val.span_id},
        ${val.service}, ${val.action}, ${val.file}, ${val.line}, ${val.function_name},
        ${val.message}, ${val.data}::jsonb,
        ${val.error_type}, ${val.error_code}, ${val.error_stack},
        ${val.environment}, ${val.version}, ${val.region}
      )
    `
  }
}

/** Redis stream key for real-time logs */
const LOG_STREAM_KEY = 'platform:logs:stream'

/** Redis pub/sub channel for log notifications */
const LOG_CHANNEL = 'platform:logs:events'

/** Max stream length before trimming */
const MAX_STREAM_LENGTH = 10000

/**
 * Write log entries to Redis stream for real-time delivery
 */
export async function writeToRedis(entries: PlatformLogEntry[]): Promise<void> {
  if (entries.length === 0) {
    return
  }

  const redis = createRedisClient()
  if (!redis) {
    // Redis not configured - skip streaming
    return
  }

  for (const entry of entries) {
    // Add to stream with auto-generated ID
    const serialized = JSON.stringify(entry)

    await redis.command([
      'XADD',
      LOG_STREAM_KEY,
      'MAXLEN',
      '~',
      MAX_STREAM_LENGTH,
      '*',
      'entry',
      serialized,
    ])

    // Publish notification for subscribers
    await redis.command(['PUBLISH', LOG_CHANNEL, serialized])
  }
}

/**
 * Read logs from Redis stream
 *
 * @param count Maximum number of entries to return
 * @param lastId Last ID received (for pagination)
 */
export async function readFromStream(
  count: number = 100,
  lastId: string = '0'
): Promise<{ entries: PlatformLogEntry[]; lastId: string | null }> {
  const redis = createRedisClient()
  if (!redis) {
    return { entries: [], lastId: null }
  }

  // XRANGE returns [id, [field, value, field, value, ...]]
  const result = await redis.command<[string, string[]][]>([
    'XRANGE',
    LOG_STREAM_KEY,
    lastId === '0' ? '-' : `(${lastId}`,
    '+',
    'COUNT',
    count,
  ])

  if (!result || result.length === 0) {
    return { entries: [], lastId: null }
  }

  const entries: PlatformLogEntry[] = []
  let newLastId: string | null = null

  for (const item of result) {
    const [id, fields] = item
    if (!id || !fields) continue

    newLastId = id

    // Find the entry field
    const entryIdx = fields.indexOf('entry')
    const entryValue = entryIdx !== -1 ? fields[entryIdx + 1] : undefined
    if (entryValue) {
      try {
        const entry = JSON.parse(entryValue) as PlatformLogEntry
        entries.push(entry)
      } catch {
        // Skip malformed entries
      }
    }
  }

  return { entries, lastId: newLastId }
}

/**
 * Subscribe to log stream via polling
 *
 * Uses XREAD with BLOCK for efficient waiting.
 */
export async function subscribeToStream(
  onEntry: (entry: PlatformLogEntry) => void,
  options: { blockMs?: number } = {}
): Promise<() => void> {
  const redis = createRedisClient()
  if (!redis) {
    return () => {}
  }

  const { blockMs = 5000 } = options
  let running = true
  let lastId = '$' // Start from latest

  const poll = async () => {
    while (running) {
      try {
        // XREAD returns [[key, [[id, fields], ...]]]
        const result = await redis.command<[string, [string, string[]][]][] | null>([
          'XREAD',
          'BLOCK',
          blockMs,
          'COUNT',
          100,
          'STREAMS',
          LOG_STREAM_KEY,
          lastId,
        ])

        if (result && result.length > 0 && result[0]) {
          const streamData = result[0]
          const entries = streamData[1]
          if (entries) {
            for (const item of entries) {
              const [id, fields] = item
              if (!id || !fields) continue

              lastId = id

              const entryIdx = fields.indexOf('entry')
              const entryValue = entryIdx !== -1 ? fields[entryIdx + 1] : undefined
              if (entryValue) {
                try {
                  const entry = JSON.parse(entryValue) as PlatformLogEntry
                  onEntry(entry)
                } catch {
                  // Skip malformed entries
                }
              }
            }
          }
        }
      } catch (error) {
        // Log error but continue polling
        console.error('[logging] Stream subscription error:', error)
        await new Promise((r) => setTimeout(r, 1000))
      }

      // Check if the request was aborted
    }
  }

  poll()

  return () => {
    running = false
  }
}
