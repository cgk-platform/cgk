export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getQuestions, createQuestion, reorderQuestions } from '@/lib/surveys'
import type { CreateQuestionInput } from '@/lib/surveys'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id: surveyId } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const questions = await getQuestions(tenantSlug, surveyId)
  return NextResponse.json({ questions })
}

export async function POST(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id: surveyId } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: CreateQuestionInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.question_text || !body.question_type) {
    return NextResponse.json(
      { error: 'Missing required fields: question_text, question_type' },
      { status: 400 },
    )
  }

  const question = await createQuestion(tenantSlug, surveyId, body)
  return NextResponse.json({ question }, { status: 201 })
}

export async function PUT(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id: surveyId } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { orderMap: Record<string, number> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.orderMap) {
    return NextResponse.json({ error: 'Missing required field: orderMap' }, { status: 400 })
  }

  await reorderQuestions(tenantSlug, surveyId, body.orderMap)
  return NextResponse.json({ success: true })
}
