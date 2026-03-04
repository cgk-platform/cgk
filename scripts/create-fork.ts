#!/usr/bin/env tsx
/**
 * WordPress-Style Fork Creation Script
 *
 * Creates a new fork of cgk-platform/cgk-template with tenant data migration.
 *
 * Usage:
 *   # Multi-tenant fork
 *   ./scripts/create-fork.ts cgk-unlimited cgk-platform --tenants meliusly,cgk-linens --multi-tenant
 *
 *   # Single-tenant fork
 *   ./scripts/create-fork.ts vitahustle vitahustle-platform --tenants vitahustle
 *
 * Environment variables required:
 *   - GITHUB_TOKEN: GitHub Personal Access Token (repo scope)
 *   - VERCEL_TOKEN: Vercel API Token
 *   - DATABASE_URL: Source database connection string
 */

import { Octokit } from '@octokit/rest'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

interface ForkOptions {
  owner: string
  repoName: string
  tenants: string[]
  multiTenant: boolean
}

interface TenantConfig {
  slug: string
  name: string
  schema: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  font: string
  domain: string
}

// Validate environment variables
function validateEnv() {
  const required = ['GITHUB_TOKEN', 'VERCEL_TOKEN', 'DATABASE_URL']
  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`)
    console.error('\nSet them with:')
    console.error('  export GITHUB_TOKEN=ghp_xxxxx')
    console.error('  export VERCEL_TOKEN=xxxxx')
    console.error('  export DATABASE_URL=postgres://...')
    process.exit(1)
  }
}

// Create GitHub repository using template
async function createGitHubRepo(octokit: Octokit, options: ForkOptions) {
  console.log(`\n📦 Creating GitHub repository: ${options.owner}/${options.repoName}`)

  try {
    const { data } = await octokit.repos.createUsingTemplate({
      template_owner: 'cgk-platform',
      template_repo: 'cgk-template',
      owner: options.owner,
      name: options.repoName,
      description: options.multiTenant
        ? `${options.owner} - Multi-tenant commerce platform`
        : `${options.owner} - Commerce platform`,
      private: false,
      include_all_branches: false,
    })

    console.log(`✅ Repository created: ${data.html_url}`)
    return data
  } catch (error: any) {
    if (error.status === 422) {
      console.error(`❌ Repository ${options.owner}/${options.repoName} already exists`)
    } else {
      console.error(`❌ Failed to create repository:`, error.message)
    }
    throw error
  }
}

// Export tenant data from source database
async function exportTenantData(tenant: string) {
  console.log(`\n📤 Exporting tenant data: ${tenant}`)

  const exportFile = `${tenant}-export.sql`
  const exportPath = path.join(process.cwd(), 'exports', exportFile)

  // Create exports directory
  fs.mkdirSync(path.join(process.cwd(), 'exports'), { recursive: true })

  try {
    execSync(
      `psql "${process.env.DATABASE_URL}" -f scripts/export-tenant.sql -v tenant=${tenant} > ${exportPath}`,
      { stdio: 'inherit' }
    )

    console.log(`✅ Tenant data exported: ${exportPath}`)
    return exportPath
  } catch (error) {
    console.error(`❌ Failed to export tenant data for ${tenant}`)
    throw error
  }
}

// Create Vercel project
async function createVercelProject(options: ForkOptions) {
  console.log(`\n🚀 Creating Vercel project: ${options.repoName}`)

  const projectConfig = {
    name: options.repoName,
    gitRepository: {
      type: 'github',
      repo: `${options.owner}/${options.repoName}`,
    },
    framework: 'nextjs',
    buildCommand: 'pnpm turbo build',
    installCommand: 'pnpm install --frozen-lockfile',
  }

  try {
    const response = await fetch('https://api.vercel.com/v9/projects', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectConfig),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Vercel API error: ${JSON.stringify(error)}`)
    }

    const data = await response.json()
    console.log(`✅ Vercel project created: ${data.name}`)
    console.log(`   URL: https://${data.name}.vercel.app`)

    return data
  } catch (error: any) {
    console.error(`❌ Failed to create Vercel project:`, error.message)
    throw error
  }
}

// Fetch tenant configuration from database
async function fetchTenantConfig(tenant: string): Promise<TenantConfig> {
  console.log(`\n🔍 Fetching configuration for tenant: ${tenant}`)

  try {
    const result = execSync(
      `psql "${process.env.DATABASE_URL}" -t -c "SELECT slug, name, domain, primary_color, secondary_color, accent_color, font_family FROM public.organizations WHERE slug = '${tenant}'"`,
      { encoding: 'utf8' }
    )

    const [slug, name, domain, primaryColor, secondaryColor, accentColor, font] = result
      .trim()
      .split('|')
      .map((s) => s.trim())

    return {
      slug,
      name,
      schema: `tenant_${tenant}`,
      primaryColor,
      secondaryColor,
      accentColor,
      font,
      domain,
    }
  } catch (error) {
    console.error(`❌ Failed to fetch tenant config for ${tenant}`)
    throw error
  }
}

// Generate platform.config.ts
async function generatePlatformConfig(options: ForkOptions) {
  console.log(`\n⚙️  Generating platform.config.ts`)

  // Fetch config for all tenants
  const tenantConfigs = await Promise.all(options.tenants.map(fetchTenantConfig))

  const configContent = `import { defineConfig } from '@cgk-platform/core'

export const platformConfig = defineConfig({
  deployment: {
    name: '${options.owner}',
    organization: '${options.owner}',
    mode: '${options.multiTenant ? 'multi-tenant' : 'single-tenant'}',
  },

  tenants: [
${tenantConfigs
  .map(
    (tenant) => `    {
      slug: '${tenant.slug}',
      name: '${tenant.name}',
      schema: '${tenant.schema}',
      primaryColor: '${tenant.primaryColor}',
      secondaryColor: '${tenant.secondaryColor}',
      accentColor: '${tenant.accentColor}',
      font: '${tenant.font}',
      domain: '${tenant.domain}',
    }`
  )
  .join(',\n')}
  ],

  features: {
    multiTenant: ${options.multiTenant},
    shopifyIntegration: true,
    stripeConnect: true,
    creatorPortal: true,
    contractorPortal: true,
  },
})
`

  const configPath = path.join(process.cwd(), 'platform.config.ts')
  fs.writeFileSync(configPath, configContent)

  console.log(`✅ platform.config.ts generated`)
  return configPath
}

// Main execution
async function main() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.error(`
Usage: ./scripts/create-fork.ts <owner> <repo-name> [options]

Options:
  --tenants <slug1,slug2>   Comma-separated list of tenant slugs
  --multi-tenant            Enable multi-tenant mode

Examples:
  # Multi-tenant fork
  ./scripts/create-fork.ts cgk-unlimited cgk-platform --tenants meliusly,cgk-linens --multi-tenant

  # Single-tenant fork
  ./scripts/create-fork.ts vitahustle vitahustle-platform --tenants vitahustle
`)
    process.exit(1)
  }

  const owner = args[0]
  const repoName = args[1]

  // Parse options
  const tenantsArg = args.find((arg) => arg.startsWith('--tenants'))
  const tenants = tenantsArg ? args[args.indexOf(tenantsArg) + 1].split(',') : []
  const multiTenant = args.includes('--multi-tenant')

  if (tenants.length === 0) {
    console.error('❌ At least one tenant must be specified with --tenants')
    process.exit(1)
  }

  const options: ForkOptions = {
    owner,
    repoName,
    tenants,
    multiTenant,
  }

  console.log(`
🎯 Fork Configuration
────────────────────
Owner:        ${owner}
Repository:   ${repoName}
Tenants:      ${tenants.join(', ')}
Multi-tenant: ${multiTenant}
`)

  // Validate environment
  validateEnv()

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

  try {
    // Step 1: Create GitHub repository
    const repo = await createGitHubRepo(octokit, options)

    // Step 2: Export tenant data
    const exportPaths = await Promise.all(tenants.map(exportTenantData))

    // Step 3: Create Vercel project
    const vercelProject = await createVercelProject(options)

    // Step 4: Generate platform.config.ts
    await generatePlatformConfig(options)

    console.log(`
✅ Fork created successfully!

Next steps:
───────────
1. Add Vercel integrations:
   - Go to: https://vercel.com/${owner}/${repoName}/settings/integrations
   - Add: Neon Postgres
   - Add: Upstash Redis
   - Add: Vercel Blob

2. Import tenant data:
   - Wait for Neon integration to provision database
   - Run: ./scripts/import-tenant-data.sh ${exportPaths.join(' ')}

3. Deploy:
   - git add platform.config.ts
   - git commit -m "feat: configure ${owner} deployment"
   - git push origin main
   - Vercel will auto-deploy

Repository: ${repo.html_url}
Vercel:     https://vercel.com/${owner}/${repoName}
`)
  } catch (error: any) {
    console.error(`\n❌ Fork creation failed:`, error.message)
    process.exit(1)
  }
}

main()
