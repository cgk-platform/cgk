export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { searchAssets, type SearchOptions, type AssetType } from '@cgk-platform/dam'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const query = url.searchParams.get('q') || ''

  if (!query) {
    return NextResponse.json({ error: 'Query parameter q is required' }, { status: 400 })
  }

  const options: SearchOptions = {
    query,
    tenantId: tenantSlug,
    limit: Math.min(100, parseInt(url.searchParams.get('limit') || '50', 10)),
    offset: parseInt(url.searchParams.get('offset') || '0', 10),
    assetTypes: url.searchParams.get('types')?.split(',').filter(Boolean) as AssetType[] || undefined,
    tags: url.searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
    collectionId: url.searchParams.get('collection') || undefined,
    includeArchived: url.searchParams.get('archived') === 'true',
    sort: (url.searchParams.get('sort') || 'relevance') as SearchOptions['sort'],
    dir: (url.searchParams.get('dir') || 'desc') as SearchOptions['dir'],
  }

  const result = await withTenant(tenantSlug, () => searchAssets(options)) as { assets: unknown[]; totalCount: number; query: string }

  return NextResponse.json({
    assets: result.assets,
    totalCount: result.totalCount,
    query: result.query,
  })
}
