import { createTenantCache, sql } from '@cgk/db'

export interface TenantFeatures {
  creators: boolean
  contractors: boolean
  subscriptions: boolean
  abTesting: boolean
  attribution: boolean
  scheduling: boolean
}

export interface TenantColors {
  primary: string
  secondary: string
  accent: string
}

export interface TenantConfig {
  id: string
  name: string
  slug: string
  logo: string | null
  favicon: string | null
  colors: TenantColors
  features: TenantFeatures
  shopifyDomain: string | null
  status: 'onboarding' | 'active' | 'suspended'
}

const DEFAULT_COLORS: TenantColors = {
  primary: '222.2 47.4% 11.2%',
  secondary: '210 40% 96.1%',
  accent: '210 40% 96.1%',
}

const DEFAULT_FEATURES: TenantFeatures = {
  creators: true,
  contractors: true,
  subscriptions: true,
  abTesting: false,
  attribution: false,
  scheduling: true,
}

export async function getTenantConfig(tenantSlug: string): Promise<TenantConfig | null> {
  const cache = createTenantCache(tenantSlug)
  const cached = await cache.get<TenantConfig>('tenant-config')
  if (cached) return cached

  const result = await sql`
    SELECT id, name, slug, settings, shopify_store_domain, status
    FROM organizations
    WHERE slug = ${tenantSlug}
  `

  const row = result.rows[0]
  if (!row) return null

  const settings = (row.settings as Record<string, unknown>) || {}

  const config: TenantConfig = {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    logo: (settings.logo as string) || null,
    favicon: (settings.favicon as string) || null,
    colors: {
      ...DEFAULT_COLORS,
      ...((settings.colors as Partial<TenantColors>) || {}),
    },
    features: {
      ...DEFAULT_FEATURES,
      ...((settings.features as Partial<TenantFeatures>) || {}),
    },
    shopifyDomain: (row.shopify_store_domain as string) || null,
    status: row.status as TenantConfig['status'],
  }

  await cache.set('tenant-config', config, { ttl: 300 })

  return config
}
