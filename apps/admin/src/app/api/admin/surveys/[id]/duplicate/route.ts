export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { duplicateSurvey } from '@/lib/surveys'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { slug: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.slug) {
    return NextResponse.json({ error: 'Missing required field: slug' }, { status: 400 })
  }

  try {
    const survey = await duplicateSurvey(tenantSlug, id, body.slug, userId || undefined)

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    return NextResponse.json({ survey }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json({ error: 'Survey slug already exists' }, { status: 409 })
    }
    throw error
  }
}
