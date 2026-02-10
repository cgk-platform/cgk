/**
 * Database type definitions
 */

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[]
  rowCount: number
  command: string
}

export interface QueryConfig {
  text: string
  values?: unknown[]
  name?: string
}
