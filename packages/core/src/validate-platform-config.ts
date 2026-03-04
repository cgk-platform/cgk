import { z } from 'zod'

/**
 * Validation schema for platform configuration
 *
 * This validates the structure defined in platform.config.ts
 * and catches configuration errors at module load time.
 */

// Tenant configuration schema
const TenantConfigSchema = z.object({
  slug: z
    .string()
    .min(1, 'Tenant slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),

  name: z.string().min(1, 'Tenant name is required'),

  schema: z
    .string()
    .regex(
      /^tenant_[a-z0-9_]+$/,
      'Schema must start with tenant_ and contain only lowercase, numbers, underscores'
    ),

  primaryColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Primary color must be valid hex color (#RRGGBB)'),

  secondaryColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Secondary color must be valid hex color (#RRGGBB)'),

  logo: z
    .string()
    .refine((val) => val.startsWith('/') || val.startsWith('http'), 'Logo must be a path or URL'),

  domain: z.string().min(3, 'Domain must be at least 3 characters'),

  apps: z
    .object({
      storefront: z.string().optional(),
      admin: z.string().optional(),
    })
    .optional(),
})

// Deployment configuration schema
const DeploymentSchema = z.object({
  name: z.string().min(1, 'Deployment name is required'),
  organization: z.string().optional(),
  mode: z.enum(['single-tenant', 'multi-tenant'], {
    message: 'Mode must be either "single-tenant" or "multi-tenant"',
  }),
})

// Vercel configuration schema
const VercelSchema = z.object({
  team: z.string().min(1, 'Vercel team is required'),
  projects: z.array(z.string()).min(1, 'At least one Vercel project required'),
})

// Hub configuration schema
const HubSchema = z.object({
  database: z.string().optional(),
  cache: z.string().optional(),
  provider: z.string().optional(),
})

// Features configuration schema
const FeaturesSchema = z.object({
  multiTenant: z.boolean().optional(),
  shopifyIntegration: z.boolean().optional(),
  stripeConnect: z.boolean().optional(),
  wisePayments: z.boolean().optional(),
  creatorPortal: z.boolean().optional(),
  contractorPortal: z.boolean().optional(),
  videoTranscription: z.boolean().optional(),
  aiFeatures: z.boolean().optional(),
  analyticsIntegrations: z.boolean().optional(),
  openclawIntegration: z.boolean().optional().default(false),
  commandCenter: z.boolean().optional().default(false),
  creativeStudio: z.boolean().optional().default(false),
})

// Complete platform configuration schema
const PlatformConfigSchema = z.object({
  deployment: DeploymentSchema,
  tenants: z.array(TenantConfigSchema).min(1, 'At least one tenant required'),
  vercel: VercelSchema.optional(),
  hub: HubSchema.optional(),
  features: FeaturesSchema.optional(),
})

export type ValidatedPlatformConfig = z.infer<typeof PlatformConfigSchema>

/**
 * Validate platform configuration
 *
 * @param config - The platform configuration to validate
 * @throws Error with detailed validation messages if config is invalid
 */
export function validatePlatformConfig(config: unknown): void {
  try {
    const validatedConfig = PlatformConfigSchema.parse(config)

    // Additional validation: Check for duplicate schemas
    const schemas = new Set<string>()
    for (const tenant of validatedConfig.tenants) {
      if (schemas.has(tenant.schema)) {
        throw new Error(
          `Duplicate schema detected: "${tenant.schema}". Each tenant must have a unique schema name.`
        )
      }
      schemas.add(tenant.schema)
    }

    // Additional validation: Check for duplicate slugs
    const slugs = new Set<string>()
    for (const tenant of validatedConfig.tenants) {
      if (slugs.has(tenant.slug)) {
        throw new Error(
          `Duplicate slug detected: "${tenant.slug}". Each tenant must have a unique slug.`
        )
      }
      slugs.add(tenant.slug)
    }

    // Additional validation: Check for duplicate domains
    const domains = new Set<string>()
    for (const tenant of validatedConfig.tenants) {
      if (domains.has(tenant.domain)) {
        throw new Error(
          `Duplicate domain detected: "${tenant.domain}". Each tenant must have a unique domain.`
        )
      }
      domains.add(tenant.domain)
    }

    // Additional validation: Multi-tenant mode requires multiple tenants
    if (validatedConfig.deployment.mode === 'multi-tenant' && validatedConfig.tenants.length < 2) {
      throw new Error(
        'Multi-tenant mode requires at least 2 tenants. Use "single-tenant" mode for one tenant.'
      )
    }

    // Additional validation: Single-tenant mode should only have one tenant
    if (validatedConfig.deployment.mode === 'single-tenant' && validatedConfig.tenants.length > 1) {
      console.warn(
        `Warning: Single-tenant mode configured with ${validatedConfig.tenants.length} tenants. Consider using "multi-tenant" mode.`
      )
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((err: z.ZodIssue) => {
        const path = err.path.join('.')
        return `  - ${path}: ${err.message}`
      })

      throw new Error(
        `Platform configuration validation failed:\n\n${errorMessages.join('\n')}\n\n` +
          `Please fix the errors in platform.config.ts and try again.`
      )
    }
    throw error
  }
}

/**
 * Validate platform configuration and return result
 *
 * @param config - The platform configuration to validate
 * @returns Object with valid boolean and errors array
 */
export function validatePlatformConfigSafe(config: unknown): {
  valid: boolean
  errors: string[]
} {
  try {
    validatePlatformConfig(config)
    return { valid: true, errors: [] }
  } catch (error) {
    if (error instanceof Error) {
      return { valid: false, errors: [error.message] }
    }
    return { valid: false, errors: ['Unknown validation error'] }
  }
}
