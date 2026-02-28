/**
 * SQL Pattern Enforcer Skill
 *
 * Validates @vercel/postgres sql template tag usage patterns:
 * - Arrays → PostgreSQL array literals (no direct array passing)
 * - Dates → ISO strings (no Date objects)
 * - Type conversion with toCamelCase (double cast through unknown)
 * - No SQL fragment composition
 * - No dynamic table names (use switch/case)
 * - QueryResultRow undefined checks
 * - No sql.unsafe() (doesn't exist)
 * - Unused variables → Remove or underscore with justification
 *
 * Usage: /sql-pattern-enforcer [--fix] [path]
 */

import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'
import { resolve } from 'path'

export default {
  name: 'sql-pattern-enforcer',
  version: '1.0.0',
  description: 'Validates @vercel/postgres SQL patterns from CLAUDE.md',

  async execute(args = {}) {
    const {
      fix = false,           // Auto-fix violations
      path: targetPath = '.', // Path to scan (default: current directory)
      verbose = false         // Detailed output
    } = args

    console.log('🔍 Scanning for SQL pattern violations...\n')

    // Find all TypeScript/JavaScript files
    const files = await glob('**/*.{ts,tsx,js,jsx}', {
      cwd: targetPath,
      ignore: [
        'node_modules/**',
        'dist/**',
        '.next/**',
        'build/**',
        'coverage/**',
        '**/*.test.{ts,tsx,js,jsx}',
        '**/*.spec.{ts,tsx,js,jsx}'
      ],
      absolute: true
    })

    const violations = []
    let filesScanned = 0
    let filesWithViolations = 0

    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      const fileViolations = []

      filesScanned++

      // Rule 1: No direct array passing (must use PostgreSQL array literals)
      lines.forEach((line, idx) => {
        // Look for sql`` with ANY(${variable})
        if (/sql`.*ANY\s*\(\s*\$\{[^}]+\}\s*\)/.test(line)) {
          // Check if it's using the array literal pattern
          if (!/\{\$\{[^}]+\.join\(['"],['"]\)\}\}`::/.test(line)) {
            fileViolations.push({
              file,
              line: idx + 1,
              column: line.indexOf('ANY('),
              severity: 'critical',
              rule: 'no-direct-array',
              message: 'Arrays cannot be passed directly - convert to PostgreSQL array literal',
              fix: generateArrayLiteralFix(line),
              snippet: line.trim()
            })
          }
        }

        // Look for sql`` with = ${array} or IN (${array})
        const arrayParamPattern = /sql`[^`]*(?:=|IN\s*\()\s*\$\{[a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]*\])?\}/
        if (arrayParamPattern.test(line) && !line.includes('.join(')) {
          const match = line.match(/\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/)
          if (match) {
            const varName = match[1]
            // Check if variable might be an array (common naming patterns)
            if (/s$|ids|list|items|values/i.test(varName)) {
              fileViolations.push({
                file,
                line: idx + 1,
                column: line.indexOf(match[0]),
                severity: 'warning',
                rule: 'no-direct-array',
                message: `Possible array parameter '${varName}' - verify or convert to array literal`,
                fix: null,
                snippet: line.trim()
              })
            }
          }
        }
      })

      // Rule 2: No Date objects (must use .toISOString())
      lines.forEach((line, idx) => {
        if (/sql`/.test(line)) {
          // Look for Date parameters without .toISOString()
          const datePattern = /\$\{[^}]*(?:Date|date|created_?at|updated_?at|expires_?at)[^}]*\}/
          if (datePattern.test(line) && !line.includes('.toISOString()')) {
            const match = line.match(/\$\{([^}]+)\}/)
            if (match && !match[1].includes('.toISOString()')) {
              fileViolations.push({
                file,
                line: idx + 1,
                column: line.indexOf(match[0]),
                severity: 'critical',
                rule: 'no-date-objects',
                message: 'Date objects must be converted to ISO strings with .toISOString()',
                fix: generateDateFix(match[1]),
                snippet: line.trim()
              })
            }
          }
        }
      })

      // Rule 3: Type conversion with toCamelCase requires double cast
      lines.forEach((line, idx) => {
        if (/toCamelCase\([^)]+\)\s+as\s+(?!unknown)/.test(line)) {
          fileViolations.push({
            file,
            line: idx + 1,
            column: line.indexOf('toCamelCase'),
            severity: 'critical',
            rule: 'no-single-cast',
            message: 'toCamelCase requires double cast: as Record<string, unknown> as unknown as Type',
            fix: generateDoubleCastFix(line),
            snippet: line.trim()
          })
        }

        // Direct cast without toCamelCase
        if (/result\.rows\[0\].*as\s+[A-Z]/.test(line) && !/as\s+unknown/.test(line)) {
          fileViolations.push({
            file,
            line: idx + 1,
            column: line.indexOf('result.rows[0]'),
            severity: 'warning',
            rule: 'no-single-cast',
            message: 'Direct cast from QueryResultRow - consider double cast through unknown',
            fix: null,
            snippet: line.trim()
          })
        }
      })

      // Rule 4: No SQL fragment composition
      lines.forEach((line, idx) => {
        // Look for assigning sql`` to a variable
        if (/(?:const|let|var)\s+\w+\s*=\s*sql`/.test(line)) {
          // Check if this variable is used in another sql`` template
          const match = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*sql`/)
          if (match) {
            const varName = match[1]
            const contextStart = Math.min(idx + 1, lines.length - 1)
            const contextEnd = Math.min(idx + 20, lines.length)
            const futureLines = lines.slice(contextStart, contextEnd).join('\n')

            if (new RegExp(`\\$\\{${varName}\\}`).test(futureLines)) {
              fileViolations.push({
                file,
                line: idx + 1,
                column: line.indexOf('sql`'),
                severity: 'critical',
                rule: 'no-fragment-composition',
                message: 'sql`` returns Promise, not composable fragment - use if/else branches instead',
                fix: generateConditionalQueryFix(),
                snippet: line.trim()
              })
            }
          }
        }
      })

      // Rule 5: No dynamic table names
      lines.forEach((line, idx) => {
        if (/sql`.*\$\{.*(?:table|Table|TABLE).*\}/.test(line) || /sql\.raw\(/.test(line)) {
          fileViolations.push({
            file,
            line: idx + 1,
            column: line.indexOf('${'),
            severity: 'critical',
            rule: 'no-dynamic-tables',
            message: 'Dynamic table names not supported - use explicit switch/case for each table',
            fix: generateSwitchCaseFix(),
            snippet: line.trim()
          })
        }
      })

      // Rule 6: QueryResultRow undefined checks
      lines.forEach((line, idx) => {
        // Look for result.rows[0] without null check
        if (/result\.rows\[0\]/.test(line) && !/result\.rows\[0\]\s*\?/.test(line)) {
          const nextLines = lines.slice(idx, idx + 3).join('\n')
          // Check if there's a null check nearby
          if (!/if\s*\(.*result\.rows\[0\]|!row|row\s*\?/.test(nextLines)) {
            fileViolations.push({
              file,
              line: idx + 1,
              column: line.indexOf('result.rows[0]'),
              severity: 'warning',
              rule: 'no-undefined-check',
              message: 'result.rows[0] may be undefined - add null check before using',
              fix: generateUndefinedCheckFix(),
              snippet: line.trim()
            })
          }
        }

        // Look for direct destructuring without check
        if (/const\s+\{[^}]+\}\s*=\s*result\.rows\[0\]/.test(line)) {
          fileViolations.push({
            file,
            line: idx + 1,
            column: line.indexOf('result.rows[0]'),
            severity: 'critical',
            rule: 'no-undefined-check',
            message: 'Destructuring result.rows[0] without undefined check will crash if no rows',
            fix: generateUndefinedCheckFix(),
            snippet: line.trim()
          })
        }
      })

      // Rule 7: No sql.unsafe() (doesn't exist)
      lines.forEach((line, idx) => {
        if (/sql\.unsafe\(/.test(line)) {
          fileViolations.push({
            file,
            line: idx + 1,
            column: line.indexOf('sql.unsafe'),
            severity: 'critical',
            rule: 'no-sql-unsafe',
            message: 'sql.unsafe() does not exist in @vercel/postgres - create separate query functions',
            fix: generateConditionalQueryFix(),
            snippet: line.trim()
          })
        }
      })

      // Rule 8: Unused variables (should be removed or underscored with justification)
      lines.forEach((line, idx) => {
        // Look for underscore-prefixed variables
        const underscoreMatch = line.match(/(?:const|let|var)\s+(_[a-zA-Z][a-zA-Z0-9_]*)\s*=/)
        if (underscoreMatch) {
          const varName = underscoreMatch[1]
          // Check if there's a justification comment nearby
          const contextStart = Math.max(0, idx - 2)
          const contextLines = lines.slice(contextStart, idx + 1).join('\n')

          if (!/\/\/.*(?:unused|intentionally|interface|signature|required by)/i.test(contextLines)) {
            fileViolations.push({
              file,
              line: idx + 1,
              column: line.indexOf(varName),
              severity: 'warning',
              rule: 'underscore-without-justification',
              message: `Underscore variable '${varName}' without justification comment - remove or explain why unused`,
              fix: null,
              snippet: line.trim()
            })
          }
        }

        // Look for variables that appear to be unused (defined but not referenced)
        const varMatch = line.match(/(?:const|let)\s+([a-zA-Z][a-zA-Z0-9_]*)\s*=/)
        if (varMatch && !line.includes('export')) {
          const varName = varMatch[1]
          // Check if variable is used in following lines (simple heuristic)
          const contextEnd = Math.min(idx + 50, lines.length)
          const futureLines = lines.slice(idx + 1, contextEnd).join('\n')
          const usagePattern = new RegExp(`\\b${varName}\\b`)

          if (!usagePattern.test(futureLines) && !varName.startsWith('_')) {
            fileViolations.push({
              file,
              line: idx + 1,
              column: line.indexOf(varName),
              severity: 'info',
              rule: 'potentially-unused',
              message: `Variable '${varName}' may be unused - consider removing or prefixing with underscore`,
              fix: null,
              snippet: line.trim()
            })
          }
        }
      })

      if (fileViolations.length > 0) {
        filesWithViolations++
        violations.push(...fileViolations)

        if (fix) {
          // Apply fixes where available
          const fixableViolations = fileViolations.filter(v => v.fix)
          if (fixableViolations.length > 0) {
            console.log(`  ✏️  Found ${fixableViolations.length} fixable violation(s) in ${file}`)
            console.log(`      (Auto-fix implementation requires manual review)`)
          }
        }
      }
    }

    // Report results
    console.log(`\n📊 Scan Results:`)
    console.log(`   Files scanned: ${filesScanned}`)
    console.log(`   Files with violations: ${filesWithViolations}`)
    console.log(`   Total violations: ${violations.length}\n`)

    if (violations.length > 0) {
      console.log('❌ SQL Pattern Violations Found:\n')

      // Group by rule
      const byRule = violations.reduce((acc, v) => {
        if (!acc[v.rule]) acc[v.rule] = []
        acc[v.rule].push(v)
        return acc
      }, {})

      // Group by severity for summary
      const bySeverity = violations.reduce((acc, v) => {
        if (!acc[v.severity]) acc[v.severity] = 0
        acc[v.severity]++
        return acc
      }, {})

      Object.entries(byRule).forEach(([rule, ruleViolations]) => {
        console.log(`\n  ${getRuleIcon(rule)} ${getRuleTitle(rule)} (${ruleViolations.length})`)
        ruleViolations.forEach((v, i) => {
          if (verbose || i < 5) {
            const relativePath = v.file.replace(process.cwd(), '.')
            console.log(`    ${relativePath}:${v.line} [${v.severity}]`)
            console.log(`      ${v.message}`)
            console.log(`      ${v.snippet}`)
            if (v.fix) {
              console.log(`      💡 Fix: ${JSON.stringify(v.fix, null, 2)}`)
            }
            console.log('')
          }
        })
        if (!verbose && ruleViolations.length > 5) {
          console.log(`    ... and ${ruleViolations.length - 5} more\n`)
        }
      })

      console.log('\n📝 Severity Summary:')
      console.log(`   Critical: ${bySeverity.critical || 0}`)
      console.log(`   Warning: ${bySeverity.warning || 0}`)
      console.log(`   Info: ${bySeverity.info || 0}\n`)

      console.log('📖 Remediation Guide:')
      console.log('  1. Arrays → Use PostgreSQL array literals: ${`{${ids.join(\',\')}}`}::text[]')
      console.log('  2. Dates → Convert to ISO strings: ${date.toISOString()}')
      console.log('  3. Type casts → Double cast: as Record<string, unknown> as unknown as Type')
      console.log('  4. No fragments → Use if/else branches for conditional queries')
      console.log('  5. No dynamic tables → Use explicit switch/case for each table')
      console.log('  6. result.rows[0] → Check for undefined: const row = result.rows[0]; if (!row) ...')
      console.log('  7. No sql.unsafe() → Create separate query functions')
      console.log('  8. Unused vars → Remove or prefix with _ and add justification comment\n')
      console.log('  See CLAUDE.md section "@vercel/postgres SQL Patterns (CRITICAL)" for details\n')

      return {
        status: 'fail',
        violations,
        summary: {
          filesScanned,
          filesWithViolations,
          totalViolations: violations.length,
          critical: bySeverity.critical || 0,
          warning: bySeverity.warning || 0,
          info: bySeverity.info || 0
        }
      }
    }

    console.log('✅ No SQL pattern violations found!\n')

    return {
      status: 'pass',
      violations: [],
      summary: {
        filesScanned,
        filesWithViolations: 0,
        totalViolations: 0,
        critical: 0,
        warning: 0,
        info: 0
      }
    }
  }
}

// Helper functions for generating fix suggestions

function generateArrayLiteralFix(line) {
  return {
    type: 'array-literal',
    pattern: '${`{${arrayName.join(\',\')}}`}::text[]',
    suggestion: 'Convert array to PostgreSQL array literal with join'
  }
}

function generateDateFix(dateExpr) {
  return {
    type: 'date-conversion',
    suggestion: `\${${dateExpr}.toISOString()}`
  }
}

function generateDoubleCastFix(line) {
  return {
    type: 'double-cast',
    suggestion: 'as Record<string, unknown> as unknown as YourType'
  }
}

function generateConditionalQueryFix() {
  return {
    type: 'conditional-query',
    suggestion: 'Use if/else branches:\nif (condition) {\n  return sql`...`\n} else {\n  return sql`...`\n}'
  }
}

function generateSwitchCaseFix() {
  return {
    type: 'switch-case',
    suggestion: 'switch (entityType) {\n  case \'table1\': return sql`UPDATE table1 ...`\n  case \'table2\': return sql`UPDATE table2 ...`\n}'
  }
}

function generateUndefinedCheckFix() {
  return {
    type: 'undefined-check',
    suggestion: 'const row = result.rows[0]\nif (!row) return null // or throw\nreturn mapToEntity(row)'
  }
}

function getRuleIcon(rule) {
  const icons = {
    'no-direct-array': '📋',
    'no-date-objects': '📅',
    'no-single-cast': '🔄',
    'no-fragment-composition': '🧩',
    'no-dynamic-tables': '📊',
    'no-undefined-check': '⚠️',
    'no-sql-unsafe': '🚫',
    'underscore-without-justification': '❓',
    'potentially-unused': 'ℹ️'
  }
  return icons[rule] || '⚠️'
}

function getRuleTitle(rule) {
  const titles = {
    'no-direct-array': 'Arrays without PostgreSQL literals',
    'no-date-objects': 'Date objects without .toISOString()',
    'no-single-cast': 'Type casts without double cast',
    'no-fragment-composition': 'SQL fragment composition (not supported)',
    'no-dynamic-tables': 'Dynamic table names (not supported)',
    'no-undefined-check': 'Missing undefined checks on result.rows[0]',
    'no-sql-unsafe': 'sql.unsafe() usage (does not exist)',
    'underscore-without-justification': 'Underscore vars without comment',
    'potentially-unused': 'Potentially unused variables'
  }
  return titles[rule] || rule
}
