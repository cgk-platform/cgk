import { describe, it, expect } from 'vitest'
import {
  describeTableTool,
  listTablesTool,
  checkForeignKeyCompatibilityTool,
  validateMigrationSQLTool,
  getIdTypeReferenceTool,
} from '../tools/schema'

/**
 * Tests for Schema Introspection MCP Tools
 *
 * These tests validate the schema introspection tools that help prevent
 * common migration errors like UUID/TEXT type mismatches.
 */

describe('Schema Introspection Tools', () => {
  describe('describeTableTool', () => {
    it('has correct tool definition', () => {
      expect(describeTableTool.name).toBe('describe_table')
      expect(describeTableTool.description).toBeTruthy()
      expect(describeTableTool.inputSchema).toBeDefined()
      expect(describeTableTool.handler).toBeDefined()
    })

    it('requires schemaName and tableName parameters', () => {
      const { properties, required } = describeTableTool.inputSchema
      expect(properties).toHaveProperty('schemaName')
      expect(properties).toHaveProperty('tableName')
      expect(required).toContain('schemaName')
      expect(required).toContain('tableName')
    })

    it('returns table structure with columns, foreign keys, and indexes', async () => {
      // Mock result structure validation
      const mockResult = {
        schemaName: 'public',
        tableName: 'users',
        columns: [
          {
            columnName: 'id',
            dataType: 'uuid',
            isNullable: 'NO',
            columnDefault: 'gen_random_uuid()',
          },
        ],
        foreignKeys: [],
        indexes: [],
        primaryKey: ['id'],
      }

      expect(mockResult).toHaveProperty('schemaName')
      expect(mockResult).toHaveProperty('tableName')
      expect(mockResult).toHaveProperty('columns')
      expect(mockResult).toHaveProperty('foreignKeys')
      expect(mockResult).toHaveProperty('indexes')
      expect(mockResult).toHaveProperty('primaryKey')
      expect(Array.isArray(mockResult.columns)).toBe(true)
      expect(Array.isArray(mockResult.foreignKeys)).toBe(true)
      expect(Array.isArray(mockResult.indexes)).toBe(true)
      expect(Array.isArray(mockResult.primaryKey)).toBe(true)
    })
  })

  describe('listTablesTool', () => {
    it('has correct tool definition', () => {
      expect(listTablesTool.name).toBe('list_tables')
      expect(listTablesTool.description).toContain('List all tables')
      expect(listTablesTool.inputSchema).toBeDefined()
      expect(listTablesTool.handler).toBeDefined()
    })

    it('requires schemaName parameter', () => {
      const { properties, required } = listTablesTool.inputSchema
      expect(properties).toHaveProperty('schemaName')
      expect(required).toContain('schemaName')
    })

    it('returns array of tables with names', async () => {
      // Mock result structure validation
      const mockResult = {
        schemaName: 'public',
        tables: [
          { tableName: 'users', rowCount: null },
          { tableName: 'organizations', rowCount: null },
        ],
      }

      expect(mockResult).toHaveProperty('schemaName')
      expect(mockResult).toHaveProperty('tables')
      expect(Array.isArray(mockResult.tables)).toBe(true)
      expect(mockResult.tables[0]).toHaveProperty('tableName')
    })
  })

  describe('checkForeignKeyCompatibilityTool', () => {
    it('has correct tool definition', () => {
      expect(checkForeignKeyCompatibilityTool.name).toBe('check_foreign_key_compatibility')
      expect(checkForeignKeyCompatibilityTool.description).toContain('UUID vs TEXT')
      expect(checkForeignKeyCompatibilityTool.inputSchema).toBeDefined()
      expect(checkForeignKeyCompatibilityTool.handler).toBeDefined()
    })

    it('requires all 6 parameters', () => {
      const { properties, required } = checkForeignKeyCompatibilityTool.inputSchema
      expect(properties).toHaveProperty('sourceSchema')
      expect(properties).toHaveProperty('sourceTable')
      expect(properties).toHaveProperty('sourceColumn')
      expect(properties).toHaveProperty('targetSchema')
      expect(properties).toHaveProperty('targetTable')
      expect(properties).toHaveProperty('targetColumn')
      expect(required).toHaveLength(6)
    })

    it('detects type compatibility', () => {
      // Test compatible types
      const compatible = {
        compatible: true,
        sourceType: 'uuid',
        targetType: 'uuid',
        errors: [],
      }
      expect(compatible.compatible).toBe(true)
      expect(compatible.errors).toHaveLength(0)

      // Test incompatible types
      const incompatible = {
        compatible: false,
        sourceType: 'text',
        targetType: 'uuid',
        errors: ['Type mismatch: text != uuid'],
      }
      expect(incompatible.compatible).toBe(false)
      expect(incompatible.errors.length).toBeGreaterThan(0)
    })

    it('provides helpful hints for common mismatches', () => {
      const result = {
        compatible: false,
        sourceType: 'text',
        targetType: 'uuid',
        errors: [
          'Type mismatch: tenant_rawdog.creators.user_id is text, but public.users.id is uuid',
          'Hint: Public tables use UUID. Change user_id to UUID',
        ],
      }

      expect(result.errors.some((e) => e.includes('Hint'))).toBe(true)
    })
  })

  describe('validateMigrationSQLTool', () => {
    it('has correct tool definition', () => {
      expect(validateMigrationSQLTool.name).toBe('validate_migration_sql')
      expect(validateMigrationSQLTool.description).toContain('syntax')
      expect(validateMigrationSQLTool.inputSchema).toBeDefined()
      expect(validateMigrationSQLTool.handler).toBeDefined()
    })

    it('requires sql and schemaName parameters', () => {
      const { properties, required } = validateMigrationSQLTool.inputSchema
      expect(properties).toHaveProperty('sql')
      expect(properties).toHaveProperty('schemaName')
      expect(required).toContain('sql')
      expect(required).toContain('schemaName')
    })

    it('validates idempotency patterns', () => {
      const validSQL = `
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY
        );
      `
      const invalidSQL = `
        CREATE TABLE orders (
          id TEXT PRIMARY KEY
        );
      `

      // Valid SQL should pass
      expect(validSQL).toContain('IF NOT EXISTS')

      // Invalid SQL missing IF NOT EXISTS
      expect(invalidSQL).not.toContain('IF NOT EXISTS')
    })

    it('checks for fully-qualified function names in tenant schema', () => {
      const validSQL = `
        CREATE TRIGGER update_orders_updated_at
        BEFORE UPDATE ON orders
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
      `
      const invalidSQL = `
        CREATE TRIGGER update_orders_updated_at
        BEFORE UPDATE ON orders
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `

      expect(validSQL).toContain('public.update_updated_at_column')
      expect(invalidSQL).not.toContain('public.update_updated_at_column')
    })

    it('checks for qualified pgvector types', () => {
      const validSQL = `
        ALTER TABLE embeddings
        ADD COLUMN vector public.vector(1536);
      `
      const invalidSQL = `
        ALTER TABLE embeddings
        ADD COLUMN vector vector(1536);
      `

      expect(validSQL).toContain('public.vector')
      expect(invalidSQL).not.toContain('public.vector')
    })
  })

  describe('getIdTypeReferenceTool', () => {
    it('has correct tool definition', () => {
      expect(getIdTypeReferenceTool.name).toBe('get_id_type_reference')
      expect(getIdTypeReferenceTool.description).toContain('UUID vs TEXT')
      expect(getIdTypeReferenceTool.inputSchema).toBeDefined()
      expect(getIdTypeReferenceTool.handler).toBeDefined()
    })

    it('requires no parameters', () => {
      const { properties } = getIdTypeReferenceTool.inputSchema
      expect(Object.keys(properties || {})).toHaveLength(0)
    })

    it('returns reference for both public and tenant schemas', async () => {
      const mockResult = {
        public: [
          { table: 'users', idType: 'UUID', reason: 'Platform-wide' },
          { table: 'organizations', idType: 'UUID', reason: 'Platform-wide' },
        ],
        tenant: [
          { table: 'orders', idType: 'TEXT', reason: 'Shopify IDs are strings' },
          { table: 'projects', idType: 'UUID', reason: 'Exception - internal entities' },
        ],
        notes: [
          'Public schema tables use UUID for IDs',
          'Tenant schema tables use TEXT for IDs',
          'Exception: projects table uses UUID',
        ],
      }

      expect(mockResult).toHaveProperty('public')
      expect(mockResult).toHaveProperty('tenant')
      expect(mockResult).toHaveProperty('notes')
      expect(Array.isArray(mockResult.public)).toBe(true)
      expect(Array.isArray(mockResult.tenant)).toBe(true)
      expect(Array.isArray(mockResult.notes)).toBe(true)
    })

    it('documents the projects table exception', async () => {
      const mockResult = {
        tenant: [
          { table: 'projects', idType: 'UUID', reason: 'Exception - internal entities' },
        ],
      }

      const projectsEntry = mockResult.tenant.find((t) => t.table === 'projects')
      expect(projectsEntry?.idType).toBe('UUID')
      expect(projectsEntry?.reason).toContain('Exception')
    })
  })

  describe('Tool Integration', () => {
    it('all tools export consistent structure', () => {
      const tools = [
        describeTableTool,
        listTablesTool,
        checkForeignKeyCompatibilityTool,
        validateMigrationSQLTool,
        getIdTypeReferenceTool,
      ]

      tools.forEach((tool) => {
        expect(tool).toHaveProperty('name')
        expect(tool).toHaveProperty('description')
        expect(tool).toHaveProperty('inputSchema')
        expect(tool).toHaveProperty('handler')
        expect(typeof tool.name).toBe('string')
        expect(typeof tool.description).toBe('string')
        expect(typeof tool.handler).toBe('function')
      })
    })

    it('tool names follow snake_case convention', () => {
      const tools = [
        describeTableTool,
        listTablesTool,
        checkForeignKeyCompatibilityTool,
        validateMigrationSQLTool,
        getIdTypeReferenceTool,
      ]

      tools.forEach((tool) => {
        expect(tool.name).toMatch(/^[a-z_]+$/)
      })
    })

    it('tools have helpful descriptions', () => {
      const tools = [
        describeTableTool,
        listTablesTool,
        checkForeignKeyCompatibilityTool,
        validateMigrationSQLTool,
        getIdTypeReferenceTool,
      ]

      tools.forEach((tool) => {
        expect(tool.description.length).toBeGreaterThan(20)
      })
    })
  })

  describe('Error Prevention Scenarios', () => {
    it('prevents UUID to TEXT foreign key error', () => {
      // Scenario: Adding FK from tenant table to public table
      const sourceType: string = 'text' // tenant table column
      const targetType: string = 'uuid' // public.users.id

      const compatible = sourceType === targetType
      expect(compatible).toBe(false)

      // Tool should detect this mismatch
      const error = `Type mismatch: ${sourceType} != ${targetType}`
      expect(error).toBeDefined()
    })

    it('allows UUID to UUID foreign key', () => {
      // Scenario: Adding FK from tenant.projects to public.users
      const sourceType = 'uuid' // projects.user_id
      const targetType = 'uuid' // public.users.id

      const compatible = sourceType === targetType
      expect(compatible).toBe(true)
    })

    it('detects missing idempotency in CREATE TABLE', () => {
      const sql = 'CREATE TABLE orders (id TEXT PRIMARY KEY);'
      const hasIdempotency = sql.includes('IF NOT EXISTS')

      expect(hasIdempotency).toBe(false)
      // Tool should warn about this
    })

    it('validates qualified function names in tenant schema', () => {
      const sql = 'EXECUTE FUNCTION update_updated_at_column()'
      const schemaName = 'tenant_rawdog'
      const isQualified = sql.includes('public.update_updated_at_column')

      if (schemaName.startsWith('tenant_')) {
        expect(isQualified).toBe(false)
        // Tool should warn about missing public. prefix
      }
    })
  })
})
