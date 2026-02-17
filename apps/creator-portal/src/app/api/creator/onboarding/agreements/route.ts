/**
 * Creator Onboarding Agreements API
 *
 * GET /api/creator/onboarding/agreements - Get pending agreement documents for creator
 */

import { sql, withTenant, getTenantFromRequest } from '@cgk-platform/db'

import { getCreatorContext } from '../../../../../lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface AgreementDocument {
  id: string
  title: string
  version: string
  url: string
  required: boolean
}

/**
 * Get pending agreement documents for creator onboarding
 */
export async function GET(request: Request): Promise<Response> {
  const tenant = await getTenantFromRequest(request)

  if (!tenant) {
    return Response.json(
      { error: 'Tenant context required' },
      { status: 400 }
    )
  }

  // Get creator context if authenticated (may be null during onboarding)
  const creatorContext = await getCreatorContext(request)
  const creatorEmail = creatorContext?.email?.toLowerCase()

  // Fetch pending esign documents for the creator
  const documents = await withTenant(tenant.slug, async () => {
    // If we have a creator email, look for pending documents assigned to them
    if (creatorEmail) {
      const result = await sql`
        SELECT
          ed.id,
          ed.name as title,
          ed.file_url as url,
          COALESCE(et.name, 'v1.0') as version,
          CASE WHEN es.role = 'signer' THEN true ELSE false END as required
        FROM esign_documents ed
        INNER JOIN esign_signers es ON es.document_id = ed.id
        LEFT JOIN esign_templates et ON et.id = ed.template_id
        WHERE es.email = ${creatorEmail}
          AND es.status IN ('pending', 'sent', 'viewed')
          AND ed.status IN ('pending', 'in_progress')
        ORDER BY ed.created_at ASC
      `

      return result.rows.map((row) => ({
        id: row.id as string,
        title: row.title as string,
        version: extractVersion(row.version as string),
        url: row.url as string,
        required: row.required as boolean,
      }))
    }

    // For unauthenticated users (during initial onboarding), return active templates
    // that are marked as required for creator onboarding
    const result = await sql`
      SELECT
        id,
        name as title,
        file_url as url,
        'v1.0' as version
      FROM esign_templates
      WHERE status = 'active'
      ORDER BY created_at ASC
      LIMIT 10
    `

    return result.rows.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      version: '1.0',
      url: row.url as string,
      required: true,
    }))
  })

  return Response.json({
    documents: documents as AgreementDocument[],
  })
}

/**
 * Extract version number from template name or return default
 */
function extractVersion(nameOrVersion: string): string {
  // If it looks like a version already, return it
  if (/^\d+(\.\d+)?$/.test(nameOrVersion)) {
    return nameOrVersion
  }

  // Try to extract version from name like "Template Name v2.1"
  const versionMatch = nameOrVersion.match(/v?(\d+(?:\.\d+)?)\s*$/i)
  if (versionMatch) {
    return versionMatch[1] as string
  }

  return '1.0'
}
