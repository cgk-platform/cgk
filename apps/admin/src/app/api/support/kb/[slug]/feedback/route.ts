export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getPublicArticle, submitFeedback } from '@/lib/knowledge-base/db'
import type { FeedbackInput } from '@/lib/knowledge-base/types'

interface RouteParams {
  params: Promise<{ slug: string }>
}

/**
 * POST /api/support/kb/[slug]/feedback - Submit feedback on a KB article
 *
 * Request body:
 * - isHelpful: boolean (required)
 * - comment: string (optional)
 * - visitorId: string (optional, for rate limiting)
 */
export async function POST(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { slug } = await params

  let body: FeedbackInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body.isHelpful !== 'boolean') {
    return NextResponse.json(
      { error: 'isHelpful is required and must be a boolean' },
      { status: 400 },
    )
  }

  // Get the article first to validate it exists and is public
  const article = await withTenant(tenantSlug, () => getPublicArticle(slug))

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  try {
    const feedback = await withTenant(tenantSlug, () =>
      submitFeedback(article.id, {
        isHelpful: body.isHelpful,
        comment: body.comment,
        visitorId: body.visitorId,
      })
    )

    return NextResponse.json({ feedback }, { status: 201 })
  } catch (error) {
    // Handle rate limiting (unique constraint violation)
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json(
        { error: 'You have already submitted feedback for this article today' },
        { status: 429 },
      )
    }
    throw error
  }
}
