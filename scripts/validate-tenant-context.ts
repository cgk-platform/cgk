#!/usr/bin/env tsx
/**
 * Tenant Context Validator
 *
 * Validates that all tenant-scoped operations use proper isolation patterns:
 * - SQL queries wrapped in withTenant()
 * - Cache operations using createTenantCache()
 * - Background jobs including tenantId in payload
 *
 * Usage:
 *   pnpm exec tsx scripts/validate-tenant-context.ts [path]
 *   pnpm exec tsx scripts/validate-tenant-context.ts --verbose
 *
 * Exit codes:
 *   0 - No violations found
 *   1 - Violations found
 */

import { readFileSync } from 'fs'
import { glob } from 'glob'
import { resolve } from 'path'

interface Violation {
  file: string
  line: number
  column: number
  severity: 'critical'
  rule: 'no-raw-sql' | 'no-raw-cache' | 'no-tenant-in-job'
  message: string
  snippet: string
}

interface ScanResult {
  status: 'pass' | 'fail'
  violations: Violation[]
  summary: {
    filesScanned: number
    filesWithViolations: number
    totalViolations: number
    critical: number
  }
}

async function scanFiles(targetPath: string, verbose: boolean): Promise<ScanResult> {
  console.log('🔍 Scanning for tenant isolation violations...\n')

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
      '**/*.spec.{ts,tsx,js,jsx}',
    ],
    absolute: true,
    nodir: true, // Only files, no directories
  })

  const violations: Violation[] = []
  let filesScanned = 0
  let filesWithViolations = 0

  for (const file of files) {
    const content = readFileSync(file, 'utf-8')
    const lines = content.split('\n')
    const fileViolations: Violation[] = []

    filesScanned++

    // Rule 1: No raw SQL queries (must use withTenant)
    lines.forEach((line, idx) => {
      // Check for sql` template literal usage
      if (/await\s+sql`/.test(line) || /return\s+sql`/.test(line)) {
        // Check if withTenant is used in surrounding context (within 10 lines before)
        const contextStart = Math.max(0, idx - 10)
        const contextLines = lines.slice(contextStart, idx + 1).join('\n')

        if (!/withTenant\s*\(/.test(contextLines)) {
          fileViolations.push({
            file,
            line: idx + 1,
            column: line.indexOf('sql`'),
            severity: 'critical',
            rule: 'no-raw-sql',
            message: 'SQL query without withTenant() wrapper',
            snippet: line.trim(),
          })
        }
      }
    })

    // Rule 2: No raw Redis/cache access (must use createTenantCache)
    const cachePattern = /\b(redis|cache)\.(get|set|del|hget|hset|exists|expire)\s*\(/
    lines.forEach((line, idx) => {
      if (cachePattern.test(line)) {
        // Check if createTenantCache is used in file
        if (!/createTenantCache\s*\(/.test(content)) {
          fileViolations.push({
            file,
            line: idx + 1,
            column: line.search(cachePattern),
            severity: 'critical',
            rule: 'no-raw-cache',
            message: 'Direct cache access without tenant isolation',
            snippet: line.trim(),
          })
        }
      }
    })

    // Rule 3: Background jobs must include tenantId
    const jobPattern = /jobs\.send\s*\(/
    lines.forEach((line, idx) => {
      if (jobPattern.test(line)) {
        // Find the payload object (may span multiple lines)
        let endIdx = idx
        let braceCount = 0
        let foundPayload = false

        for (let i = idx; i < Math.min(idx + 10, lines.length); i++) {
          const searchLine = lines[i]
          if (searchLine.includes('{')) {
            braceCount += (searchLine.match(/{/g) || []).length
            foundPayload = true
          }
          if (searchLine.includes('}')) {
            braceCount -= (searchLine.match(/}/g) || []).length
          }
          if (foundPayload && braceCount === 0) {
            endIdx = i
            break
          }
        }

        const payloadLines = lines.slice(idx, endIdx + 1).join('\n')

        if (!/tenantId\s*[:\,]/.test(payloadLines)) {
          fileViolations.push({
            file,
            line: idx + 1,
            column: line.search(jobPattern),
            severity: 'critical',
            rule: 'no-tenant-in-job',
            message: 'Job payload missing tenantId field',
            snippet: payloadLines.split('\n')[0].trim() + '...',
          })
        }
      }
    })

    if (fileViolations.length > 0) {
      filesWithViolations++
      violations.push(...fileViolations)
    }
  }

  // Report results
  console.log(`\n📊 Scan Results:`)
  console.log(`   Files scanned: ${filesScanned}`)
  console.log(`   Files with violations: ${filesWithViolations}`)
  console.log(`   Total violations: ${violations.length}\n`)

  if (violations.length > 0) {
    console.log('❌ Tenant Isolation Violations Found:\n')

    // Group by rule
    const byRule = violations.reduce(
      (acc, v) => {
        if (!acc[v.rule]) acc[v.rule] = []
        acc[v.rule].push(v)
        return acc
      },
      {} as Record<string, Violation[]>
    )

    Object.entries(byRule).forEach(([rule, ruleViolations]) => {
      console.log(
        `\n  ${getRuleIcon(rule)} ${getRuleTitle(rule)} (${ruleViolations.length})`
      )
      ruleViolations.forEach((v, i) => {
        if (verbose || i < 5) {
          const relativePath = v.file.replace(process.cwd(), '.')
          console.log(`    ${relativePath}:${v.line}`)
          console.log(`      ${v.message}`)
          console.log(`      ${v.snippet}`)
          console.log('')
        }
      })
      if (!verbose && ruleViolations.length > 5) {
        console.log(`    ... and ${ruleViolations.length - 5} more\n`)
      }
    })

    console.log('\n📝 Remediation:')
    console.log(
      '  1. Wrap SQL queries in withTenant(): withTenant(tenantId, () => sql`...`)'
    )
    console.log('  2. Use createTenantCache(tenantId) instead of direct cache access')
    console.log('  3. Include { tenantId } in all job payloads\n')

    return {
      status: 'fail',
      violations,
      summary: {
        filesScanned,
        filesWithViolations,
        totalViolations: violations.length,
        critical: violations.filter((v) => v.severity === 'critical').length,
      },
    }
  }

  console.log('✅ No tenant isolation violations found!\n')

  return {
    status: 'pass',
    violations: [],
    summary: {
      filesScanned,
      filesWithViolations: 0,
      totalViolations: 0,
      critical: 0,
    },
  }
}

// Helper functions
function getRuleIcon(rule: string): string {
  const icons: Record<string, string> = {
    'no-raw-sql': '🗄️',
    'no-raw-cache': '💾',
    'no-tenant-in-job': '⚙️',
  }
  return icons[rule] || '⚠️'
}

function getRuleTitle(rule: string): string {
  const titles: Record<string, string> = {
    'no-raw-sql': 'SQL without withTenant()',
    'no-raw-cache': 'Cache without createTenantCache()',
    'no-tenant-in-job': 'Job missing tenantId',
  }
  return titles[rule] || rule
}

// CLI execution
async function main() {
  const args = process.argv.slice(2)
  const verbose = args.includes('--verbose') || args.includes('-v')
  const pathArg = args.find((arg) => !arg.startsWith('--'))
  const targetPath = resolve(process.cwd(), pathArg || '.')

  const result = await scanFiles(targetPath, verbose)

  process.exit(result.status === 'pass' ? 0 : 1)
}

main().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})
