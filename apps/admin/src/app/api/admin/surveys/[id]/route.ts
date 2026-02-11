export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getSurvey, getSurveyWithQuestions, updateSurvey, deleteSurvey } from '@/lib/surveys'
import type { UpdateSurveyInput } from '@/lib/surveys'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const includeQuestions = url.searchParams.get('include') === 'questions'

  const survey = includeQuestions
    ? await getSurveyWithQuestions(tenantSlug, id)
    : await getSurvey(tenantSlug, id)

  if (!survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
  }

  return NextResponse.json({ survey })
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: UpdateSurveyInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const survey = await updateSurvey(tenantSlug, id, body)

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    return NextResponse.json({ survey })
  } catch (error) {
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json({ error: 'Survey slug already exists' }, { status: 409 })
    }
    throw error
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const deleted = await deleteSurvey(tenantSlug, id)

  if (!deleted) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
