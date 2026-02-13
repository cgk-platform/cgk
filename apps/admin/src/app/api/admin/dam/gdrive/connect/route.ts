export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { generateAuthorizationUrl, getOAuthConfigFromEnv, type OAuthState } from '@cgk-platform/dam'

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
  }

  let body: { folder_id?: string; return_url?: string }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  try {
    const oauthConfig = getOAuthConfigFromEnv()

    const state: OAuthState = {
      tenantId: tenantSlug,
      userId,
      folderId: body.folder_id,
      returnUrl: body.return_url,
    }

    const authUrl = generateAuthorizationUrl(oauthConfig, state)

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Failed to generate auth URL:', error)
    return NextResponse.json(
      { error: 'Google Drive integration not configured' },
      { status: 500 }
    )
  }
}
