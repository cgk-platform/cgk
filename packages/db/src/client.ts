import { sql as vercelSql } from '@vercel/postgres'

/**
 * SQL template tag for parameterized queries
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
export const sql = vercelSql
