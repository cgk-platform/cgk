export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getTagSuggestions, getPopularTags, type TagWithCount } from '@cgk/dam'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const query = url.searchParams.get('q') || ''
  const limit = Math.min(20, parseInt(url.searchParams.get('limit') || '10', 10))

  if (query.length >= 2) {
    // Get suggestions based on partial query
    const suggestions = await withTenant(tenantSlug, () =>
      getTagSuggestions(tenantSlug, query, limit)
    )
    return NextResponse.json({ suggestions })
  } else {
    // Return popular tags
    const tags = await withTenant(tenantSlug, () =>
      getPopularTags(tenantSlug, limit)
    )
    return NextResponse.json({ suggestions: (tags as TagWithCount[]).map((t: TagWithCount) => ({ tag: t.tag, count: t.count, relevance: 0 })) })
  }
}
