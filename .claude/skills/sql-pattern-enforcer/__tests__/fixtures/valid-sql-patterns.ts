// Valid SQL patterns following @vercel/postgres guidelines
import { sql } from '@vercel/postgres'
import { toCamelCase } from '@cgk-platform/core'

// Valid: Array to PostgreSQL literal
export async function queryWithArray(ids: string[]) {
  return sql`SELECT * FROM items WHERE id = ANY(${`{${ids.join(',')}}`}::text[])`
}

// Valid: Date to ISO string
export async function queryWithDate(expiresAt: Date) {
  return sql`UPDATE items SET expires_at = ${expiresAt.toISOString()}`
}

// Valid: Double cast with toCamelCase
export async function queryWithCast() {
  const result = await sql`SELECT * FROM items WHERE id = 'abc'`
  const row = result.rows[0]
  if (!row) return null
  return toCamelCase(row as Record<string, unknown>) as unknown as Item
}

// Valid: Conditional queries (not fragments)
export async function conditionalQuery(status?: string) {
  if (status) {
    return sql`SELECT * FROM items WHERE status = ${status}`
  }
  return sql`SELECT * FROM items`
}

// Valid: Switch case for dynamic tables
export async function updateEntity(entityType: string, id: string, status: string) {
  switch (entityType) {
    case 'project':
      return sql`UPDATE projects SET status = ${status} WHERE id = ${id}`
    case 'task':
      return sql`UPDATE tasks SET status = ${status} WHERE id = ${id}`
    default:
      throw new Error('Unknown entity type')
  }
}

// Valid: Undefined check before using result
export async function safeQuery() {
  const result = await sql`SELECT * FROM items WHERE id = '123'`
  const row = result.rows[0]
  if (!row) throw new Error('Not found')
  return row
}

interface Item {
  id: string
  name: string
}
