/**
 * Pooler Compatibility Regression Test
 *
 * Verifies that ALL SQL queries targeting public schema tables use explicit
 * `public.` schema qualification. This is required for Neon PgBouncer pooler
 * compatibility, where search_path may not include `public` by default.
 *
 * If this test fails, it means a query was added that references a public
 * table without the `public.` prefix — which will break in production with
 * pooled connections.
 */

import { describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Known public schema tables that MUST be qualified with `public.` in all SQL queries.
 */
const PUBLIC_TABLES = [
  'users',
  'organizations',
  'sessions',
  'magic_links',
  'api_keys',
  'team_invitations',
  'team_members',
  'password_reset_tokens',
  'user_organizations',
  'feature_flags',
  'feature_flag_overrides',
  'feature_flag_audit',
  'super_admin_users',
  'super_admin_sessions',
  'super_admin_audit_logs',
  'user_activity_logs',
  'roles',
  'permissions',
  'role_permissions',
  'user_roles',
  'impersonation_sessions',
  'organization_members',
]

/**
 * SQL keywords that precede table names.
 * Order matters: check compound keywords first to avoid double-matching
 * (e.g., "LEFT JOIN" should match before "JOIN").
 */
const SQL_KEYWORDS = ['DELETE FROM', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL JOIN', 'FROM', 'JOIN', 'INTO', 'UPDATE']

/**
 * Directories to exclude from scanning (not runtime query code)
 */
const EXCLUDED_DIRS = [
  'node_modules',
  '__tests__',
  '.test.',
  'migrations',
  'dist',
  '.d.ts',
]

/**
 * Recursively find all .ts files in a directory
 */
function findTsFiles(dir: string): string[] {
  const results: string[] = []

  if (!fs.existsSync(dir)) return results

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (EXCLUDED_DIRS.some(exc => fullPath.includes(exc))) continue

    if (entry.isDirectory()) {
      results.push(...findTsFiles(fullPath))
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      results.push(fullPath)
    }
  }

  return results
}

/**
 * Check a file for unqualified public table references in SQL queries
 */
function findUnqualifiedReferences(filePath: string): Array<{
  line: number
  content: string
  table: string
  keyword: string
}> {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const violations: Array<{
    line: number
    content: string
    table: string
    keyword: string
  }> = []

  // Skip files that don't contain sql template tags
  if (!content.includes('sql`') && !content.includes('sql.query(')) {
    return []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const trimmed = line.trim()

    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      continue
    }

    // Skip type definitions and imports
    if (trimmed.startsWith('import ') || trimmed.startsWith('export type') || trimmed.startsWith('export interface')) {
      continue
    }

    for (const table of PUBLIC_TABLES) {
      let matched = false
      for (const keyword of SQL_KEYWORDS) {
        if (matched) break // Only report one violation per line per table

        // Build pattern: keyword followed by table name (not preceded by `public.`)
        // Match: "FROM users", "JOIN organizations", "INTO sessions"
        // Skip: "FROM public.users", "JOIN public.organizations"
        const pattern = new RegExp(
          `${keyword}\\s+(?!public\\.)${table}\\b`,
          'i'
        )

        if (pattern.test(line)) {
          // Double-check this isn't in a comment or JSDoc example in client.ts
          const commentPattern = /^\s*\*|^\s*\/\//
          if (!commentPattern.test(line)) {
            violations.push({
              line: i + 1,
              content: trimmed,
              table,
              keyword,
            })
            matched = true
          }
        }
      }
    }
  }

  return violations
}

describe('Neon Pooler Compatibility', () => {
  // Scan the auth package
  describe('packages/auth - all public table queries use public. prefix', () => {
    const authSrcDir = path.resolve(__dirname, '..')

    it('should have no unqualified public table references', () => {
      const files = findTsFiles(authSrcDir)
      const allViolations: Array<{
        file: string
        line: number
        content: string
        table: string
      }> = []

      for (const file of files) {
        const violations = findUnqualifiedReferences(file)
        for (const v of violations) {
          allViolations.push({
            file: path.relative(authSrcDir, file),
            ...v,
          })
        }
      }

      if (allViolations.length > 0) {
        const report = allViolations
          .map(v => `  ${v.file}:${v.line} - unqualified "${v.table}": ${v.content}`)
          .join('\n')
        expect.fail(
          `Found ${allViolations.length} unqualified public table reference(s) in auth package.\n` +
          `All public schema tables must use "public." prefix for Neon pooler compatibility.\n\n` +
          report
        )
      }
    })
  })

  // Scan critical packages that query public tables
  describe('monorepo-wide - critical packages use public. prefix', () => {
    const packagesRoot = path.resolve(__dirname, '..', '..', '..', '..')

    const criticalPaths = [
      'packages/auth/src',
      'packages/feature-flags/src',
      'packages/onboarding/src',
      'packages/payments/src',
      'packages/integrations/src',
      'packages/shopify/src',
      'packages/video/src',
      'packages/mcp/src',
      'packages/ai-agents/src',
      'packages/communications/src',
      'apps/admin/src',
      'apps/contractor-portal/src',
      'apps/creator-portal/src',
      'apps/storefront/src',
    ]

    for (const criticalPath of criticalPaths) {
      const fullPath = path.resolve(packagesRoot, criticalPath)

      it(`${criticalPath} should have no unqualified public table references`, () => {
        if (!fs.existsSync(fullPath)) return // Skip if path doesn't exist

        const files = findTsFiles(fullPath)
        const allViolations: Array<{
          file: string
          line: number
          content: string
          table: string
        }> = []

        for (const file of files) {
          const violations = findUnqualifiedReferences(file)
          for (const v of violations) {
            allViolations.push({
              file: path.relative(fullPath, file),
              ...v,
            })
          }
        }

        if (allViolations.length > 0) {
          const report = allViolations
            .map(v => `  ${v.file}:${v.line} - unqualified "${v.table}": ${v.content}`)
            .join('\n')
          expect.fail(
            `Found ${allViolations.length} unqualified public table reference(s) in ${criticalPath}.\n` +
            `All public schema tables must use "public." prefix for Neon pooler compatibility.\n\n` +
            report
          )
        }
      })
    }
  })

  // Verify specific known-good patterns
  describe('known SQL patterns are correctly qualified', () => {
    it('should detect an unqualified FROM users query', () => {
      const testLine = '    SELECT * FROM users WHERE id = ${userId}'
      const pattern = /FROM\s+(?!public\.)users\b/i
      expect(pattern.test(testLine)).toBe(true)
    })

    it('should NOT flag a qualified FROM public.users query', () => {
      const testLine = '    SELECT * FROM public.users WHERE id = ${userId}'
      const pattern = /FROM\s+(?!public\.)users\b/i
      expect(pattern.test(testLine)).toBe(false)
    })

    it('should detect an unqualified JOIN organizations query', () => {
      const testLine = '    JOIN organizations o ON o.id = uo.organization_id'
      const pattern = /JOIN\s+(?!public\.)organizations\b/i
      expect(pattern.test(testLine)).toBe(true)
    })

    it('should NOT flag a qualified JOIN public.organizations query', () => {
      const testLine = '    JOIN public.organizations o ON o.id = uo.organization_id'
      const pattern = /JOIN\s+(?!public\.)organizations\b/i
      expect(pattern.test(testLine)).toBe(false)
    })

    it('should detect an unqualified INSERT INTO sessions query', () => {
      const testLine = '    INSERT INTO sessions (user_id, token_hash) VALUES ...'
      const pattern = /INTO\s+(?!public\.)sessions\b/i
      expect(pattern.test(testLine)).toBe(true)
    })

    it('should NOT flag a qualified INSERT INTO public.sessions query', () => {
      const testLine = '    INSERT INTO public.sessions (user_id, token_hash) VALUES ...'
      const pattern = /INTO\s+(?!public\.)sessions\b/i
      expect(pattern.test(testLine)).toBe(false)
    })
  })
})
