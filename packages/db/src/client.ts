import { sql as vercelSql, type VercelPool } from '@vercel/postgres'
import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * Async-local store for the current tenant schema name.
 * When set (inside withTenant), all sql calls automatically
 * prepend SET search_path for Neon serverless compatibility.
 *
 * Neon's HTTP driver (used by @vercel/postgres in Edge Runtime) sends
 * each sql call as a separate HTTP request with no shared session state.
 * Without this, SET search_path in one call is lost before the next query.
 */
export const tenantSchemaStore = new AsyncLocalStorage<string>()

/**
 * SQL template tag for parameterized queries
 *
 * When called inside withTenant(), automatically prepends
 * SET search_path to ensure the correct tenant schema is used.
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
      const strings = args[0] as TemplateStringsArray
      const values = args.slice(1) as unknown[]
      const prefix = `SET search_path TO ${schema}, public;\n`
      const modified = [prefix + strings[0], ...Array.from(strings).slice(1)]
      const rawModified = [prefix + strings.raw[0], ...strings.raw.slice(1)]
      Object.defineProperty(modified, 'raw', { value: rawModified })
      return vercelSql(modified as unknown as TemplateStringsArray, ...(values as []))
    }
    return (vercelSql as Function).apply(null, args)
  },
  get(target, prop, receiver) {
    if (prop === 'query') {
      const originalQuery = target.query.bind(target) as VercelPool['query']
      return (queryOrConfig: string | object) => {
        const schema = tenantSchemaStore.getStore()
        if (schema && typeof queryOrConfig === 'string') {
          return originalQuery(
            `SET search_path TO ${schema}, public;\n${queryOrConfig}` as never
          )
        }
        return originalQuery(queryOrConfig as never)
      }
    }
    return Reflect.get(target, prop, receiver)
  },
})
