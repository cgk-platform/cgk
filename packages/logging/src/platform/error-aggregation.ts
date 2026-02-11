/**
 * Error aggregation and signature computation
 *
 * Groups similar errors by computing a signature from the error type and
 * a generalized message pattern.
 */

import crypto from 'crypto'

import type { ErrorAggregate, ErrorAggregateFilters, ServiceName } from './types.js'

/** Patterns to generalize in error messages */
const GENERALIZATION_PATTERNS: [RegExp, string][] = [
  // UUIDs (v4)
  [/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, '<UUID>'],

  // Generic IDs (various formats)
  [/\b[a-z]+_[A-Za-z0-9]{20,}\b/g, '<ID>'], // stripe-style: cus_xxxxx
  [/\b[0-9a-f]{24}\b/gi, '<OBJECT_ID>'], // MongoDB ObjectId
  [/\b\d{10,}\b/g, '<NUMERIC_ID>'], // Long numeric IDs

  // Email addresses
  [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '<EMAIL>'],

  // URLs
  [/https?:\/\/[^\s"'<>]+/gi, '<URL>'],

  // IP addresses
  [/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '<IP>'],

  // Timestamps (ISO 8601)
  [/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?/g, '<TIMESTAMP>'],

  // Dates
  [/\b\d{4}-\d{2}-\d{2}\b/g, '<DATE>'],

  // Phone numbers
  [/\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '<PHONE>'],

  // Hexadecimal tokens/hashes
  [/\b[0-9a-f]{32,64}\b/gi, '<HASH>'],

  // Numbers in context (prices, counts, etc.)
  [/\$\d+(?:\.\d{2})?/g, '<PRICE>'],
  [/\b\d+(?:\.\d+)?%/g, '<PERCENT>'],
]

/**
 * Generalize an error message by replacing dynamic values with placeholders
 */
export function generalizeMessage(message: string): string {
  let result = message

  for (const [pattern, replacement] of GENERALIZATION_PATTERNS) {
    result = result.replace(pattern, replacement)
  }

  return result
}

/**
 * Compute a unique signature for error grouping
 *
 * The signature is based on:
 * 1. Error type (e.g., "TypeError")
 * 2. Generalized error message
 * 3. First non-library stack frame (if available)
 */
export function computeErrorSignature(
  errorType: string,
  message: string,
  stack?: string | null
): string {
  const generalizedMessage = generalizeMessage(message)

  // Extract first meaningful stack frame
  let stackFrame = ''
  if (stack) {
    const frames = stack.split('\n').slice(1) // Skip first line (error message)
    for (const frame of frames) {
      // Skip node_modules and internal frames
      if (
        !frame.includes('node_modules') &&
        !frame.includes('internal/') &&
        !frame.includes('<anonymous>')
      ) {
        // Extract just file:line
        const match = frame.match(/at\s+(?:.+?\s+)?(?:\()?([^()]+):(\d+)/)
        if (match) {
          stackFrame = `${match[1]}:${match[2]}`
          break
        }
      }
    }
  }

  // Create signature from components
  const signatureInput = [errorType, generalizedMessage, stackFrame]
    .filter(Boolean)
    .join('::')

  // Hash for consistent, fixed-length signature
  return crypto.createHash('sha256').update(signatureInput).digest('hex').slice(0, 16)
}

/**
 * Query error aggregates from the database
 */
export async function getErrorAggregates(
  filters: ErrorAggregateFilters
): Promise<ErrorAggregate[]> {
  const { sql } = await import('@cgk/db')

  const { tenantId, service, startTime, endTime, minCount = 1 } = filters

  // Build dynamic query using template literals
  // We'll use conditional fragments based on filters
  let result

  const singleService = Array.isArray(service) ? service[0] : service

  if (tenantId && singleService && startTime && endTime) {
    result = await sql`
      SELECT
        data->>'_errorSignature' as signature,
        error_type,
        MIN(message) as sample_message,
        COUNT(*)::int as count,
        MIN(timestamp) as first_seen,
        MAX(timestamp) as last_seen,
        array_agg(DISTINCT id) FILTER (WHERE id IS NOT NULL) as sample_ids,
        array_agg(DISTINCT tenant_id) FILTER (WHERE tenant_id IS NOT NULL) as tenant_ids,
        array_agg(DISTINCT service) as services,
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::int as affected_users
      FROM platform_logs
      WHERE level IN ('error', 'fatal')
        AND tenant_id = ${tenantId}
        AND service = ${singleService}
        AND timestamp >= ${startTime.toISOString()}
        AND timestamp <= ${endTime.toISOString()}
        AND data->>'_errorSignature' IS NOT NULL
      GROUP BY data->>'_errorSignature', error_type
      HAVING COUNT(*) >= ${minCount}
      ORDER BY count DESC, last_seen DESC
      LIMIT 100
    `
  } else if (tenantId) {
    result = await sql`
      SELECT
        data->>'_errorSignature' as signature,
        error_type,
        MIN(message) as sample_message,
        COUNT(*)::int as count,
        MIN(timestamp) as first_seen,
        MAX(timestamp) as last_seen,
        array_agg(DISTINCT id) FILTER (WHERE id IS NOT NULL) as sample_ids,
        array_agg(DISTINCT tenant_id) FILTER (WHERE tenant_id IS NOT NULL) as tenant_ids,
        array_agg(DISTINCT service) as services,
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::int as affected_users
      FROM platform_logs
      WHERE level IN ('error', 'fatal')
        AND tenant_id = ${tenantId}
        AND data->>'_errorSignature' IS NOT NULL
      GROUP BY data->>'_errorSignature', error_type
      HAVING COUNT(*) >= ${minCount}
      ORDER BY count DESC, last_seen DESC
      LIMIT 100
    `
  } else {
    result = await sql`
      SELECT
        data->>'_errorSignature' as signature,
        error_type,
        MIN(message) as sample_message,
        COUNT(*)::int as count,
        MIN(timestamp) as first_seen,
        MAX(timestamp) as last_seen,
        array_agg(DISTINCT id) FILTER (WHERE id IS NOT NULL) as sample_ids,
        array_agg(DISTINCT tenant_id) FILTER (WHERE tenant_id IS NOT NULL) as tenant_ids,
        array_agg(DISTINCT service) as services,
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::int as affected_users
      FROM platform_logs
      WHERE level IN ('error', 'fatal')
        AND data->>'_errorSignature' IS NOT NULL
      GROUP BY data->>'_errorSignature', error_type
      HAVING COUNT(*) >= ${minCount}
      ORDER BY count DESC, last_seen DESC
      LIMIT 100
    `
  }

  return result.rows.map((row) => ({
    signature: row.signature as string,
    errorType: row.error_type as string,
    message: generalizeMessage(row.sample_message as string),
    count: row.count as number,
    firstSeen: new Date(row.first_seen as string),
    lastSeen: new Date(row.last_seen as string),
    sampleIds: ((row.sample_ids as string[]) ?? []).slice(0, 5), // Limit sample size
    tenantIds: (row.tenant_ids as string[]) ?? [],
    services: (row.services as ServiceName[]) ?? [],
    affectedUsers: row.affected_users as number,
  }))
}

/**
 * Get error details by signature
 */
export async function getErrorsBySignature(
  signature: string,
  limit: number = 10
): Promise<{
  message: string
  sampleStack: string | null
  recentErrors: Array<{
    id: string
    timestamp: Date
    tenantId: string | null
    userId: string | null
    message: string
  }>
}> {
  const { sql } = await import('@cgk/db')

  const result = await sql`
    SELECT
      id, timestamp, tenant_id, user_id, message, error_stack
    FROM platform_logs
    WHERE data->>'_errorSignature' = ${signature}
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `

  if (result.rows.length === 0) {
    return { message: '', sampleStack: null, recentErrors: [] }
  }

  const first = result.rows[0]
  if (!first) {
    return { message: '', sampleStack: null, recentErrors: [] }
  }

  return {
    message: generalizeMessage(first.message as string),
    sampleStack: first.error_stack as string | null,
    recentErrors: result.rows.map((row) => ({
      id: row.id as string,
      timestamp: new Date(row.timestamp as string),
      tenantId: row.tenant_id as string | null,
      userId: row.user_id as string | null,
      message: row.message as string,
    })),
  }
}
