// Invalid SQL patterns that violate @vercel/postgres guidelines
import { sql } from '@vercel/postgres'
import { toCamelCase } from '@cgk-platform/core'

// Invalid: Direct array passing
export async function directArray(ids: string[]) {
  return sql`SELECT * FROM items WHERE id = ANY(${ids})`
}

// Invalid: Date object without toISOString
export async function directDate(createdAt: Date) {
  return sql`UPDATE items SET created_at = ${createdAt}`
}

// Invalid: Single cast without unknown
export async function singleCast() {
  const result = await sql`SELECT * FROM items`
  return toCamelCase(result.rows[0]) as Item
}

// Invalid: SQL fragment composition
export async function fragmentComposition(filter: string) {
  const whereClause = sql`WHERE status = ${filter}`
  return sql`SELECT * FROM items ${whereClause}`
}

// Invalid: sql.unsafe() (doesn't exist)
export async function sqlUnsafe(table: string) {
  return sql.unsafe(`SELECT * FROM ${table}`)
}

// Invalid: Dynamic table name
export async function dynamicTable(tableName: string, id: string) {
  return sql`SELECT * FROM ${tableName} WHERE id = ${id}`
}

// Invalid: No undefined check
export async function noUndefinedCheck() {
  const result = await sql`SELECT * FROM items WHERE id = '123'`
  return result.rows[0].id
}

// Invalid: Direct destructuring without check
export async function directDestructure() {
  const result = await sql`SELECT * FROM items WHERE id = '123'`
  const { id, name } = result.rows[0]
  return { id, name }
}

// Invalid: Underscore variable without justification
export async function underscoreNoComment() {
  const _unusedData = fetchData()
  return 'done'
}

function fetchData() {
  return { data: [] }
}

interface Item {
  id: string
  name: string
}
