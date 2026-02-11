export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getQuestion, updateQuestion, deleteQuestion } from '@/lib/surveys'
import type { UpdateQuestionInput } from '@/lib/surveys'

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

  const question = await getQuestion(tenantSlug, id)

  if (!question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  return NextResponse.json({ question })
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: UpdateQuestionInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const question = await updateQuestion(tenantSlug, id, body)

  if (!question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  return NextResponse.json({ question })
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const deleted = await deleteQuestion(tenantSlug, id)

  if (!deleted) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
