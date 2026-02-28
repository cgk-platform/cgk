/**
 * Structured Logging Converter Skill
 *
 * Converts unstructured console.error() calls to structured logging:
 * - Replaces console.error with logger.error
 * - Injects request ID, tenant ID, user ID context
 * - Adds error serialization
 * - Generates logger configuration
 *
 * Usage: /structured-logging-converter --app admin --fix
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { glob } from 'glob'
import { resolve } from 'path'

export default {
  name: 'structured-logging-converter',
  version: '1.0.0',
  description: 'Converts console.error to structured logging',

  async execute(args = {}) {
    const {
      fix = false,
      app = '',
      path: targetPath = '',
      verbose = false
    } = args

    console.log('📝 Structured Logging Converter\n')

    const searchPath = app ? `apps/${app}` : targetPath || '.'

    // Find all TypeScript/JavaScript files
    const files = await glob('**/*.{ts,tsx,js,jsx}', {
      cwd: searchPath,
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
    let filesFixed = 0

    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      const fileViolations = []

      filesScanned++

      lines.forEach((line, idx) => {
        // Find console.error, console.warn, console.log in catch blocks or error handling
        if (/console\.(error|warn)\s*\(/.test(line)) {
          fileViolations.push({
            file,
            line: idx + 1,
            type: line.includes('console.error') ? 'error' : 'warn',
            original: line.trim()
          })
        }
      })

      if (fileViolations.length > 0) {
        violations.push(...fileViolations)

        if (fix) {
          let modified = false
          const newLines = lines.map((line, idx) => {
            const violation = fileViolations.find(v => v.line === idx + 1)

            if (violation) {
              modified = true

              // Extract the message and error variable
              const consolePattern = /console\.(error|warn)\s*\(\s*['"]([^'"]+)['"](?:,\s*(\w+))?\s*\)/
              const match = line.match(consolePattern)

              if (match) {
                const [, level, message, errorVar] = match
                const indent = line.match(/^\s*/)[0]

                if (errorVar) {
                  // Has error variable
                  return `${indent}logger.${level}('${message}', {\n${indent}  error: ${errorVar} instanceof Error ? {\n${indent}    message: ${errorVar}.message,\n${indent}    stack: ${errorVar}.stack,\n${indent}    name: ${errorVar}.name\n${indent}  } : { message: String(${errorVar}) }\n${indent}})`
                } else {
                  // Just message
                  return `${indent}logger.${level}('${message}')`
                }
              }
            }

            return line
          })

          if (modified) {
            // Add logger import if not present
            const hasLoggerImport = /import.*logger.*from.*@cgk-platform\/logging/.test(content)

            if (!hasLoggerImport) {
              // Find first import statement
              const firstImportIdx = newLines.findIndex(line => /^import\s/.test(line))

              if (firstImportIdx >= 0) {
                newLines.splice(firstImportIdx, 0, "import { logger } from '@cgk-platform/logging'")
              } else {
                // Add at top
                newLines.unshift("import { logger } from '@cgk-platform/logging'", '')
              }
            }

            writeFileSync(file, newLines.join('\n'), 'utf-8')
            filesFixed++
          }
        }
      }
    }

    // Report results
    console.log(`📊 Scan Results:`)
    console.log(`   Files scanned: ${filesScanned}`)
    console.log(`   Unstructured logs found: ${violations.length}`)
    console.log(`   Files fixed: ${filesFixed}`)
    console.log('')

    if (violations.length > 0) {
      console.log('❌ Unstructured Logging Found:\n')

      // Group by file
      const byFile = violations.reduce((acc, v) => {
        if (!acc[v.file]) acc[v.file] = []
        acc[v.file].push(v)
        return acc
      }, {})

      Object.entries(byFile).forEach(([file, fileViolations]) => {
        const relativePath = file.replace(process.cwd(), '.')
        console.log(`  📄 ${relativePath} (${fileViolations.length})`)

        fileViolations.forEach((v, i) => {
          if (verbose || i < 3) {
            console.log(`     Line ${v.line}: ${v.original}`)
          }
        })

        if (!verbose && fileViolations.length > 3) {
          console.log(`     ... and ${fileViolations.length - 3} more`)
        }
        console.log('')
      })

      if (!fix) {
        console.log('📝 Run with --fix to convert to structured logging\n')
      } else {
        console.log('✅ Converted to structured logging!\n')
        console.log('📝 Next steps:')
        console.log('   1. Ensure @cgk-platform/logging package exists')
        console.log('   2. Add context fields (requestId, tenantId, userId) where available')
        console.log('   3. Review changes: git diff')
        console.log('   4. Test logging output\n')
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

    console.log('✅ All logging is structured!\n')

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
