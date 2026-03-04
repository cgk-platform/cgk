/**
 * tenant-export-helpers.ts
 * Utilities for exporting tenants to standalone GitHub repos (WordPress-style portability)
 */

import { randomBytes } from 'crypto'
import { sql } from '@cgk-platform/db'
import { logger } from '@cgk-platform/logging'
import chalk from 'chalk'

/**
 * Organization data from public schema
 */
export interface OrganizationData {
  id: string
  slug: string
  name: string
  settings: Record<string, unknown>
  shopify_store_domain: string | null
  shopify_access_token_encrypted: string | null
  stripe_account_id: string | null
  stripe_customer_id: string | null
  status: string
  created_at: string
  updated_at: string
}

/**
 * Complete tenant data for export
 */
export interface TenantExportData {
  organization: OrganizationData
  tenantSchema: string
  exportDate: string
  tableCount: number
  tables: string[]
  totalRecords: number
  recordsByTable: Record<string, number>
}

/**
 * Options for GitHub repo creation
 */
export interface GitHubRepoOptions {
  githubToken: string
  orgOrUsername: string
  repoName: string
  description: string
  private: boolean
  templateRepo?: string // e.g., "cgk-platform/cgk-template"
}

/**
 * Options for Vercel project setup
 */
export interface VercelProjectOptions {
  token: string
  teamId: string
  projectName: string
  githubRepo: string // e.g., "username/repo-name"
  framework: 'nextjs'
  rootDirectory?: string
}

/**
 * Options for directory export
 */
export interface ExportDirectoryOptions {
  tenantData: TenantExportData
  outputDir: string
  includeSecrets?: boolean
}

/**
 * Export organization and tenant data from database
 */
export async function exportTenantData(slug: string): Promise<TenantExportData> {
  // Validate slug format
  if (!/^[a-z0-9_]+$/.test(slug)) {
    throw new Error(
      `Invalid tenant slug: ${slug}. Must be lowercase alphanumeric with underscores only.`
    )
  }

  const tenantSchema = `tenant_${slug}`

  // Get organization data from public schema
  const orgResult = await sql<OrganizationData>`
    SELECT
      id::text,
      slug,
      name,
      settings,
      shopify_store_domain,
      shopify_access_token_encrypted,
      stripe_account_id,
      stripe_customer_id,
      status,
      created_at::text,
      updated_at::text
    FROM public.organizations
    WHERE slug = ${slug}
  `

  if (!orgResult.rows[0]) {
    throw new Error(`Tenant not found: ${slug}`)
  }

  const organization = orgResult.rows[0]

  // Get list of tables in tenant schema
  const tablesResult = await sql<{ table_name: string }>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = ${tenantSchema}
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `

  const tables = tablesResult.rows.map((r) => r.table_name)

  // Get record counts for each table
  const recordsByTable: Record<string, number> = {}
  let totalRecords = 0

  for (const table of tables) {
    try {
      // Build dynamic SQL query string (safe because table names come from information_schema)
      const countQuery = `SELECT COUNT(*) as count FROM ${tenantSchema}.${table}`
      const countResult = await sql.query<{ count: number | string }>(countQuery)
      const count =
        typeof countResult.rows[0]?.count === 'number'
          ? countResult.rows[0].count
          : parseInt(String(countResult.rows[0]?.count || '0'))
      recordsByTable[table] = count
      totalRecords += count
    } catch (error) {
      logger.warn(
        `Failed to count records in ${table}: ${error instanceof Error ? error.message : String(error)}`
      )
      recordsByTable[table] = 0
    }
  }

  return {
    organization,
    tenantSchema,
    exportDate: new Date().toISOString(),
    tableCount: tables.length,
    tables,
    totalRecords,
    recordsByTable,
  }
}

/**
 * Create GitHub repository from template
 */
export async function createGitHubRepo(options: GitHubRepoOptions): Promise<string> {
  const {
    githubToken,
    orgOrUsername,
    repoName,
    description,
    private: isPrivate,
    templateRepo,
  } = options

  try {
    // Dynamically import Octokit to avoid type issues
    const { Octokit } = await import('@octokit/rest')
    const octokit = new Octokit({ auth: githubToken })

    // If template repo specified, create from template
    if (templateRepo) {
      const [templateOwner, templateRepoName] = templateRepo.split('/')
      if (!templateOwner || !templateRepoName) {
        throw new Error(`Invalid template repo format: ${templateRepo}. Expected: owner/repo`)
      }

      logger.info(`Creating repo from template: ${templateRepo}`)

      const response = await octokit.repos.createUsingTemplate({
        template_owner: templateOwner,
        template_repo: templateRepoName,
        owner: orgOrUsername,
        name: repoName,
        description,
        private: isPrivate,
        include_all_branches: false,
      })

      return response.data.html_url
    }

    // Otherwise create empty repo
    const response = await octokit.repos.createInOrg({
      org: orgOrUsername,
      name: repoName,
      description,
      private: isPrivate,
      auto_init: true,
    })

    return response.data.html_url
  } catch (error) {
    if (
      error instanceof Error &&
      'status' in error &&
      (error as { status?: number }).status === 422
    ) {
      throw new Error(`Repository ${orgOrUsername}/${repoName} already exists`)
    }
    throw error
  }
}

/**
 * Setup Vercel project with all 8 apps
 */
export async function setupVercelProject(options: VercelProjectOptions): Promise<string> {
  const { token, teamId, projectName, githubRepo, framework, rootDirectory } = options

  const response = await fetch('https://api.vercel.com/v10/projects', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: projectName,
      framework,
      gitRepository: {
        repo: githubRepo,
        type: 'github',
      },
      rootDirectory: rootDirectory || '.',
      buildCommand: 'pnpm build',
      devCommand: 'pnpm dev',
      installCommand: 'pnpm install',
      outputDirectory: '.next',
      publicSource: null,
      teamId,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create Vercel project: ${error}`)
  }

  const data = (await response.json()) as { id: string }
  return data.id
}

/**
 * Export tenant data to directory structure
 */
export async function exportToDirectory(options: ExportDirectoryOptions): Promise<void> {
  const { tenantData, outputDir, includeSecrets = false } = options
  const fs = await import('fs/promises')
  const fsExtra = await import('fs-extra')

  // Ensure output directory exists
  await fsExtra.ensureDir(outputDir)

  // 1. Write organization.json
  await fs.writeFile(
    `${outputDir}/organization.json`,
    JSON.stringify(
      {
        ...tenantData.organization,
        // Exclude encrypted tokens unless includeSecrets is true
        shopify_access_token_encrypted: includeSecrets
          ? tenantData.organization.shopify_access_token_encrypted
          : null,
      },
      null,
      2
    ),
    'utf-8'
  )

  // 2. Write tenant-data.json (metadata only, not full data)
  await fs.writeFile(
    `${outputDir}/tenant-data.json`,
    JSON.stringify(
      {
        tenantSchema: tenantData.tenantSchema,
        exportDate: tenantData.exportDate,
        tableCount: tenantData.tableCount,
        tables: tenantData.tables,
        totalRecords: tenantData.totalRecords,
        recordsByTable: tenantData.recordsByTable,
      },
      null,
      2
    ),
    'utf-8'
  )

  // 3. Generate platform.config.ts
  const platformConfig = generatePlatformConfig(tenantData.organization)
  await fs.writeFile(`${outputDir}/platform.config.ts`, platformConfig)

  // 4. Generate migration.sql (structure + data export instructions)
  const migrationSQL = await generateMigrationSQL(tenantData)
  await fs.writeFile(`${outputDir}/migration.sql`, migrationSQL)

  // 5. Generate .env.example
  const envExample = generateEnvExample(tenantData.organization, includeSecrets)
  await fs.writeFile(`${outputDir}/.env.example`, envExample)

  logger.info(chalk.green(`\n✓ Exported to: ${outputDir}`))
  logger.info(chalk.dim(`  - organization.json`))
  logger.info(chalk.dim(`  - tenant-data.json`))
  logger.info(chalk.dim(`  - platform.config.ts`))
  logger.info(chalk.dim(`  - migration.sql`))
  logger.info(chalk.dim(`  - .env.example`))
}

/**
 * Generate platform.config.ts for exported tenant
 */
export function generatePlatformConfig(org: OrganizationData): string {
  return `/**
 * Platform Configuration
 * Generated from tenant export: ${org.slug}
 * Export date: ${new Date().toISOString()}
 */

export const platformConfig = {
  tenant: {
    slug: '${org.slug}',
    name: '${org.name}',
    status: '${org.status}',
  },

  integrations: {
    shopify: {
      enabled: ${!!org.shopify_store_domain},
      storeDomain: ${org.shopify_store_domain ? `'${org.shopify_store_domain}'` : 'null'},
    },
    stripe: {
      enabled: ${!!org.stripe_account_id},
      accountId: ${org.stripe_account_id ? `'${org.stripe_account_id}'` : 'null'},
    },
  },

  settings: ${JSON.stringify(org.settings, null, 2)},
} as const

export type PlatformConfig = typeof platformConfig
`
}

/**
 * Generate migration SQL for restoring tenant
 */
export async function generateMigrationSQL(tenantData: TenantExportData): Promise<string> {
  const { organization, tenantSchema, tables, recordsByTable } = tenantData

  let sql = `-- CGK Tenant Migration SQL
-- Tenant: ${organization.slug}
-- Schema: ${tenantSchema}
-- Generated: ${new Date().toISOString()}
-- Tables: ${tables.length} (${tenantData.totalRecords.toLocaleString()} total records)

-- =============================================================================
-- STEP 1: Restore organization record
-- =============================================================================

INSERT INTO public.organizations (
  id,
  slug,
  name,
  settings,
  shopify_store_domain,
  shopify_access_token_encrypted,
  stripe_account_id,
  stripe_customer_id,
  status,
  created_at,
  updated_at
) VALUES (
  '${organization.id}'::uuid,
  '${organization.slug}',
  '${organization.name}',
  '${JSON.stringify(organization.settings)}'::jsonb,
  ${organization.shopify_store_domain ? `'${organization.shopify_store_domain}'` : 'NULL'},
  ${organization.shopify_access_token_encrypted ? `'${organization.shopify_access_token_encrypted}'` : 'NULL'},
  ${organization.stripe_account_id ? `'${organization.stripe_account_id}'` : 'NULL'},
  ${organization.stripe_customer_id ? `'${organization.stripe_customer_id}'` : 'NULL'},
  '${organization.status}'::organization_status,
  '${organization.created_at}'::timestamptz,
  '${organization.updated_at}'::timestamptz
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  settings = EXCLUDED.settings,
  updated_at = EXCLUDED.updated_at;

-- =============================================================================
-- STEP 2: Create tenant schema and run migrations
-- =============================================================================

-- Use CLI to create tenant schema:
-- npx @cgk-platform/cli tenant:create ${organization.slug}

-- Or create schema manually and run migrations:
-- CREATE SCHEMA IF NOT EXISTS ${tenantSchema};
-- Run all tenant migrations from packages/db/src/migrations/tenant/

-- =============================================================================
-- STEP 3: Export/Import tenant data
-- =============================================================================

-- Use pg_dump to export tenant data from source:
-- pg_dump --schema=${tenantSchema} --data-only --no-owner --no-privileges \\
--   -h SOURCE_HOST -U SOURCE_USER -d SOURCE_DB > ${organization.slug}_data.sql

-- Import data to target:
-- psql -h TARGET_HOST -U TARGET_USER -d TARGET_DB -f ${organization.slug}_data.sql

-- =============================================================================
-- Table Summary
-- =============================================================================

`

  for (const table of tables.sort()) {
    const count = recordsByTable[table] || 0
    sql += `-- ${table.padEnd(40)} ${count.toLocaleString().padStart(10)} records\n`
  }

  sql += `\n-- Total records: ${tenantData.totalRecords.toLocaleString()}\n`

  return sql
}

/**
 * Generate .env.example file
 */
function generateEnvExample(org: OrganizationData, includeValues: boolean): string {
  const generateSecret = () =>
    includeValues ? randomBytes(32).toString('hex') : '<generate-32-byte-hex>'

  return `# CGK Platform - Environment Variables
# Tenant: ${org.slug}
# Generated: ${new Date().toISOString()}

# Database
POSTGRES_URL=${includeValues ? '<your-neon-database-url>' : '<neon-database-connection-string>'}
POSTGRES_PRISMA_URL=\${POSTGRES_URL}?pgbouncer=true
POSTGRES_URL_NON_POOLING=\${POSTGRES_URL}

# Redis Cache
UPSTASH_REDIS_REST_URL=${includeValues ? '<your-upstash-redis-url>' : '<upstash-redis-rest-url>'}
UPSTASH_REDIS_REST_TOKEN=${includeValues ? '<your-upstash-redis-token>' : '<upstash-redis-rest-token>'}

# Authentication Secrets
JWT_SECRET=${generateSecret()}
SESSION_SECRET=${generateSecret()}
CREATOR_JWT_SECRET=${generateSecret()}
CONTRACTOR_JWT_SECRET=${generateSecret()}

# Encryption Keys
ENCRYPTION_KEY=${generateSecret()}
INTEGRATION_ENCRYPTION_KEY=${generateSecret()}
SHOPIFY_TOKEN_ENCRYPTION_KEY=${generateSecret()}
DAM_TOKEN_ENCRYPTION_KEY=${generateSecret()}
TAX_TIN_ENCRYPTION_KEY=${generateSecret()}

# Platform
CGK_PLATFORM_API_KEY=${includeValues ? randomBytes(32).toString('base64') : '<generate-base64-api-key>'}
TENANT_SLUG=${org.slug}

# Shopify Integration
${org.shopify_store_domain ? `SHOPIFY_STORE_DOMAIN=${org.shopify_store_domain}` : '# SHOPIFY_STORE_DOMAIN=<your-store>.myshopify.com'}
# SHOPIFY_API_KEY=<from-partners-dashboard>
# SHOPIFY_API_SECRET=<from-partners-dashboard>

# Stripe Integration
${org.stripe_account_id ? `STRIPE_ACCOUNT_ID=${org.stripe_account_id}` : '# STRIPE_ACCOUNT_ID=<your-stripe-account-id>'}
# STRIPE_SECRET_KEY=<your-stripe-secret-key>
# STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>

# Background Jobs
# TRIGGER_API_KEY=<your-trigger-dev-api-key>
# TRIGGER_API_URL=https://api.trigger.dev

# Email
# RESEND_API_KEY=<your-resend-api-key>

# Analytics
# NEXT_PUBLIC_GA4_MEASUREMENT_ID=<your-ga4-measurement-id>
`
}
