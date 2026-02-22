import { sql as vercelSql, type VercelPool } from '@vercel/postgres'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * Async-local store for the current tenant schema name.
 * When set (inside withTenant), all sql calls automatically
 * use a Neon HTTP transaction to SET LOCAL search_path before
 * the actual query, ensuring correct tenant isolation.
 *
 * Neon's HTTP driver (used by @vercel/postgres in Edge Runtime) sends
 * each sql call as a separate HTTP request with no shared session state.
 * Multi-statement queries are rejected ("cannot insert multiple commands
 * into a prepared statement"). The transaction approach bundles
 * SET LOCAL search_path + query in a single HTTP request.
 */
export const tenantSchemaStore = new AsyncLocalStorage<string>()

/**
 * Cached neon() function for tenant queries.
 * Uses the same connection URL as @vercel/postgres but with
 * fullResults: true for QueryResult-compatible return shape.
 */
let _neonSql: NeonQueryFunction<false, true> | null = null

function getNeonSql(): NeonQueryFunction<false, true> {
  if (!_neonSql) {
    const url = process.env.POSTGRES_URL || process.env.DATABASE_URL
    if (!url) throw new Error('POSTGRES_URL or DATABASE_URL is required')
    _neonSql = neon(url, { fullResults: true })
  }
  return _neonSql
}

/**
 * Convert a parameterized query string ("SELECT $1, $2") + params array
 * into a TemplateStringsArray + ordered values for tagged-template usage.
 *
 * This allows sql.query("SELECT $1", [val]) calls to be converted to
 * the tagged-template form required by neon()'s transaction txn function.
 */
function queryToTemplateArgs(
  query: string,
  params: unknown[],
): [TemplateStringsArray, ...unknown[]] {
  const parts: string[] = []
  const orderedValues: unknown[] = []
  let lastIndex = 0
  const regex = /\$(\d+)/g
  let match

  while ((match = regex.exec(query)) !== null) {
    parts.push(query.slice(lastIndex, match.index))
    const paramIndex = parseInt(match[1]!, 10) - 1
    orderedValues.push(params[paramIndex])
    lastIndex = match.index + match[0].length
  }
  parts.push(query.slice(lastIndex))

  const strings = Object.assign([...parts], {
    raw: [...parts],
  }) as unknown as TemplateStringsArray
  return [strings, ...orderedValues]
}

/**
 * SQL template tag for parameterized queries
 *
 * When called inside withTenant(), uses a Neon HTTP transaction
 * to SET LOCAL search_path before the actual query, ensuring
 * the correct tenant schema is used even with stateless HTTP.
 *
 * @ai-pattern sql-template
 * @ai-required Use this instead of string concatenation
 * @ai-gotcha Never use db.connect() - it breaks with Neon pooling
 *
 * @example
 * ```ts
 * const users = await sql`SELECT * FROM users WHERE id = ${userId}`
 * ```
 */
export const sql: typeof vercelSql = new Proxy(vercelSql, {
  apply(_target, _thisArg, args: unknown[]) {
    const schema = tenantSchemaStore.getStore()
    if (schema) {
      const neonSql = getNeonSql()
      const strings = args[0] as TemplateStringsArray
      const values = args.slice(1) as unknown[]
      // Bundle SET LOCAL search_path + query in a single HTTP transaction
      return neonSql.transaction(
        (txn) => [
          txn`SELECT set_config('search_path', ${`${schema},public`}, true)`,
          txn(strings, ...(values as [])),
        ],
        { fullResults: true },
      ).then((results) => results[1])
    }
    // No tenant context — use vercelSql directly for public schema
    const strings = args[0] as TemplateStringsArray
    const values = args.slice(1) as unknown[]
    return vercelSql(strings, ...(values as []))
  },
  get(target, prop, receiver) {
    if (prop === 'query') {
      const originalQuery = target.query.bind(target) as VercelPool['query']
      return (queryOrConfig: string | object, values?: unknown[]) => {
        const schema = tenantSchemaStore.getStore()
        if (schema && typeof queryOrConfig === 'string') {
          const neonSql = getNeonSql()
          // Convert "SELECT $1, $2" + [v1, v2] to tagged-template form
          // because neon()'s transaction txn only supports tagged templates
          const [tsa, ...tValues] = queryToTemplateArgs(
            queryOrConfig,
            values || [],
          )
          return neonSql.transaction(
            (txn) => [
              txn`SELECT set_config('search_path', ${`${schema},public`}, true)`,
              txn(tsa, ...(tValues as [])),
            ],
            { fullResults: true },
          ).then((results) => results[1])
        }
        return originalQuery(queryOrConfig as never, values as never)
      }
    }
    return Reflect.get(target, prop, receiver)
  },
})
