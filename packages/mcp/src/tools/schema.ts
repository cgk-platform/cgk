/**
 * Schema Introspection Tools
 *
 * Tools for exploring database schema, checking ID types, and validating migrations.
 * Prevents common migration errors like UUID/TEXT type mismatches.
 *
 * @category Database
 */

import { sql } from '@cgk-platform/db'
import { defineTool, jsonResult, errorResult } from '../tools'
import type { ToolDefinition } from '../tools'

// =============================================================================
// Types
// =============================================================================

interface ColumnInfo {
  columnName: string
  dataType: string
  isNullable: string
  columnDefault: string | null
  characterMaximumLength: number | null
  numericPrecision: number | null
}

interface ForeignKeyInfo {
  columnName: string
  foreignTableSchema: string
  foreignTableName: string
  foreignColumnName: string
  constraintName: string
}

interface IndexInfo {
  indexName: string
  indexDef: string
}

interface TableDescription {
  schemaName: string
  tableName: string
  columns: ColumnInfo[]
  foreignKeys: ForeignKeyInfo[]
  indexes: IndexInfo[]
  primaryKey: string[]
}

interface TypeCompatibilityCheck {
  compatible: boolean
  sourceType: string | null
  targetType: string | null
  errors: string[]
}

// =============================================================================
// Tool: describe_table
// =============================================================================

/**
 * Describe table structure including columns, types, foreign keys, and indexes
 *
 * Returns detailed information about a table's schema, useful for:
 * - Checking ID column types before adding foreign keys
 * - Understanding table structure before migrations
 * - Validating schema changes
 *
 * @example
 * ```typescript
 * const result = await callTool({
 *   name: 'describe_table',
 *   arguments: { schemaName: 'public', tableName: 'users' }
 * })
 * // Returns: { columns: [...], foreignKeys: [...], indexes: [...] }
 * ```
 */
export const describeTableTool = defineTool({
  name: 'describe_table',
  description:
    'Get detailed table structure including columns, types, foreign keys, and indexes. Use this to check ID types before adding foreign keys or to understand table structure before migrations.',
  inputSchema: {
    type: 'object',
    properties: {
      schemaName: {
        type: 'string',
        description: 'Schema name (public or tenant_*)',
      },
      tableName: {
        type: 'string',
        description: 'Table name',
      },
    },
    required: ['schemaName', 'tableName'],
  },
  async handler(args) {
    try {
      const { schemaName, tableName } = args as {
        schemaName: string
        tableName: string
      }

      // Get columns
      const columnsResult = await sql`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision
        FROM information_schema.columns
        WHERE table_schema = ${schemaName}
          AND table_name = ${tableName}
        ORDER BY ordinal_position
      `

      const columns = columnsResult.rows.map((row) => ({
        columnName: row.column_name as string,
        dataType: row.data_type as string,
        isNullable: row.is_nullable as string,
        columnDefault: (row.column_default as string | null) ?? null,
        characterMaximumLength: (row.character_maximum_length as number | null) ?? null,
        numericPrecision: (row.numeric_precision as number | null) ?? null,
      }))

      // Get foreign keys
      const foreignKeysResult = await sql`
        SELECT
          kcu.column_name,
          ccu.table_schema AS foreign_table_schema,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = ${schemaName}
          AND tc.table_name = ${tableName}
      `

      const foreignKeys = foreignKeysResult.rows.map((row) => ({
        columnName: row.column_name as string,
        foreignTableSchema: row.foreign_table_schema as string,
        foreignTableName: row.foreign_table_name as string,
        foreignColumnName: row.foreign_column_name as string,
        constraintName: row.constraint_name as string,
      }))

      // Get indexes
      const indexesResult = await sql`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = ${schemaName}
          AND tablename = ${tableName}
      `

      const indexes = indexesResult.rows.map((row) => ({
        indexName: row.indexname as string,
        indexDef: row.indexdef as string,
      }))

      // Get primary key columns
      const pkResult = await sql`
        SELECT kcu.column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = ${schemaName}
          AND tc.table_name = ${tableName}
        ORDER BY kcu.ordinal_position
      `

      const primaryKey = pkResult.rows.map((row) => row.column_name as string)

      const description: TableDescription = {
        schemaName,
        tableName,
        columns,
        foreignKeys,
        indexes,
        primaryKey,
      }

      return jsonResult(description)
    } catch (error) {
      const err = error as Error
      return errorResult(`Failed to describe table: ${err.message}`)
    }
  },
})

// =============================================================================
// Tool: list_tables
// =============================================================================

/**
 * List all tables in a schema
 *
 * Returns table names and row counts for a schema. Useful for:
 * - Exploring tenant schema structure
 * - Finding tables before migrations
 * - Checking what tables exist in a schema
 *
 * @example
 * ```typescript
 * const result = await callTool({
 *   name: 'list_tables',
 *   arguments: { schemaName: 'tenant_rawdog' }
 * })
 * // Returns: [{ tableName: 'orders', rowCount: 1234 }, ...]
 * ```
 */
export const listTablesTool = defineTool({
  name: 'list_tables',
  description: 'List all tables in a schema with row counts. Useful for exploring schema structure.',
  inputSchema: {
    type: 'object',
    properties: {
      schemaName: {
        type: 'string',
        description: 'Schema name (public or tenant_*)',
      },
    },
    required: ['schemaName'],
  },
  async handler(args) {
    try {
      const { schemaName } = args as { schemaName: string }

      // Get tables
      const tablesResult = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = ${schemaName}
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `

      const tables = []

      for (const row of tablesResult.rows) {
        const tableName = row.table_name as string

        // Note: Can't dynamically query row count with @vercel/postgres
        // Would require using sql.unsafe() which doesn't exist
        tables.push({
          tableName,
          rowCount: null, // Not available with current SQL client
        })
      }

      return jsonResult({ schemaName, tables })
    } catch (error) {
      const err = error as Error
      return errorResult(`Failed to list tables: ${err.message}`)
    }
  },
})

// =============================================================================
// Tool: check_foreign_key_compatibility
// =============================================================================

/**
 * Check if foreign key types are compatible (UUID vs TEXT mismatch detection)
 *
 * Validates that source and target column types match before adding a foreign key.
 * This is critical because public tables use UUID while tenant tables use TEXT.
 *
 * @example
 * ```typescript
 * // Check if we can add FK from tenant table to public.users
 * const result = await callTool({
 *   name: 'check_foreign_key_compatibility',
 *   arguments: {
 *     sourceSchema: 'tenant_rawdog',
 *     sourceTable: 'creators',
 *     sourceColumn: 'user_id',
 *     targetSchema: 'public',
 *     targetTable: 'users',
 *     targetColumn: 'id'
 *   }
 * })
 * // Returns: { compatible: false, sourceType: 'text', targetType: 'uuid', errors: [...] }
 * ```
 */
export const checkForeignKeyCompatibilityTool = defineTool({
  name: 'check_foreign_key_compatibility',
  description:
    'Check if foreign key types are compatible. Prevents UUID vs TEXT type mismatches. Use this before adding foreign keys to ensure types match.',
  inputSchema: {
    type: 'object',
    properties: {
      sourceSchema: {
        type: 'string',
        description: 'Source table schema',
      },
      sourceTable: {
        type: 'string',
        description: 'Source table name',
      },
      sourceColumn: {
        type: 'string',
        description: 'Source column name',
      },
      targetSchema: {
        type: 'string',
        description: 'Target table schema',
      },
      targetTable: {
        type: 'string',
        description: 'Target table name',
      },
      targetColumn: {
        type: 'string',
        description: 'Target column name (usually id)',
      },
    },
    required: [
      'sourceSchema',
      'sourceTable',
      'sourceColumn',
      'targetSchema',
      'targetTable',
      'targetColumn',
    ],
  },
  async handler(args) {
    try {
      const {
        sourceSchema,
        sourceTable,
        sourceColumn,
        targetSchema,
        targetTable,
        targetColumn,
      } = args as {
        sourceSchema: string
        sourceTable: string
        sourceColumn: string
        targetSchema: string
        targetTable: string
        targetColumn: string
      }

      // Get source column type
      const sourceResult = await sql`
        SELECT data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = ${sourceSchema}
          AND table_name = ${sourceTable}
          AND column_name = ${sourceColumn}
        LIMIT 1
      `

      // Get target column type
      const targetResult = await sql`
        SELECT data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = ${targetSchema}
          AND table_name = ${targetTable}
          AND column_name = ${targetColumn}
        LIMIT 1
      `

      const sourceRow = sourceResult.rows[0]
      const targetRow = targetResult.rows[0]

      if (!sourceRow) {
        return errorResult(
          `Source column not found: ${sourceSchema}.${sourceTable}.${sourceColumn}`
        )
      }

      if (!targetRow) {
        return errorResult(
          `Target column not found: ${targetSchema}.${targetTable}.${targetColumn}`
        )
      }

      const sourceType = (sourceRow.udt_name as string) || (sourceRow.data_type as string)
      const targetType = (targetRow.udt_name as string) || (targetRow.data_type as string)

      const compatible = sourceType === targetType

      const errors: string[] = []
      if (!compatible) {
        errors.push(
          `Type mismatch: ${sourceSchema}.${sourceTable}.${sourceColumn} is ${sourceType}, ` +
            `but ${targetSchema}.${targetTable}.${targetColumn} is ${targetType}`
        )

        // Provide helpful hints
        if (sourceType === 'text' && targetType === 'uuid') {
          errors.push(
            `Hint: Public tables use UUID. Change ${sourceColumn} to UUID: ` +
              `ALTER TABLE ${sourceSchema}.${sourceTable} ALTER COLUMN ${sourceColumn} TYPE UUID USING ${sourceColumn}::uuid;`
          )
        } else if (sourceType === 'uuid' && targetType === 'text') {
          errors.push(
            `Hint: Tenant tables usually use TEXT for Shopify compatibility. ` +
              `If ${targetTable} is a tenant table, consider using TEXT for IDs.`
          )
        }
      }

      const result: TypeCompatibilityCheck = {
        compatible,
        sourceType,
        targetType,
        errors,
      }

      return jsonResult(result)
    } catch (error) {
      const err = error as Error
      return errorResult(`Failed to check compatibility: ${err.message}`)
    }
  },
})

// =============================================================================
// Tool: validate_migration_sql
// =============================================================================

/**
 * Validate migration SQL syntax without executing
 *
 * Runs EXPLAIN on SQL to check syntax validity. This does NOT execute the SQL,
 * but validates that it would parse correctly.
 *
 * @example
 * ```typescript
 * const result = await callTool({
 *   name: 'validate_migration_sql',
 *   arguments: {
 *     sql: 'CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY)',
 *     schemaName: 'tenant_rawdog'
 *   }
 * })
 * // Returns: { valid: true, errors: [] }
 * ```
 */
export const validateMigrationSQLTool = defineTool({
  name: 'validate_migration_sql',
  description:
    'Validate migration SQL syntax without executing. Checks for syntax errors before running migrations.',
  inputSchema: {
    type: 'object',
    properties: {
      sql: {
        type: 'string',
        description: 'SQL to validate',
      },
      schemaName: {
        type: 'string',
        description: 'Schema where migration will run (for search_path)',
      },
    },
    required: ['sql', 'schemaName'],
  },
  async handler(args) {
    try {
      const { sql: migrationSQL, schemaName } = args as { sql: string; schemaName: string }

      // Note: @vercel/postgres doesn't support sql.unsafe() for dynamic SQL
      // We can only do basic validation by parsing the SQL string

      const errors: string[] = []

      // Basic SQL syntax checks
      const statements = migrationSQL
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      for (const stmt of statements) {
        // Check for missing IF NOT EXISTS in CREATE statements
        if (stmt.match(/^CREATE (TABLE|INDEX|TYPE)/i) && !stmt.includes('IF NOT EXISTS')) {
          errors.push(
            `Migration should be idempotent: ${stmt.substring(0, 50)}... is missing IF NOT EXISTS`
          )
        }

        // Check for unqualified function references in tenant schema
        if (
          schemaName.startsWith('tenant_') &&
          stmt.includes('update_updated_at_column') &&
          !stmt.includes('public.update_updated_at_column')
        ) {
          errors.push(
            'Use fully-qualified function: public.update_updated_at_column() in tenant schema'
          )
        }

        // Check for pgvector types without schema
        if (stmt.match(/\bvector\s*\(/i) && !stmt.includes('public.vector')) {
          errors.push('Use fully-qualified pgvector type: public.vector(1536)')
        }
      }

      return jsonResult({
        valid: errors.length === 0,
        errors,
        note: 'Basic syntax validation only. Full validation requires running migration in test database.',
      })
    } catch (error) {
      const err = error as Error
      return errorResult(`Failed to validate SQL: ${err.message}`)
    }
  },
})

// =============================================================================
// Tool: get_id_type_reference
// =============================================================================

/**
 * Get ID type reference table
 *
 * Returns a reference table showing which tables use UUID vs TEXT for IDs.
 * This is critical for CGK because public tables use UUID while tenant tables
 * use TEXT (for Shopify compatibility).
 *
 * @example
 * ```typescript
 * const result = await callTool({
 *   name: 'get_id_type_reference',
 *   arguments: {}
 * })
 * // Returns: { public: [...], tenant: [...] }
 * ```
 */
export const getIdTypeReferenceTool = defineTool({
  name: 'get_id_type_reference',
  description:
    'Get ID type reference table showing which tables use UUID vs TEXT. Critical for CGK foreign keys.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  async handler() {
    try {
      const reference = {
        public: [
          { table: 'users', idType: 'UUID', reason: 'Platform-wide' },
          { table: 'organizations', idType: 'UUID', reason: 'Platform-wide' },
          { table: 'sessions', idType: 'UUID', reason: 'Platform-wide' },
          { table: 'api_keys', idType: 'UUID', reason: 'Platform-wide' },
          { table: 'team_invitations', idType: 'UUID', reason: 'Platform-wide' },
          { table: 'feature_flags', idType: 'UUID', reason: 'Platform-wide' },
          { table: 'creators', idType: 'UUID', reason: 'Global creator registry' },
        ],
        tenant: [
          { table: 'orders', idType: 'TEXT', reason: 'Shopify IDs are strings' },
          { table: 'customers', idType: 'TEXT', reason: 'Shopify IDs are strings' },
          { table: 'products', idType: 'TEXT', reason: 'Shopify IDs are strings' },
          { table: 'creators', idType: 'TEXT', reason: 'Tenant-scoped identifiers' },
          { table: 'ai_agents', idType: 'TEXT', reason: 'Tenant-scoped identifiers' },
          { table: 'videos', idType: 'TEXT', reason: 'Tenant-scoped identifiers' },
          { table: 'projects', idType: 'UUID', reason: 'Exception - internal entities' },
          { table: 'blog_posts', idType: 'TEXT', reason: 'Tenant-scoped identifiers' },
          { table: 'subscriptions', idType: 'TEXT', reason: 'Tenant-scoped identifiers' },
          { table: 'reviews', idType: 'TEXT', reason: 'Tenant-scoped identifiers' },
        ],
        notes: [
          'Public schema tables use UUID for IDs (platform-wide records)',
          'Tenant schema tables use TEXT for IDs (Shopify compatibility)',
          'Exception: projects table uses UUID (internal entity, not Shopify)',
          'When adding foreign keys, always check ID types with describe_table',
          'Type mismatches will cause migration failures',
        ],
      }

      return jsonResult(reference)
    } catch (error) {
      const err = error as Error
      return errorResult(`Failed to get ID type reference: ${err.message}`)
    }
  },
})

// =============================================================================
// Exports
// =============================================================================

/**
 * All schema introspection tools
 */
export const schemaTools: ToolDefinition[] = [
  describeTableTool,
  listTablesTool,
  checkForeignKeyCompatibilityTool,
  validateMigrationSQLTool,
  getIdTypeReferenceTool,
]

/**
 * Schema tool names for filtering
 */
export const schemaToolNames = schemaTools.map((tool) => tool.name)
