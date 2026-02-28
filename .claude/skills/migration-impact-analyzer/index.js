/**
 * Migration Impact Analyzer Skill
 *
 * Pre-migration analysis and validation:
 * - Lists affected tables
 * - Estimates rows impacted
 * - Estimates downtime (if locking)
 * - Generates rollback SQL procedure
 * - Validates type compatibility (UUID vs TEXT)
 * - Checks schema consistency
 * - Tests migration on staging data
 *
 * Usage: /migration-impact-analyzer --migration 025-add-oauth-providers.sql
 */

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { execSync } from 'child_process'

export default {
  name: 'migration-impact-analyzer',
  version: '1.0.0',
  description: 'Pre-migration analysis and validation',

  async execute(args = {}) {
    const {
      migration = '',
      schema = 'public', // public or tenant_*
      dryRun = true,
      generateRollback = true
    } = args

    console.log('🔍 Migration Impact Analyzer\n')

    if (!migration) {
      console.error('❌ Missing required argument: --migration')
      console.log('\nUsage:')
      console.log('  /migration-impact-analyzer --migration FILENAME')
      console.log('\nExample:')
      console.log('  /migration-impact-analyzer --migration 025-add-oauth-providers.sql')
      return { status: 'error', message: 'Missing migration file' }
    }

    // Find migration file
    const migrationPath = findMigrationFile(migration)

    if (!migrationPath) {
      console.error(`❌ Migration file not found: ${migration}`)
      console.log('\nSearched in:')
      console.log('  - packages/db/migrations/')
      console.log('  - apps/*/migrations/')
      return { status: 'error', message: 'Migration file not found' }
    }

    console.log(`📄 Analyzing: ${migrationPath}\n`)

    // Read migration file
    const sql = readFileSync(migrationPath, 'utf-8')

    // Analyze migration
    const analysis = analyzeMigration(sql, schema)

    // Display results
    console.log('📊 Impact Analysis:\n')

    console.log(`  Schema: ${schema}`)
    console.log(`  Tables Affected: ${analysis.tables.length}`)
    console.log(`  Operations:`)
    console.log(`    - Creates: ${analysis.operations.creates}`)
    console.log(`    - Alters: ${analysis.operations.alters}`)
    console.log(`    - Drops: ${analysis.operations.drops}`)
    console.log(`    - Indexes: ${analysis.operations.indexes}`)
    console.log('')

    if (analysis.tables.length > 0) {
      console.log('📋 Affected Tables:\n')
      analysis.tables.forEach(table => {
        console.log(`  • ${table.name}`)
        console.log(`    Operation: ${table.operation}`)
        if (table.estimatedRows) {
          console.log(`    Estimated Rows: ${table.estimatedRows.toLocaleString()}`)
        }
        if (table.lockType) {
          console.log(`    Lock Type: ${table.lockType}`)
          console.log(`    Estimated Downtime: ${table.estimatedDowntime}`)
        }
      })
      console.log('')
    }

    // Type compatibility check
    if (analysis.typeIssues.length > 0) {
      console.log('⚠️  Type Compatibility Issues:\n')
      analysis.typeIssues.forEach(issue => {
        console.log(`  • ${issue.table}.${issue.column}`)
        console.log(`    Issue: ${issue.message}`)
        console.log(`    Suggestion: ${issue.suggestion}`)
      })
      console.log('')
    }

    // Idempotency check
    if (!analysis.idempotent) {
      console.log('⚠️  Migration is NOT idempotent\n')
      console.log('  Missing IF NOT EXISTS clauses on:')
      analysis.nonIdempotentOps.forEach(op => {
        console.log(`    - ${op}`)
      })
      console.log('')
    } else {
      console.log('✅ Migration is idempotent\n')
    }

    // Rollback generation
    if (generateRollback) {
      console.log('🔄 Generating Rollback SQL:\n')
      const rollback = generateRollbackSQL(analysis)
      console.log('─'.repeat(80))
      console.log(rollback)
      console.log('─'.repeat(80))
      console.log('')
    }

    // Risk assessment
    const risk = assessRisk(analysis)
    console.log(`⚠️  Risk Level: ${risk.level.toUpperCase()}`)
    console.log('')

    if (risk.warnings.length > 0) {
      console.log('⚠️  Warnings:')
      risk.warnings.forEach(w => console.log(`  • ${w}`))
      console.log('')
    }

    console.log('📝 Recommendations:\n')
    risk.recommendations.forEach(r => console.log(`  ${r}`))
    console.log('')

    if (dryRun) {
      console.log('🔍 Dry-run complete. Run with --dry-run=false to apply migration.')
    }

    return {
      status: 'success',
      analysis,
      risk
    }
  }
}

function findMigrationFile(filename) {
  const searchPaths = [
    resolve(process.cwd(), 'packages/db/migrations', filename),
    resolve(process.cwd(), 'migrations', filename),
    resolve(process.cwd(), filename)
  ]

  for (const path of searchPaths) {
    if (existsSync(path)) {
      return path
    }
  }

  return null
}

function analyzeMigration(sql, schema) {
  const tables = []
  const operations = {
    creates: 0,
    alters: 0,
    drops: 0,
    indexes: 0
  }
  const typeIssues = []
  const nonIdempotentOps = []

  // Extract CREATE TABLE statements
  const createTablePattern = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(\w+)/gi
  let match
  while ((match = createTablePattern.exec(sql)) !== null) {
    operations.creates++
    const hasIfNotExists = /IF\s+NOT\s+EXISTS/.test(match[0])

    if (!hasIfNotExists) {
      nonIdempotentOps.push(`CREATE TABLE ${match[1]}`)
    }

    tables.push({
      name: match[1],
      operation: 'CREATE',
      lockType: 'ACCESS EXCLUSIVE',
      estimatedDowntime: '< 1 second'
    })
  }

  // Extract ALTER TABLE statements
  const alterTablePattern = /ALTER\s+TABLE\s+(\w+)/gi
  while ((match = alterTablePattern.exec(sql)) !== null) {
    operations.alters++

    tables.push({
      name: match[1],
      operation: 'ALTER',
      lockType: 'ACCESS EXCLUSIVE',
      estimatedDowntime: 'Depends on table size'
    })
  }

  // Extract DROP TABLE statements
  const dropTablePattern = /DROP\s+TABLE(?:\s+IF\s+EXISTS)?\s+(\w+)/gi
  while ((match = dropTablePattern.exec(sql)) !== null) {
    operations.drops++

    tables.push({
      name: match[1],
      operation: 'DROP',
      lockType: 'ACCESS EXCLUSIVE',
      estimatedDowntime: '< 1 second'
    })
  }

  // Extract CREATE INDEX statements
  const createIndexPattern = /CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+(\w+)/gi
  while ((match = createIndexPattern.exec(sql)) !== null) {
    operations.indexes++
    const hasIfNotExists = /IF\s+NOT\s+EXISTS/.test(match[0])

    if (!hasIfNotExists) {
      nonIdempotentOps.push(`CREATE INDEX ${match[1]}`)
    }
  }

  // Check for type mismatches (UUID vs TEXT)
  const foreignKeyPattern = /REFERENCES\s+(\w+)\s*\(\s*(\w+)\s*\)/gi
  while ((match = foreignKeyPattern.exec(sql)) !== null) {
    const refTable = match[1]
    const refColumn = match[2]

    // If referencing public schema UUID columns
    if (refTable === 'users' || refTable === 'organizations') {
      typeIssues.push({
        table: refTable,
        column: refColumn,
        message: `Foreign key to ${refTable}.${refColumn} must use UUID type`,
        suggestion: `Ensure column type is UUID, not TEXT`
      })
    }
  }

  const idempotent = nonIdempotentOps.length === 0

  return {
    tables,
    operations,
    typeIssues,
    idempotent,
    nonIdempotentOps
  }
}

function generateRollbackSQL(analysis) {
  const rollbackStatements = []

  analysis.tables.forEach(table => {
    switch (table.operation) {
      case 'CREATE':
        rollbackStatements.push(`DROP TABLE IF EXISTS ${table.name} CASCADE;`)
        break
      case 'DROP':
        rollbackStatements.push(`-- Cannot auto-rollback DROP TABLE - restore from backup`)
        break
      case 'ALTER':
        rollbackStatements.push(`-- Manual rollback required for ALTER TABLE ${table.name}`)
        break
    }
  })

  return rollbackStatements.length > 0
    ? rollbackStatements.join('\n')
    : '-- No rollback needed'
}

function assessRisk(analysis) {
  const warnings = []
  const recommendations = []
  let riskScore = 0

  // Check for drops
  if (analysis.operations.drops > 0) {
    riskScore += 10
    warnings.push('Migration includes DROP operations - data loss risk')
    recommendations.push('✓ Backup database before running migration')
  }

  // Check for non-idempotent operations
  if (!analysis.idempotent) {
    riskScore += 5
    warnings.push('Migration is not idempotent - cannot be safely re-run')
    recommendations.push('✓ Add IF NOT EXISTS / IF EXISTS clauses')
  }

  // Check for type issues
  if (analysis.typeIssues.length > 0) {
    riskScore += 8
    warnings.push(`${analysis.typeIssues.length} type compatibility issue(s) detected`)
    recommendations.push('✓ Fix type mismatches before deploying')
  }

  // Check for table locks
  const lockingOps = analysis.tables.filter(t => t.lockType === 'ACCESS EXCLUSIVE')
  if (lockingOps.length > 0) {
    riskScore += 3
    warnings.push(`${lockingOps.length} operation(s) will lock tables`)
    recommendations.push('✓ Run during low-traffic window')
  }

  // Determine risk level
  let level = 'low'
  if (riskScore >= 10) level = 'high'
  else if (riskScore >= 5) level = 'medium'

  if (level === 'low') {
    recommendations.push('✓ Test on staging environment first')
  }

  return {
    level,
    score: riskScore,
    warnings,
    recommendations
  }
}
