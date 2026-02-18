import {
  getAuthCookie,
  getSuperAdminUser,
  validateSuperAdminSessionById,
  verifyJWT,
} from '@cgk-platform/auth'
import { sql } from '@cgk-platform/db'

export const dynamic = 'force-dynamic'

// =============================================================================
// Types
// =============================================================================

interface SecuritySettings {
  sessionTimeoutMinutes: number
  inactivityTimeoutMinutes: number
  mfaRequired: boolean
  maxSessionsPerUser: number
  ipAllowlistEnabled: boolean
  enforceStrongPasswords: boolean
  passwordMinLength: number
  passwordRequireSpecialChars: boolean
  passwordRequireNumbers: boolean
  maxLoginAttempts: number
  lockoutDurationMinutes: number
}

interface PlatformConfig {
  defaultFeatureFlags: Record<string, boolean>
  maxTenantsPerUser: number
  maxUsersPerTenant: number
  maxApiKeysPerTenant: number
  maintenanceMode: boolean
  maintenanceMessage: string
  allowNewRegistrations: boolean
  defaultPlan: string
}

interface RateLimitConfig {
  apiRequestsPerMinute: number
  sensitiveRequestsPerMinute: number
  loginAttemptsPerHour: number
  webhookCallsPerMinute: number
  fileUploadsPerDay: number
  enableBurstMode: boolean
  burstMultiplier: number
}

interface NotificationSettings {
  slackWebhookUrl: string
  slackChannelAlerts: string
  slackChannelErrors: string
  emailAlertsEnabled: boolean
  emailAlertsRecipients: string[]
  alertOnP1: boolean
  alertOnP2: boolean
  alertOnP3: boolean
  alertOnNewTenant: boolean
  alertOnHealthDegraded: boolean
  dailyDigestEnabled: boolean
  dailyDigestTime: string
}

interface PlatformSettings {
  security: SecuritySettings
  platform: PlatformConfig
  rateLimits: RateLimitConfig
  notifications: NotificationSettings
}

interface IpAllowlistEntry {
  id: string
  ipAddress: string
  description: string | null
  addedBy: string | null
  addedByEmail: string | null
  isActive: boolean
  createdAt: string
}

// =============================================================================
// Default Values
// =============================================================================

const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  sessionTimeoutMinutes: 240,
  inactivityTimeoutMinutes: 30,
  mfaRequired: true,
  maxSessionsPerUser: 1,
  ipAllowlistEnabled: false,
  enforceStrongPasswords: true,
  passwordMinLength: 12,
  passwordRequireSpecialChars: true,
  passwordRequireNumbers: true,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 15,
}

const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  defaultFeatureFlags: {},
  maxTenantsPerUser: 10,
  maxUsersPerTenant: 100,
  maxApiKeysPerTenant: 20,
  maintenanceMode: false,
  maintenanceMessage: '',
  allowNewRegistrations: true,
  defaultPlan: 'starter',
}

const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  apiRequestsPerMinute: 100,
  sensitiveRequestsPerMinute: 10,
  loginAttemptsPerHour: 10,
  webhookCallsPerMinute: 50,
  fileUploadsPerDay: 100,
  enableBurstMode: true,
  burstMultiplier: 2,
}

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  slackWebhookUrl: '',
  slackChannelAlerts: '#alerts',
  slackChannelErrors: '#errors',
  emailAlertsEnabled: false,
  emailAlertsRecipients: [],
  alertOnP1: true,
  alertOnP2: true,
  alertOnP3: false,
  alertOnNewTenant: true,
  alertOnHealthDegraded: true,
  dailyDigestEnabled: false,
  dailyDigestTime: '09:00',
}

// =============================================================================
// Helper: Validate super admin session
// =============================================================================

async function validateSuperAdmin(request: Request): Promise<{ userId: string } | Response> {
  const token = getAuthCookie(request)

  if (!token) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let payload
  try {
    payload = await verifyJWT(token)
  } catch {
    return Response.json({ error: 'Invalid session' }, { status: 401 })
  }

  const session = await validateSuperAdminSessionById(payload.sid)
  if (!session) {
    return Response.json({ error: 'Session expired or revoked' }, { status: 401 })
  }

  const superAdmin = await getSuperAdminUser(payload.sub)
  if (!superAdmin || !superAdmin.isActive) {
    return Response.json({ error: 'Super admin access required' }, { status: 403 })
  }

  return { userId: payload.sub }
}

// =============================================================================
// GET /api/platform/settings
// =============================================================================

export async function GET(request: Request) {
  try {
    const authResult = await validateSuperAdmin(request)
    if (authResult instanceof Response) {
      return authResult
    }

    // Fetch all settings from platform_config
    const configResult = await sql`
      SELECT key, value FROM platform_config
      WHERE key IN ('security', 'platform', 'rateLimits', 'notifications')
    `

    // Build settings object from database
    const settings: PlatformSettings = {
      security: DEFAULT_SECURITY_SETTINGS,
      platform: DEFAULT_PLATFORM_CONFIG,
      rateLimits: DEFAULT_RATE_LIMITS,
      notifications: DEFAULT_NOTIFICATIONS,
    }

    for (const row of configResult.rows) {
      const typedRow = row as { key: string; value: unknown }
      if (typedRow.key === 'security' && typedRow.value) {
        settings.security = { ...DEFAULT_SECURITY_SETTINGS, ...(typedRow.value as Partial<SecuritySettings>) }
      } else if (typedRow.key === 'platform' && typedRow.value) {
        settings.platform = { ...DEFAULT_PLATFORM_CONFIG, ...(typedRow.value as Partial<PlatformConfig>) }
      } else if (typedRow.key === 'rateLimits' && typedRow.value) {
        settings.rateLimits = { ...DEFAULT_RATE_LIMITS, ...(typedRow.value as Partial<RateLimitConfig>) }
      } else if (typedRow.key === 'notifications' && typedRow.value) {
        settings.notifications = { ...DEFAULT_NOTIFICATIONS, ...(typedRow.value as Partial<NotificationSettings>) }
      }
    }

    // Fetch IP allowlist
    const ipResult = await sql`
      SELECT
        ial.id,
        ial.ip_address,
        ial.description,
        ial.added_by,
        u.email as added_by_email,
        ial.is_active,
        ial.created_at
      FROM super_admin_ip_allowlist ial
      LEFT JOIN users u ON ial.added_by = u.id
      ORDER BY ial.created_at DESC
    `

    const ipAllowlist: IpAllowlistEntry[] = ipResult.rows.map((row) => {
      const typedRow = row as {
        id: string
        ip_address: string
        description: string | null
        added_by: string | null
        added_by_email: string | null
        is_active: boolean
        created_at: Date
      }
      return {
        id: typedRow.id,
        ipAddress: typedRow.ip_address,
        description: typedRow.description,
        addedBy: typedRow.added_by,
        addedByEmail: typedRow.added_by_email,
        isActive: typedRow.is_active,
        createdAt: typedRow.created_at.toISOString(),
      }
    })

    return Response.json({
      settings,
      ipAllowlist,
    })
  } catch (error) {
    console.error('Failed to fetch settings:', error)
    return Response.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// =============================================================================
// PUT /api/platform/settings
// =============================================================================

export async function PUT(request: Request) {
  try {
    const authResult = await validateSuperAdmin(request)
    if (authResult instanceof Response) {
      return authResult
    }
    const { userId } = authResult

    const body = await request.json() as Partial<PlatformSettings>

    // Validate and save each settings section
    if (body.security) {
      await upsertConfig('security', body.security)
      await logAudit(userId, 'update_security_settings', 'platform_config', null, request)
    }

    if (body.platform) {
      await upsertConfig('platform', body.platform)
      await logAudit(userId, 'update_platform_config', 'platform_config', null, request)
    }

    if (body.rateLimits) {
      await upsertConfig('rateLimits', body.rateLimits)
      await logAudit(userId, 'update_rate_limits', 'platform_config', null, request)
    }

    if (body.notifications) {
      await upsertConfig('notifications', body.notifications)
      await logAudit(userId, 'update_notifications', 'platform_config', null, request)
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Failed to save settings:', error)
    return Response.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}

// =============================================================================
// Helpers
// =============================================================================

async function upsertConfig(key: string, value: unknown) {
  const jsonValue = JSON.stringify(value)

  await sql`
    INSERT INTO platform_config (key, value)
    VALUES (${key}, ${jsonValue}::jsonb)
    ON CONFLICT (key) DO UPDATE
    SET value = ${jsonValue}::jsonb, updated_at = NOW()
  `
}

async function logAudit(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string | null,
  request: Request
) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') ||
             'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  await sql`
    INSERT INTO super_admin_audit_log (
      user_id,
      action,
      resource_type,
      resource_id,
      ip_address,
      user_agent
    ) VALUES (
      ${userId}::uuid,
      ${action},
      ${resourceType},
      ${resourceId}::uuid,
      ${ip}::inet,
      ${userAgent}
    )
  `
}
