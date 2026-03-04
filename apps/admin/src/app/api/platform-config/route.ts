import { requireAuth } from '@cgk-platform/auth'
import { validatePlatformConfigSafe } from '@cgk-platform/core'
import { promises as fs } from 'fs'
import { NextResponse } from 'next/server'
import path from 'path'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface TenantConfig {
  slug: string
  name: string
  schema: string
  primaryColor: string
  secondaryColor: string
  logo: string
  domain: string
  apps?: {
    storefront?: string
    admin?: string
  }
}

interface PlatformConfigData {
  deployment: {
    name: string
    organization?: string
    mode: 'single-tenant' | 'multi-tenant'
  }
  tenants: TenantConfig[]
  vercel?: {
    team: string
    projects: string[]
  }
  hub?: {
    database?: string
    cache?: string
    provider?: string
  }
  features?: {
    multiTenant?: boolean
    shopifyIntegration?: boolean
    stripeConnect?: boolean
    wisePayments?: boolean
    creatorPortal?: boolean
    contractorPortal?: boolean
    videoTranscription?: boolean
    aiFeatures?: boolean
    analyticsIntegrations?: boolean
    openclawIntegration?: boolean
    commandCenter?: boolean
    creativeStudio?: boolean
  }
}

const CONFIG_FILE_PATH = path.join(process.cwd(), '../..', 'platform.config.ts')

/**
 * GET /api/platform-config
 * Read current platform configuration
 */
export async function GET(req: Request) {
  try {
    await requireAuth(req)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const fileContent = await fs.readFile(CONFIG_FILE_PATH, 'utf-8')

    const config = parseConfigFile(fileContent)

    return NextResponse.json({ config, success: true })
  } catch (error) {
    console.error('Failed to read config:', error)
    return NextResponse.json(
      { error: 'Failed to read configuration file', success: false },
      { status: 500 }
    )
  }
}

/**
 * POST /api/platform-config
 * Update platform configuration
 */
export async function POST(req: Request) {
  try {
    await requireAuth(req)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await req.json()) as { config: PlatformConfigData }
    const { config } = body

    const validationResult = validatePlatformConfigSafe(config)
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: validationResult.errors.join('\n'), success: false },
        { status: 400 }
      )
    }

    const fileContent = generateConfigFile(config)

    await fs.writeFile(CONFIG_FILE_PATH, fileContent, 'utf-8')

    return NextResponse.json({ success: true, message: 'Configuration saved successfully' })
  } catch (error) {
    console.error('Failed to save config:', error)
    return NextResponse.json(
      { error: 'Failed to save configuration file', success: false },
      { status: 500 }
    )
  }
}

/**
 * Parse TypeScript config file to extract JSON data
 */
function parseConfigFile(content: string): PlatformConfigData {
  const deploymentMatch = content.match(/deployment:\s*{([^}]+)}/s)
  const tenantsMatch = content.match(/tenants:\s*\[([^\]]+)\]/s)
  const vercelMatch = content.match(/vercel:\s*{([^}]+)}/s)
  const hubMatch = content.match(/hub:\s*{([^}]+)}/s)
  const featuresMatch = content.match(/features:\s*{([^}]+)}/s)

  const deployment = deploymentMatch
    ? parseObjectLiteral(deploymentMatch[1])
    : { name: '', mode: 'single-tenant' as const }
  const tenants = tenantsMatch ? parseArrayOfObjects(tenantsMatch[1]) : []
  const vercel = vercelMatch ? parseObjectLiteral(vercelMatch[1]) : undefined
  const hub = hubMatch ? parseObjectLiteral(hubMatch[1]) : undefined
  const features = featuresMatch ? parseObjectLiteral(featuresMatch[1]) : undefined

  if (vercel?.projects && typeof vercel.projects === 'string') {
    vercel.projects = (vercel.projects as string)
      .replace(/[\[\]']/g, '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
  }

  return {
    deployment: deployment as unknown as PlatformConfigData['deployment'],
    tenants: tenants as unknown as TenantConfig[],
    vercel: vercel as unknown as PlatformConfigData['vercel'],
    hub: hub as unknown as PlatformConfigData['hub'],
    features: features as unknown as PlatformConfigData['features'],
  }
}

/**
 * Parse object literal string to object
 */
function parseObjectLiteral(str: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const lines = str.split('\n').map((l) => l.trim())

  for (const line of lines) {
    if (!line || line.startsWith('//') || line.startsWith('/*')) continue

    const match = line.match(/(\w+):\s*(.+?),?$/)
    if (!match) continue

    const [, key, value] = match
    if (!key || !value) continue

    let parsedValue: string | boolean = value.trim().replace(/,$/, '').trim()

    if (parsedValue === 'true') {
      parsedValue = true
    } else if (parsedValue === 'false') {
      parsedValue = false
    } else if (parsedValue.startsWith("'") || parsedValue.startsWith('"')) {
      parsedValue = parsedValue.slice(1, -1)
    } else if (parsedValue.startsWith('[')) {
      parsedValue = parsedValue
    }

    result[key] = parsedValue as unknown
  }

  return result
}

/**
 * Parse array of object literals
 */
function parseArrayOfObjects(str: string): Record<string, unknown>[] {
  const objects: Record<string, unknown>[] = []
  const objMatches = str.match(/{[^}]+}/gs)

  if (!objMatches) return []

  for (const objStr of objMatches) {
    const content = objStr.slice(1, -1)
    objects.push(parseObjectLiteral(content))
  }

  return objects
}

/**
 * Generate TypeScript config file content
 */
function generateConfigFile(config: PlatformConfigData): string {
  const tenantsCode = config.tenants
    .map(
      (t) => `    {
      slug: '${t.slug}',
      name: '${t.name}',
      schema: '${t.schema}',
      primaryColor: '${t.primaryColor}',
      secondaryColor: '${t.secondaryColor}',
      logo: '${t.logo}',
      domain: '${t.domain}',${
        t.apps
          ? `
      apps: {${t.apps.storefront ? `\n        storefront: '${t.apps.storefront}',` : ''}${t.apps.admin ? `\n        admin: '${t.apps.admin}',` : ''}
      },`
          : ''
      }
    }`
    )
    .join(',\n')

  const vercelCode = config.vercel
    ? `
  /**
   * Vercel Configuration
   * All apps deployed under single Vercel team
   */
  vercel: {
    team: '${config.vercel.team}',
    projects: [
${config.vercel.projects.map((p) => `      '${p}'`).join(',\n')},
    ],
  },`
    : ''

  const hubCode = config.hub
    ? `
  /**
   * Platform Hub Connection
   * Shared infrastructure provided by CGK Platform
   */
  hub: {
    database: '${config.hub.database || 'neon-postgresql'}',
    cache: '${config.hub.cache || 'upstash-redis'}',
    provider: '${config.hub.provider || 'cgk-platform'}',
  },`
    : ''

  const featuresCode = config.features
    ? `
  /**
   * Feature Flags
   * Control which features are enabled for this deployment
   */
  features: {
    multiTenant: ${config.features.multiTenant ?? true},
    shopifyIntegration: ${config.features.shopifyIntegration ?? true},
    stripeConnect: ${config.features.stripeConnect ?? true},
    wisePayments: ${config.features.wisePayments ?? true},
    creatorPortal: ${config.features.creatorPortal ?? true},
    contractorPortal: ${config.features.contractorPortal ?? true},
    videoTranscription: ${config.features.videoTranscription ?? true},
    aiFeatures: ${config.features.aiFeatures ?? true},
    analyticsIntegrations: ${config.features.analyticsIntegrations ?? true},
    openclawIntegration: ${config.features.openclawIntegration ?? false},
    commandCenter: ${config.features.commandCenter ?? false},
    creativeStudio: ${config.features.creativeStudio ?? false},
  },`
    : ''

  return `/**
 * CGK Platform - Brand Configuration
 *
 * This file contains brand-specific configuration for your deployment.
 * It is protected from upstream merges by .gitattributes (merge=ours).
 *
 * Your deployment manages ${config.tenants.length} brand${config.tenants.length > 1 ? 's' : ''}:
${config.tenants.map((t, i) => ` * ${i + 1}. ${t.name} (${t.schema})`).join('\n')}
 */

import { validatePlatformConfig } from '@cgk-platform/core'

const platformConfigDraft = {
  /**
   * Deployment Information
   */
  deployment: {
    name: '${config.deployment.name}',${config.deployment.organization ? `\n    organization: '${config.deployment.organization}',` : ''}
    mode: '${config.deployment.mode}',
  },

  /**
   * Tenants/Brands in this deployment
   * Each tenant gets its own schema in the shared database
   */
  tenants: [
${tenantsCode}
  ],${vercelCode}${hubCode}${featuresCode}
} as const

// Validate configuration at module load
// This catches configuration errors immediately rather than at runtime
try {
  validatePlatformConfig(platformConfigDraft)
} catch (error) {
  if (error instanceof Error) {
    console.error('\\n' + '='.repeat(80))
    console.error('❌ PLATFORM CONFIGURATION ERROR')
    console.error('='.repeat(80))
    console.error(error.message)
    console.error('='.repeat(80) + '\\n')
  }
  throw error
}

// Export validated config
export const platformConfig = platformConfigDraft
export type PlatformConfig = typeof platformConfig

/**
 * Get configuration for a specific tenant
 */
export function getTenantConfig(slug: string) {
  return platformConfig.tenants.find((t) => t.slug === slug)
}

/**
 * Get all tenant slugs
 */
export function getAllTenantSlugs() {
  return platformConfig.tenants.map((t) => t.slug)
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof platformConfig.features) {
  return platformConfig.features[feature]
}
`
}
