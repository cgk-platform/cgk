'use server'

/**
 * Server actions for video management
 */

import {
  createVideo,
  updateVideo,
  deleteVideo,
  createFolder,
  updateFolder,
  deleteFolder,
  createDirectUpload,
  type CreateVideoInput,
  type UpdateVideoInput,
  type CreateFolderInput,
} from '@cgk/video'
import { headers } from 'next/headers'

/**
 * Get tenant slug from request headers
 */
async function getTenantSlug(): Promise<string> {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) {
    throw new Error('Tenant not found')
  }
  return tenantSlug
}

/**
 * Get user ID from request headers
 */
async function getUserId(): Promise<string> {
  const headerList = await headers()
  const userId = headerList.get('x-user-id')
  if (!userId) {
    throw new Error('User not authenticated')
  }
  return userId
}

/**
 * Create a new video and get upload URL
 */
export async function createVideoAction(input: CreateVideoInput): Promise<{
  videoId: string
  uploadUrl: string
  uploadId: string
}> {
  const tenantSlug = await getTenantSlug()
  const userId = await getUserId()

  // Create direct upload first
  const { uploadUrl, uploadId } = await createDirectUpload({
    corsOrigin: '*',
  })

  // Create video record
  const video = await createVideo(tenantSlug, userId, input, uploadId)

  return {
    videoId: video.id,
    uploadUrl,
    uploadId,
  }
}

/**
 * Update video metadata
 */
export async function updateVideoAction(
  videoId: string,
  input: UpdateVideoInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantSlug = await getTenantSlug()
    await updateVideo(tenantSlug, videoId, input)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update video',
    }
  }
}

/**
 * Delete a video
 */
export async function deleteVideoAction(
  videoId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantSlug = await getTenantSlug()
    await deleteVideo(tenantSlug, videoId)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete video',
    }
  }
}

/**
 * Create a new folder
 */
export async function createFolderAction(
  input: CreateFolderInput,
): Promise<{ success: boolean; folderId?: string; error?: string }> {
  try {
    const tenantSlug = await getTenantSlug()
    const userId = await getUserId()
    const folder = await createFolder(tenantSlug, userId, input)
    return { success: true, folderId: folder.id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create folder',
    }
  }
}

/**
 * Rename a folder
 */
export async function renameFolderAction(
  folderId: string,
  name: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantSlug = await getTenantSlug()
    await updateFolder(tenantSlug, folderId, { name })
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rename folder',
    }
  }
}

/**
 * Delete a folder
 */
export async function deleteFolderAction(
  folderId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantSlug = await getTenantSlug()
    await deleteFolder(tenantSlug, folderId)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete folder',
    }
  }
}

/**
 * Move video to folder
 */
export async function moveVideoToFolderAction(
  videoId: string,
  folderId: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantSlug = await getTenantSlug()
    await updateVideo(tenantSlug, videoId, { folderId })
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to move video',
    }
  }
}
