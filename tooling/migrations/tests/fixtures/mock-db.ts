/**
 * Mock Database for Migration Testing
 *
 * Provides in-memory database mocks for unit testing without
 * requiring actual database connections.
 */

import { vi } from 'vitest'
import type { DatabaseRow } from '../../lib/transform-row.js'

/**
 * In-memory data store
 */
export interface MockDataStore {
  source: Record<string, DatabaseRow[]>
  destination: Record<string, Record<string, DatabaseRow[]>> // schema -> table -> rows
}

/**
 * Create a fresh mock data store
 */
export function createMockDataStore(): MockDataStore {
  return {
    source: {},
    destination: {},
  }
}

/**
 * Query result type
 */
export interface MockQueryResult<T = DatabaseRow> {
  rows: T[]
  rowCount: number
}

/**
 * Mock pg Pool client
 */
export interface MockPoolClient {
  query: <T = DatabaseRow>(text: string, params?: unknown[]) => Promise<MockQueryResult<T>>
  release: () => void
}

/**
 * Mock pg Pool
 */
export interface MockPool {
  query: <T = DatabaseRow>(text: string, params?: unknown[]) => Promise<MockQueryResult<T>>
  connect: () => Promise<MockPoolClient>
  end: () => Promise<void>
}

/**
 * Create a mock query function
 */
function createQueryHandler(
  store: MockDataStore,
  isSource: boolean,
  currentSchema: { value: string }
) {
  return async <T = DatabaseRow>(
    text: string,
    params?: unknown[]
  ): Promise<MockQueryResult<T>> => {
    const query = text.toLowerCase().trim()

    // Handle SET search_path
    if (query.startsWith('set search_path')) {
      const match = text.match(/SET search_path TO ([a-z_]+)/i)
      if (match?.[1]) {
        currentSchema.value = match[1]
      }
      return { rows: [], rowCount: 0 }
    }

    // Handle SELECT 1 (connection check)
    if (query === 'select 1') {
      return { rows: [{ '?column?': 1 } as unknown as T], rowCount: 1 }
    }

    // Handle COUNT(*)
    if (query.includes('count(*)')) {
      const tableMatch = query.match(/from\s+(\w+)/i)
      const tableName = tableMatch?.[1]
      if (tableName) {
        const data = isSource
          ? store.source[tableName] ?? []
          : store.destination[currentSchema.value]?.[tableName] ?? []
        return {
          rows: [{ count: String(data.length) } as unknown as T],
          rowCount: 1,
        }
      }
      return { rows: [{ count: '0' } as unknown as T], rowCount: 1 }
    }

    // Handle SELECT EXISTS for schema check
    if (query.includes('information_schema.schemata')) {
      const schemaMatch = params?.[0] as string | undefined
      if (schemaMatch) {
        const exists = schemaMatch in store.destination
        return {
          rows: [{ exists } as unknown as T],
          rowCount: 1,
        }
      }
    }

    // Handle SELECT EXISTS for table check
    if (query.includes('information_schema.tables')) {
      const schemaName = params?.[0] as string | undefined
      const tableName = params?.[1] as string | undefined
      if (schemaName && tableName) {
        const schemaData = store.destination[schemaName]
        const exists = schemaData !== undefined && tableName in schemaData
        return {
          rows: [{ exists } as unknown as T],
          rowCount: 1,
        }
      }
      // For source table check (public schema)
      if (tableName) {
        const exists = tableName in store.source
        return {
          rows: [{ exists } as unknown as T],
          rowCount: 1,
        }
      }
    }

    // Handle SELECT * queries
    if (query.includes('select *')) {
      const tableMatch = query.match(/from\s+(\w+)/i)
      const tableName = tableMatch?.[1]
      if (tableName) {
        let data = isSource
          ? store.source[tableName] ?? []
          : store.destination[currentSchema.value]?.[tableName] ?? []

        // Handle OFFSET/LIMIT
        const offsetMatch = query.match(/offset\s+\$(\d+)/i)
        const limitMatch = query.match(/limit\s+\$(\d+)/i)

        if (offsetMatch && limitMatch && params) {
          const offsetIndex = parseInt(offsetMatch[1], 10) - 1
          const limitIndex = parseInt(limitMatch[1], 10) - 1
          const offset = (params[offsetIndex] as number) ?? 0
          const limit = (params[limitIndex] as number) ?? data.length
          data = data.slice(offset, offset + limit)
        }

        return {
          rows: data as unknown as T[],
          rowCount: data.length,
        }
      }
    }

    // Handle INSERT queries
    if (query.includes('insert into')) {
      const tableMatch = query.match(/insert into\s+"?(\w+)"?/i)
      const tableName = tableMatch?.[1]
      if (tableName && !isSource) {
        // Initialize schema and table if needed
        if (!store.destination[currentSchema.value]) {
          store.destination[currentSchema.value] = {}
        }
        if (!store.destination[currentSchema.value][tableName]) {
          store.destination[currentSchema.value][tableName] = []
        }

        // For simplicity, return a mock inserted row
        const insertedId = params?.[0] as string ?? 'mock_id'
        return {
          rows: [{ id: insertedId } as unknown as T],
          rowCount: 1,
        }
      }
    }

    // Handle TRUNCATE
    if (query.includes('truncate')) {
      const tableMatch = query.match(/truncate\s+table\s+"?(\w+)"?/i)
      const tableName = tableMatch?.[1]
      if (tableName && !isSource && store.destination[currentSchema.value]) {
        store.destination[currentSchema.value][tableName] = []
        return { rows: [], rowCount: 0 }
      }
    }

    // Handle DROP SCHEMA
    if (query.includes('drop schema')) {
      const schemaMatch = query.match(/drop schema(?:\s+if exists)?\s+(\w+)/i)
      const schemaName = schemaMatch?.[1]
      if (schemaName && !isSource) {
        delete store.destination[schemaName]
        return { rows: [], rowCount: 0 }
      }
    }

    // Default: empty result
    return { rows: [], rowCount: 0 }
  }
}

/**
 * Create a mock database pool
 */
export function createMockPool(
  store: MockDataStore,
  isSource: boolean
): MockPool {
  const currentSchema = { value: 'public' }
  const queryHandler = createQueryHandler(store, isSource, currentSchema)

  const mockClient: MockPoolClient = {
    query: queryHandler,
    release: vi.fn(),
  }

  return {
    query: queryHandler,
    connect: vi.fn().mockResolvedValue(mockClient),
    end: vi.fn().mockResolvedValue(undefined),
  }
}

/**
 * Setup mock database modules
 */
export function setupMockDb(store: MockDataStore) {
  const sourcePool = createMockPool(store, true)
  const destinationPool = createMockPool(store, false)

  return {
    sourcePool,
    destinationPool,
    getSourcePool: vi.fn().mockReturnValue(sourcePool),
    getDestinationPool: vi.fn().mockReturnValue(destinationPool),
    querySource: vi.fn().mockImplementation(sourcePool.query),
    queryDestination: vi.fn().mockImplementation(
      async (_tenant: string, text: string, params?: unknown[]) => {
        return destinationPool.query(text, params)
      }
    ),
    checkSourceConnection: vi.fn().mockResolvedValue(true),
    checkDestinationConnection: vi.fn().mockResolvedValue(true),
    tenantSchemaExists: vi.fn().mockImplementation(async (tenant: string) => {
      return `tenant_${tenant}` in store.destination
    }),
    sourceTableExists: vi.fn().mockImplementation(async (table: string) => {
      return table in store.source
    }),
    destinationTableExists: vi.fn().mockImplementation(
      async (tenant: string, table: string) => {
        const schema = store.destination[`tenant_${tenant}`]
        return schema !== undefined && table in schema
      }
    ),
    closeConnections: vi.fn().mockResolvedValue(undefined),
  }
}

/**
 * Populate mock database with test data
 */
export function populateMockDb(
  store: MockDataStore,
  sourceData: Record<string, DatabaseRow[]>,
  tenantSlug?: string
) {
  // Populate source
  for (const [table, rows] of Object.entries(sourceData)) {
    store.source[table] = [...rows]
  }

  // Initialize destination schema if tenant provided
  if (tenantSlug) {
    store.destination[`tenant_${tenantSlug}`] = {}
    for (const table of Object.keys(sourceData)) {
      store.destination[`tenant_${tenantSlug}`][table] = []
    }
  }
}

/**
 * Compare two database rows for equality (ignoring undefined vs null differences)
 */
export function rowsEqual(
  row1: DatabaseRow,
  row2: DatabaseRow,
  ignoreFields: string[] = ['created_at', 'updated_at']
): boolean {
  const keys1 = Object.keys(row1).filter((k) => !ignoreFields.includes(k))
  const keys2 = Object.keys(row2).filter((k) => !ignoreFields.includes(k))

  if (keys1.length !== keys2.length) return false

  for (const key of keys1) {
    const val1 = row1[key]
    const val2 = row2[key]

    // Treat null and undefined as equal
    if ((val1 === null || val1 === undefined) &&
        (val2 === null || val2 === undefined)) {
      continue
    }

    // Deep compare objects
    if (typeof val1 === 'object' && typeof val2 === 'object') {
      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        return false
      }
      continue
    }

    // String comparison for values
    if (String(val1) !== String(val2)) {
      return false
    }
  }

  return true
}

/**
 * Assert that a row was transformed correctly
 */
export function assertRowTransformed(
  original: DatabaseRow,
  transformed: DatabaseRow,
  expectedChanges: Record<string, unknown>
) {
  // Check expected changes were applied
  for (const [key, expected] of Object.entries(expectedChanges)) {
    if (transformed[key] !== expected) {
      throw new Error(
        `Field "${key}" not transformed correctly. ` +
        `Expected: ${JSON.stringify(expected)}, ` +
        `Got: ${JSON.stringify(transformed[key])}`
      )
    }
  }

  // Check unchanged fields remained the same
  for (const key of Object.keys(original)) {
    if (key in expectedChanges) continue
    if (key in transformed) continue

    throw new Error(`Field "${key}" was unexpectedly removed`)
  }
}
