/**
 * Contractor Project Submit Work API
 *
 * POST /api/contractor/projects/[id]/submit - Submit work for a project
 */

import { submitProjectWork } from '@/lib/projects'
import {
  requireContractorAuth,
  unauthorizedResponse,
} from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface SubmitWorkBody {
  files?: { url: string; name: string; type: string; size: number }[]
  links?: string[]
  notes?: string
}

export async function POST(req: Request, { params }: RouteParams) {
  let auth
  try {
    auth = await requireContractorAuth(req)
  } catch {
    return unauthorizedResponse()
  }

  try {
    const { id } = await params
    const body = (await req.json()) as SubmitWorkBody

    // Validate that at least something is being submitted
    const hasFiles = body.files && body.files.length > 0
    const hasLinks = body.links && body.links.length > 0
    const hasNotes = body.notes && body.notes.trim().length > 0

    if (!hasFiles && !hasLinks && !hasNotes) {
      return Response.json(
        { error: 'Please provide at least one file, link, or notes' },
        { status: 400 }
      )
    }

    // Validate links are valid URLs
    if (body.links) {
      for (const link of body.links) {
        try {
          new URL(link)
        } catch {
          return Response.json(
            { error: `Invalid URL: ${link}` },
            { status: 400 }
          )
        }
      }
    }

    const project = await submitProjectWork(
      id,
      auth.contractorId,
      {
        files: body.files,
        links: body.links,
        notes: body.notes,
      },
      auth.tenantSlug
    )

    return Response.json({
      success: true,
      project: {
        id: project.id,
        title: project.title,
        status: project.status,
        submittedAt: project.submittedAt?.toISOString() || null,
        submittedWork: project.submittedWork
          ? {
              files: project.submittedWork.files,
              links: project.submittedWork.links,
              notes: project.submittedWork.notes,
              submittedAt: project.submittedWork.submittedAt.toISOString(),
            }
          : null,
      },
    })
  } catch (error) {
    console.error('Error submitting work:', error)
    const message = error instanceof Error ? error.message : 'Failed to submit work'
    return Response.json(
      { error: message },
      { status: 400 }
    )
  }
}
