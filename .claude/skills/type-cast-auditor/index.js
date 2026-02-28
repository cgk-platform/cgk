/**
 * Type Cast Auditor Skill
 *
 * Detects and fixes unsafe type casts that violate CLAUDE.md patterns:
 * - WRONG: const config = action.config as ScheduleFollowupConfig
 * - CORRECT: const config = action.config as unknown as ScheduleFollowupConfig
 *
 * Scans for single-cast "as X" patterns and auto-fixes with double-cast.
 *
 * Usage: /type-cast-auditor --fix --path apps/admin
 */

import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'

export default {
  name: 'type-cast-auditor',
  version: '1.0.0',
  description: 'Detects and fixes unsafe type casts',

  async execute(args = {}) {
    const {
      fix = false,
      path: targetPath = '.',
      verbose = false
    } = args

    console.log('🔍 Type Cast Auditor\n')

    // Find all TypeScript files
    const files = await glob('**/*.{ts,tsx}', {
      cwd: targetPath,
      ignore: [
        'node_modules/**',
        'dist/**',
        '.next/**',
        'build/**',
        'coverage/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/*.d.ts'
      ],
      absolute: true
    })

    const violations = []
    let filesScanned = 0
    let filesFixed = 0

    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      const fileViolations = []

      filesScanned++

      lines.forEach((line, idx) => {
        // Pattern: " as SomeType" but NOT " as unknown as SomeType"
        // Must not be "as const", "as any", "as string", "as number", etc.
        const unsafeCastPattern = /\bas\s+(?!unknown\s+as|const|any|string|number|boolean|null|undefined|void|never)([A-Z]\w+(?:<[^>]+>)?)/g

        let match
        while ((match = unsafeCastPattern.exec(line)) !== null) {
          const typeName = match[1]
          const column = match.index

          // Skip if it's already "as unknown as"
          const beforeMatch = line.slice(0, column)
          if (/as\s+unknown\s*$/.test(beforeMatch)) {
            continue
          }

          fileViolations.push({
            file,
            line: idx + 1,
            column,
            typeName,
            original: line.trim(),
            fix: line.replace(
              new RegExp(`\\bas\\s+${typeName}`),
              `as unknown as ${typeName}`
            )
          })
        }
      })

      if (fileViolations.length > 0) {
        violations.push(...fileViolations)

        if (fix) {
          // Apply fixes
          let fixedContent = content

          // Sort violations by line number (descending) to avoid offset issues
          const sortedViolations = [...fileViolations].sort((a, b) => b.line - a.line)

          sortedViolations.forEach(v => {
            const lineIndex = v.line - 1
            const originalLine = lines[lineIndex]

            // Replace first occurrence of "as TypeName" with "as unknown as TypeName"
            const fixedLine = originalLine.replace(
              new RegExp(`\\bas\\s+${v.typeName}`),
              `as unknown as ${v.typeName}`
            )

            lines[lineIndex] = fixedLine
          })

          fixedContent = lines.join('\n')
          writeFileSync(file, fixedContent, 'utf-8')
          filesFixed++
        }
      }
    }

    // Report results
    console.log(`📊 Scan Results:`)
    console.log(`   Files scanned: ${filesScanned}`)
    console.log(`   Unsafe casts found: ${violations.length}`)
    console.log(`   Files fixed: ${filesFixed}`)
    console.log('')

    if (violations.length > 0) {
      console.log('❌ Unsafe Type Casts Found:\n')

      // Group by file
      const byFile = violations.reduce((acc, v) => {
        if (!acc[v.file]) acc[v.file] = []
        acc[v.file].push(v)
        return acc
      }, {})

      Object.entries(byFile).forEach(([file, fileViolations]) => {
        const relativePath = file.replace(process.cwd(), '.')
        console.log(`  📄 ${relativePath} (${fileViolations.length} violation(s))`)

        fileViolations.forEach((v, i) => {
          if (verbose || i < 3) {
            console.log(`     Line ${v.line}: ${v.original}`)
            if (fix) {
              console.log(`       ✅ Fixed: ${v.fix.trim()}`)
            } else {
              console.log(`       💡 Suggested: ${v.fix.trim()}`)
            }
          }
        })

        if (!verbose && fileViolations.length > 3) {
          console.log(`     ... and ${fileViolations.length - 3} more`)
        }
        console.log('')
      })

      if (!fix) {
        console.log('📝 Run with --fix to apply changes automatically\n')
      } else {
        console.log('✅ All unsafe casts fixed!\n')
        console.log('📝 Next steps:')
        console.log('   1. Run type check: pnpm turbo typecheck')
        console.log('   2. Review changes: git diff')
        console.log('   3. Commit: git add . && git commit -m "fix: apply double-cast pattern for type safety"\n')
      }

      return {
        status: fix ? 'fixed' : 'violations_found',
        violations,
        summary: {
          filesScanned,
          filesFixed,
          totalViolations: violations.length
        }
      }
    }

    console.log('✅ No unsafe type casts found!\n')

    return {
      status: 'pass',
      violations: [],
      summary: {
        filesScanned,
        filesFixed: 0,
        totalViolations: 0
      }
    }
  }
}
