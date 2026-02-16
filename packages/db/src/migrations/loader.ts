/**
 * Migration file loader
 *
 * Loads SQL migration files from the migrations directory.
 * Migration files must follow the naming convention: NNN_name.sql
 * where NNN is a zero-padded version number (e.g., 001, 002, 003).
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { Migration, SchemaType } from './types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Parse migration filename into version and name
 *
 * @example
 * parseFilename('001_platform_config.sql') // { version: 1, name: 'platform_config' }
 */
function parseFilename(filename: string): { version: number; name: string } | null {
  const match = filename.match(/^(\d{3})_(.+)\.sql$/)
  if (!match) return null

  return {
    version: parseInt(match[1]!, 10),
    name: match[2]!,
  }
}

/**
 * Load migrations from a directory
 *
 * @param dir - Directory path containing SQL files
 * @returns Array of migrations sorted by version
 */
async function loadFromDirectory(dir: string): Promise<Migration[]> {
  // Check if directory exists
  if (!fs.existsSync(dir)) {
    return []
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql'))
  const migrations: Migration[] = []

  for (const filename of files) {
    const parsed = parseFilename(filename)
    if (!parsed) {
      console.warn(`Skipping invalid migration filename: ${filename}`)
      continue
    }

    const filePath = path.join(dir, filename)
    const sql = fs.readFileSync(filePath, 'utf-8')

    migrations.push({
      version: parsed.version,
      name: parsed.name,
      filename,
      sql,
    })
  }

  // Sort by version, then by name for consistent ordering
  const sorted = migrations.sort((a, b) => {
    if (a.version !== b.version) return a.version - b.version
    return a.name.localeCompare(b.name)
  })

  // Check for duplicate version numbers and warn
  const versions = new Map<number, string[]>()
  for (const migration of sorted) {
    const existing = versions.get(migration.version) || []
    existing.push(migration.name)
    versions.set(migration.version, existing)
  }

  for (const [version, names] of versions) {
    if (names.length > 1) {
      console.warn(
        `Warning: Duplicate migration version ${String(version).padStart(3, '0')}: ${names.join(', ')}`
      )
    }
  }

  return sorted
}

/**
 * Load public schema migrations
 *
 * These migrations run once against the public schema and create
 * platform-wide tables like organizations, users, sessions, etc.
 */
export async function loadPublicMigrations(): Promise<Migration[]> {
  const migrationsDir = path.join(__dirname, 'public')
  return loadFromDirectory(migrationsDir)
}

/**
 * Load tenant schema migrations
 *
 * These migrations are applied to each tenant's schema when the tenant
 * is created. They create tables like orders, customers, products, etc.
 */
export async function loadTenantMigrations(): Promise<Migration[]> {
  const migrationsDir = path.join(__dirname, 'tenant')
  return loadFromDirectory(migrationsDir)
}

/**
 * Load migrations by schema type
 */
export async function loadMigrations(schemaType: SchemaType): Promise<Migration[]> {
  if (schemaType === 'public') {
    return loadPublicMigrations()
  }
  return loadTenantMigrations()
}

/**
 * Get the path to the migrations directory
 */
export function getMigrationsPath(schemaType: SchemaType): string {
  return path.join(__dirname, schemaType)
}
