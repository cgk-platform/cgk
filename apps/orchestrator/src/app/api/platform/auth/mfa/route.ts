import { createHmac, randomBytes } from 'crypto'

import {
  checkRateLimit,
  getAuthCookie,
  getSuperAdminUser,
  logAuditAction,
  markMfaVerified,
  validateSuperAdminSessionById,
  verifyJWT,
} from '@cgk/auth'
import { sql } from '@cgk/db'

export const dynamic = 'force-dynamic'

/**
 * TOTP verification implementation
 *
 * Uses HMAC-SHA1 for TOTP code generation compatible with
 * Google Authenticator, Authy, and other TOTP apps.
 */

/**
 * Decode base32 string to Buffer
 */
function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const cleanInput = input.toUpperCase().replace(/=+$/, '')

  let bits = 0
  let value = 0
  const output: number[] = []

  for (const char of cleanInput) {
    const idx = alphabet.indexOf(char)
    if (idx === -1) continue

    value = (value << 5) | idx
    bits += 5

    if (bits >= 8) {
      bits -= 8
      output.push((value >> bits) & 0xff)
    }
  }

  return Buffer.from(output)
}

/**
 * Encode Buffer to base32 string
 */
function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = 0
  let value = 0
  let output = ''

  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8

    while (bits >= 5) {
      bits -= 5
      output += alphabet[(value >> bits) & 0x1f]
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 0x1f]
  }

  return output
}

/**
 * Generate HMAC-based OTP
 */
function generateHOTP(secret: Buffer, counter: bigint): string {
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeBigInt64BE(counter)

  const hmac = createHmac('sha1', secret)
  hmac.update(counterBuffer)
  const digest = hmac.digest()

  const offset = digest[digest.length - 1]! & 0xf
  const code =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff)

  return (code % 1000000).toString().padStart(6, '0')
}

/**
 * Generate time-based OTP
 */
function generateTOTP(secret: string, timestamp: number = Date.now()): string {
  const secretBuffer = base32Decode(secret)
  const counter = BigInt(Math.floor(timestamp / 30000))
  return generateHOTP(secretBuffer, counter)
}

/**
 * Verify TOTP code with time drift tolerance
 */
function verifyTOTP(
  secret: string,
  code: string,
  timestamp: number = Date.now(),
  window: number = 1
): boolean {
  for (let i = -window; i <= window; i++) {
    const adjustedTime = timestamp + i * 30000
    if (generateTOTP(secret, adjustedTime) === code) {
      return true
    }
  }
  return false
}

/**
 * Generate a new TOTP secret (base32 encoded)
 */
function generateTOTPSecret(): string {
  const buffer = randomBytes(20)
  return base32Encode(buffer)
}

interface MfaVerifyBody {
  code: string
}

interface MfaSetupBody {
  action: 'setup'
}

type MfaRequestBody = MfaVerifyBody | MfaSetupBody

function isSetupRequest(body: MfaRequestBody): body is MfaSetupBody {
  return 'action' in body && body.action === 'setup'
}

function isVerifyRequest(body: MfaRequestBody): body is MfaVerifyBody {
  return 'code' in body
}

/**
 * POST /api/platform/auth/mfa
 *
 * Verify MFA code for the current session.
 * This endpoint is called after login when MFA is required.
 */
export async function POST(request: Request) {
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  try {
    const token = getAuthCookie(request)

    if (!token) {
      return Response.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Verify JWT
    let payload
    try {
      payload = await verifyJWT(token)
    } catch {
      return Response.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Validate session
    const session = await validateSuperAdminSessionById(payload.sid)
    if (!session) {
      return Response.json(
        { error: 'Session expired or revoked' },
        { status: 401 }
      )
    }

    // Rate limit MFA attempts (5 per minute)
    const withinRateLimit = await checkRateLimit(
      payload.sub,
      'mfa',
      5,
      60
    )

    if (!withinRateLimit) {
      return Response.json(
        {
          error: 'Too many MFA attempts. Please try again later.',
          retryAfter: 60,
        },
        {
          status: 429,
          headers: { 'Retry-After': '60' },
        }
      )
    }

    const body = await request.json() as MfaRequestBody

    // Handle setup request
    if (isSetupRequest(body)) {
      return handleMfaSetup(payload.sub, request)
    }

    // Handle verification
    if (!isVerifyRequest(body) || body.code.length !== 6) {
      return Response.json(
        { error: 'Invalid MFA code format' },
        { status: 400 }
      )
    }

    // Get super admin details
    const superAdmin = await getSuperAdminUser(payload.sub)
    if (!superAdmin) {
      return Response.json(
        { error: 'Super admin record not found' },
        { status: 401 }
      )
    }

    if (!superAdmin.mfaEnabled) {
      // MFA not enabled, just mark as verified
      await markMfaVerified(session.id)

      return Response.json({
        success: true,
        message: 'MFA not required',
        redirectTo: '/',
      })
    }

    // Get MFA secret from database
    const secretResult = await sql`
      SELECT mfa_secret_encrypted FROM super_admin_users
      WHERE user_id = ${payload.sub}
    `

    const row = secretResult.rows[0] as Record<string, unknown> | undefined
    if (!row?.mfa_secret_encrypted) {
      return Response.json(
        { error: 'MFA not configured. Please set up MFA first.' },
        { status: 400 }
      )
    }

    // Verify the TOTP code
    const secret = row.mfa_secret_encrypted as string
    const isValid = verifyTOTP(secret, body.code)

    if (!isValid) {
      // Log failed attempt
      await logAuditAction({
        userId: payload.sub,
        action: 'mfa_verify',
        resourceType: 'mfa',
        resourceId: session.id,
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') || null,
        metadata: { success: false, reason: 'invalid_code' },
      })

      return Response.json(
        { error: 'Invalid MFA code' },
        { status: 401 }
      )
    }

    // Mark session as MFA verified
    await markMfaVerified(session.id)

    // Update MFA verified timestamp on super admin user
    await sql`
      UPDATE super_admin_users
      SET mfa_verified_at = NOW()
      WHERE user_id = ${payload.sub}
    `

    // Log successful verification
    await logAuditAction({
      userId: payload.sub,
      action: 'mfa_verify',
      resourceType: 'mfa',
      resourceId: session.id,
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || null,
      metadata: { success: true },
    })

    return Response.json({
      success: true,
      message: 'MFA verified successfully',
      redirectTo: '/',
    })
  } catch (error) {
    console.error('MFA verification error:', error)
    return Response.json(
      { error: 'MFA verification failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle MFA setup request
 */
async function handleMfaSetup(userId: string, request: Request): Promise<Response> {
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  try {
    // Get super admin details
    const superAdmin = await getSuperAdminUser(userId)
    if (!superAdmin) {
      return Response.json(
        { error: 'Super admin record not found' },
        { status: 401 }
      )
    }

    // Get user email for QR code
    const userResult = await sql`
      SELECT email FROM users WHERE id = ${userId}
    `
    const userRow = userResult.rows[0] as Record<string, unknown> | undefined
    if (!userRow) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const email = userRow.email as string

    // Generate new TOTP secret
    const secret = generateTOTPSecret()

    // Store the secret (in production, encrypt this)
    await sql`
      UPDATE super_admin_users
      SET mfa_secret_encrypted = ${secret}, mfa_enabled = TRUE
      WHERE user_id = ${userId}
    `

    // Log MFA setup
    await logAuditAction({
      userId,
      action: 'mfa_setup',
      resourceType: 'mfa',
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || null,
      metadata: { action: 'generate_secret' },
    })

    // Generate QR code URL (otpauth format)
    const issuer = encodeURIComponent('CGK Orchestrator')
    const account = encodeURIComponent(email)
    const qrCodeUrl = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}`

    return Response.json({
      success: true,
      secret,
      qrCodeUrl,
      message: 'Scan the QR code with your authenticator app, then verify with a code',
    })
  } catch (error) {
    console.error('MFA setup error:', error)
    return Response.json(
      { error: 'MFA setup failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/platform/auth/mfa
 *
 * Get MFA status for current session.
 */
export async function GET(request: Request) {
  try {
    const token = getAuthCookie(request)

    if (!token) {
      return Response.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Verify JWT
    let payload
    try {
      payload = await verifyJWT(token)
    } catch {
      return Response.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Validate session
    const session = await validateSuperAdminSessionById(payload.sid)
    if (!session) {
      return Response.json(
        { error: 'Session expired or revoked' },
        { status: 401 }
      )
    }

    // Get super admin details
    const superAdmin = await getSuperAdminUser(payload.sub)
    if (!superAdmin) {
      return Response.json(
        { error: 'Super admin record not found' },
        { status: 401 }
      )
    }

    return Response.json({
      mfaEnabled: superAdmin.mfaEnabled,
      mfaVerified: session.mfaVerified,
      mfaVerifiedAt: session.mfaVerifiedAt,
      mfaChallengeExpiresAt: session.mfaChallengeExpiresAt,
    })
  } catch (error) {
    console.error('MFA status error:', error)
    return Response.json(
      { error: 'Failed to get MFA status' },
      { status: 500 }
    )
  }
}
