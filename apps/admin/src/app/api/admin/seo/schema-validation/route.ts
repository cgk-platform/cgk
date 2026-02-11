export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  validatePostSchema,
  validateAllPostSchemas,
  getPostsWithSchemaIssues,
  getSchemaValidationSummary,
} from '@/lib/seo/schema-validator'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const postId = searchParams.get('postId')
  const view = searchParams.get('view') || 'all'

  // Validate a single post
  if (postId) {
    const result = await withTenant(tenantSlug, () => validatePostSchema(postId))

    if (!result) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({ result })
  }

  // Get summary
  if (view === 'summary') {
    const summary = await withTenant(tenantSlug, () => getSchemaValidationSummary())
    return NextResponse.json({ summary })
  }

  // Get only posts with issues
  if (view === 'issues') {
    const results = await withTenant(tenantSlug, () => getPostsWithSchemaIssues())
    return NextResponse.json({ results })
  }

  // Validate all posts
  const results = await withTenant(tenantSlug, () => validateAllPostSchemas())
  return NextResponse.json({ results })
}
