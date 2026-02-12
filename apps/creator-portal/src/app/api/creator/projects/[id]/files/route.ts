/**
 * Project Files API Route
 *
 * GET /api/creator/projects/[id]/files - List project files
 * POST /api/creator/projects/[id]/files - Upload a file
 */

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'
import { getProjectFiles } from '@/lib/projects'
import { uploadProjectFileFromBuffer, removeProjectFile, MAX_FILE_SIZE, ALL_ALLOWED_TYPES } from '@/lib/files/upload'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * List files for a project
 */
export async function GET(req: Request, { params }: RouteParams): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  try {
    const { id: projectId } = await params

    // Get active brand membership
    const activeMembership = context.memberships.find((m) => m.status === 'active')
    if (!activeMembership) {
      return Response.json({ error: 'No active brand membership' }, { status: 403 })
    }

    const tenantSlug = activeMembership.brandSlug

    const files = await getProjectFiles(tenantSlug, projectId, context.creatorId)

    return Response.json({ files })
  } catch (error) {
    console.error('Error fetching project files:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch files'
    return Response.json({ error: message }, { status: 400 })
  }
}

/**
 * Upload a file to a project
 */
export async function POST(req: Request, { params }: RouteParams): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  try {
    const { id: projectId } = await params

    // Get active brand membership
    const activeMembership = context.memberships.find((m) => m.status === 'active')
    if (!activeMembership) {
      return Response.json({ error: 'No active brand membership' }, { status: 403 })
    }

    const tenantSlug = activeMembership.brandSlug

    // Parse form data
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const notes = formData.get('notes') as string | null
    const isDeliverable = formData.get('isDeliverable') !== 'false'

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return Response.json({
        error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      }, { status: 400 })
    }

    // Validate file type
    if (!ALL_ALLOWED_TYPES.includes(file.type)) {
      return Response.json({
        error: `File type ${file.type} is not allowed`,
      }, { status: 400 })
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload file
    const uploadResult = await uploadProjectFileFromBuffer(
      tenantSlug,
      projectId,
      context.creatorId,
      buffer,
      file.name,
      file.type,
      {
        isDeliverable,
        notes: notes || undefined,
      }
    )

    return Response.json({
      file: uploadResult,
      message: 'File uploaded successfully',
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    const message = error instanceof Error ? error.message : 'Failed to upload file'
    return Response.json({ error: message }, { status: 400 })
  }
}

/**
 * Delete a file from a project
 */
export async function DELETE(req: Request, { params }: RouteParams): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  try {
    // We verify project ownership via the file's project relation
    await params // Consume params but don't use projectId

    // Get file ID from query
    const url = new URL(req.url)
    const fileId = url.searchParams.get('fileId')
    const fileUrl = url.searchParams.get('fileUrl')

    if (!fileId || !fileUrl) {
      return Response.json({ error: 'fileId and fileUrl are required' }, { status: 400 })
    }

    // Get active brand membership
    const activeMembership = context.memberships.find((m) => m.status === 'active')
    if (!activeMembership) {
      return Response.json({ error: 'No active brand membership' }, { status: 403 })
    }

    const tenantSlug = activeMembership.brandSlug

    await removeProjectFile(tenantSlug, fileId, fileUrl, context.creatorId)

    return Response.json({ message: 'File deleted successfully' })
  } catch (error) {
    console.error('Error deleting file:', error)
    const message = error instanceof Error ? error.message : 'Failed to delete file'
    return Response.json({ error: message }, { status: 400 })
  }
}
