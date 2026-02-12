/**
 * PATCH /api/v1/videos/[id]/tasks
 *
 * Update task completion status
 *
 * Body:
 * - taskIndex: number
 * - completed: boolean
 *
 * @ai-pattern tenant-isolation
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { updateTaskCompletion, getVideoTranscription } from '@cgk/video'

interface TaskUpdateBody {
  taskIndex: number
  completed: boolean
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: videoId } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: TaskUpdateBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body.taskIndex !== 'number' || typeof body.completed !== 'boolean') {
    return NextResponse.json(
      { error: 'taskIndex (number) and completed (boolean) required' },
      { status: 400 }
    )
  }

  // Verify video exists and has tasks
  const video = await getVideoTranscription(tenantSlug, videoId)

  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  }

  if (!video.aiTasks || video.aiTasks.length === 0) {
    return NextResponse.json({ error: 'No tasks found' }, { status: 404 })
  }

  if (body.taskIndex < 0 || body.taskIndex >= video.aiTasks.length) {
    return NextResponse.json({ error: 'Invalid task index' }, { status: 400 })
  }

  // Update task completion
  await updateTaskCompletion(tenantSlug, videoId, body.taskIndex, body.completed)

  // Return updated task
  const updatedTask = {
    ...video.aiTasks[body.taskIndex],
    completed: body.completed,
  }

  return NextResponse.json({
    success: true,
    task: updatedTask,
  })
}
