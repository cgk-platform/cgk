#!/usr/bin/env tsx
/**
 * Automated Tenant Migration Script
 *
 * This script automates the entire WordPress-style migration:
 * 1. Exports all 4 tenants to separate GitHub repos
 * 2. Creates Vercel projects with auto-provisioned Neon + Upstash
 * 3. Configures environment variables
 * 4. Deploys each tenant
 * 5. Provides cleanup commands
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { Octokit } from '@octokit/rest'

// ============================================================================
// Configuration
// ============================================================================

const TENANTS = [
  {
    slug: 'meliusly',
    org: 'meliusly',
    repoName: 'meliusly-commerce',
    description: 'Meliusly Commerce Platform',
  },
  {
    slug: 'cgk-linens',
    org: 'cgk-linens',
    repoName: 'cgk-commerce',
    description: 'CGK Linens Commerce Platform',
  },
  {
    slug: 'vitahustle',
    org: 'vitahustle',
    repoName: 'vitahustle-platform',
    description: 'VitaHustle Commerce Platform',
  },
  {
    slug: 'rawdog',
    org: 'rawdog',
    repoName: 'rawdog-commerce',
    description: 'Rawdog Commerce Platform',
  },
]

// ============================================================================
// Environment Setup
// ============================================================================

function checkEnvironment() {
  console.log('🔍 Checking environment...\n')

  const required = ['GITHUB_TOKEN', 'VERCEL_TOKEN', 'DATABASE_URL']
  const missing: string[] = []

  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName)
    }
  }

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:\n')
    for (const varName of missing) {
      console.error(`   ${varName}`)
    }
    console.error('\nSet them with:')
    console.error('   export GITHUB_TOKEN=ghp_...')
    console.error('   export VERCEL_TOKEN=...')
    console.error(
      '   export DATABASE_URL=$(cat apps/admin/.env.local | grep POSTGRES_URL | cut -d= -f2-)'
    )
    process.exit(1)
  }

  console.log('✅ All required environment variables set\n')
}

// ============================================================================
// Step 1: Verify Tenants Exist
// ============================================================================

async function verifyTenants() {
  console.log('📊 Verifying tenants in database...\n')

  const { Client } = await import('pg')
  const client = new Client({ connectionString: process.env.DATABASE_URL })

  await client.connect()

  for (const tenant of TENANTS) {
    const result = await client.query(
      'SELECT slug, name FROM public.organizations WHERE slug = $1',
      [tenant.slug]
    )

    if (result.rows.length === 0) {
      console.error(`❌ Tenant '${tenant.slug}' not found in database`)
      process.exit(1)
    }

    console.log(`   ✅ ${tenant.slug}: ${result.rows[0].name}`)
  }

  await client.end()
  console.log()
}

// ============================================================================
// Step 2: Create GitHub Template Repository
// ============================================================================

async function setupTemplateRepo() {
  console.log('🔧 Setting up cgk-platform/cgk-template...\n')

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

  try {
    // Check if template repo exists
    await octokit.repos.get({
      owner: 'cgk-platform',
      repo: 'cgk-template',
    })

    console.log('   ✅ Template repository already exists\n')
  } catch (err) {
    console.log('   Creating template repository...')

    // Get current repo
    const currentRepo = await octokit.repos.get({
      owner: 'cgk-platform',
      repo: 'cgk',
    })

    // Create template repo (manual step required)
    console.log('\n⚠️  Manual step required:')
    console.log('   1. Go to: https://github.com/cgk-platform/cgk/settings')
    console.log('   2. Check "Template repository"')
    console.log('   3. Press Enter when done...')
    process.stdin.setRawMode(true)
    await new Promise((resolve) => process.stdin.once('data', resolve))
    process.stdin.setRawMode(false)
    console.log()
  }
}

// ============================================================================
// Step 3: Export Each Tenant
// ============================================================================

async function exportTenant(tenant: (typeof TENANTS)[0]) {
  console.log(`\n📦 Exporting ${tenant.slug}...\n`)

  // Check if GitHub org exists
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

  try {
    await octokit.orgs.get({ org: tenant.org })
    console.log(`   ✅ GitHub org '${tenant.org}' exists`)
  } catch (err) {
    console.log(`   ⚠️  GitHub org '${tenant.org}' not found - will use personal account`)
  }

  // Run export command
  const cmd = `npx @cgk-platform/cli tenant:export ${tenant.slug} --fork --github-token ${process.env.GITHUB_TOKEN} --vercel-token ${process.env.VERCEL_TOKEN} --org ${tenant.org} --repo-name ${tenant.repoName}`

  try {
    execSync(cmd, { stdio: 'inherit' })
    console.log(`   ✅ ${tenant.slug} exported successfully`)
  } catch (err) {
    console.error(`   ❌ Failed to export ${tenant.slug}`)
    throw err
  }
}

// ============================================================================
// Step 4: Deploy to Vercel with Integrations
// ============================================================================

async function deployTenant(tenant: (typeof TENANTS)[0]) {
  console.log(`\n🚀 Deploying ${tenant.org}/${tenant.repoName} to Vercel...\n`)

  // The Vercel project was already created by tenant:export
  // We just need to trigger a deployment

  const cmd = `cd /tmp/${tenant.slug}-export && vercel --prod --token ${process.env.VERCEL_TOKEN}`

  try {
    execSync(cmd, { stdio: 'inherit' })
    console.log(`   ✅ ${tenant.slug} deployed successfully`)
  } catch (err) {
    console.error(`   ❌ Failed to deploy ${tenant.slug}`)
    throw err
  }
}

// ============================================================================
// Step 5: Update Vercel Integration
// ============================================================================

async function addVercelIntegrations(tenant: (typeof TENANTS)[0]) {
  console.log(`\n🔌 Adding Vercel integrations for ${tenant.slug}...\n`)

  console.log('   Manual step required:')
  console.log(
    `   1. Go to: https://vercel.com/${tenant.org}/${tenant.repoName}/settings/integrations`
  )
  console.log('   2. Add integration: Neon Postgres')
  console.log('   3. Add integration: Upstash Redis')
  console.log('   4. Add integration: Vercel Blob')
  console.log('   5. Press Enter when done...')

  process.stdin.setRawMode(true)
  await new Promise((resolve) => process.stdin.once('data', resolve))
  process.stdin.setRawMode(false)
  console.log()
}

// ============================================================================
// Step 6: Generate Cleanup Commands
// ============================================================================

function generateCleanupCommands() {
  console.log('\n📋 Cleanup Commands\n')
  console.log('Once ALL tenants are verified working (48+ hours), run:\n')

  console.log('# Delete old Vercel projects:')
  console.log('vercel project rm cgk-meliusly-storefront --scope cgk-linens-88e79683')
  console.log('vercel project rm cgk-admin --scope cgk-linens-88e79683')
  console.log('vercel project rm cgk-storefront --scope cgk-linens-88e79683')
  console.log('vercel project rm cgk-shopify-app --scope cgk-linens-88e79683')
  console.log('vercel project rm cgk-orchestrator --scope cgk-linens-88e79683')
  console.log('vercel project rm cgk-creator-portal --scope cgk-linens-88e79683')
  console.log('vercel project rm cgk-contractor-portal --scope cgk-linens-88e79683')
  console.log('vercel project rm cgk-command-center --scope cgk-linens-88e79683')
  console.log('vercel project rm cgk-mcp-server --scope cgk-linens-88e79683')
  console.log()

  console.log('# Clean database:')
  console.log('psql $DATABASE_URL -c "DROP SCHEMA IF EXISTS tenant_meliusly CASCADE;"')
  console.log('psql $DATABASE_URL -c "DROP SCHEMA IF EXISTS tenant_cgk_linens CASCADE;"')
  console.log('psql $DATABASE_URL -c "DROP SCHEMA IF EXISTS tenant_vitahustle CASCADE;"')
  console.log('psql $DATABASE_URL -c "DROP SCHEMA IF EXISTS tenant_rawdog CASCADE;"')
  console.log(
    "psql $DATABASE_URL -c \"DELETE FROM public.organizations WHERE slug IN ('meliusly', 'cgk-linens', 'vitahustle', 'rawdog');\""
  )
  console.log()
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║  Automated Tenant Migration - WordPress-Style Distribution  ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  // Step 0: Environment check
  checkEnvironment()

  // Step 1: Verify tenants
  await verifyTenants()

  // Step 2: Setup template repo
  await setupTemplateRepo()

  // Step 3-5: Export and deploy each tenant
  for (const tenant of TENANTS) {
    await exportTenant(tenant)
    await deployTenant(tenant)
    await addVercelIntegrations(tenant)
  }

  // Step 6: Generate cleanup commands
  generateCleanupCommands()

  console.log('✅ Migration complete!\n')
  console.log('Next steps:')
  console.log('1. Verify each tenant deployment works')
  console.log('2. Update DNS to point to new deployments')
  console.log('3. Monitor for 48 hours')
  console.log('4. Run cleanup commands above\n')
}

main().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
