import { headers } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

import {
  createProject,
  getContractorById,
  getContractorProjects,
} from '@/lib/contractors/db'
import type { CreateProjectRequest } from '@/lib/contractors/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/contractors/[id]/projects
 * List contractor's projects
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  // Verify contractor exists
  const contractor = await getContractorById(tenantSlug, id)
  if (!contractor) {
    return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
  }

  const projects = await getContractorProjects(tenantSlug, id)
  return NextResponse.json({ projects })
}

/**
 * POST /api/admin/contractors/[id]/projects
 * Assign a new project to contractor
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')
  const { id } = await params

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  // Verify contractor exists
  const contractor = await getContractorById(tenantSlug, id)
  if (!contractor) {
    return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
  }

  const body = (await req.json()) as Omit<CreateProjectRequest, 'contractorId'>

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Project title is required' }, { status: 400 })
  }

  // Validate due date if provided
  if (body.dueDate) {
    const dueDate = new Date(body.dueDate)
    if (dueDate < new Date()) {
      return NextResponse.json(
        { error: 'Due date must be in the future' },
        { status: 400 },
      )
    }
  }

  const project = await createProject(tenantSlug, tenantId, {
    contractorId: id,
    title: body.title,
    description: body.description,
    dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    rateCents: body.rateCents,
    deliverables: body.deliverables,
  })

  return NextResponse.json(project, { status: 201 })
}
