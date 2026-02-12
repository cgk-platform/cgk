/**
 * Video types for admin UI
 */

import type { Video, VideoFolder } from '@cgk/video'

/**
 * Video row with computed fields for display
 */
export interface VideoRow extends Video {
  viewCount?: number
  folderName?: string
}

/**
 * Video filter options
 */
export interface VideoFilters {
  page: number
  limit: number
  offset: number
  search: string
  status: string
  folderId: string | null
  sort: 'created_at' | 'title' | 'duration_seconds'
  dir: 'asc' | 'desc'
}

/**
 * Upload state for tracking uploads
 */
export interface UploadState {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error'
  error?: string
  videoId?: string
}

/**
 * View mode for video library
 */
export type ViewMode = 'grid' | 'list'

/**
 * Folder tree node for sidebar
 */
export interface FolderNode extends VideoFolder {
  children: FolderNode[]
  videoCount: number
}

/**
 * Build folder tree from flat list
 */
export function buildFolderTree(folders: VideoFolder[]): FolderNode[] {
  const nodeMap = new Map<string, FolderNode>()
  const roots: FolderNode[] = []

  // Create nodes
  for (const folder of folders) {
    nodeMap.set(folder.id, {
      ...folder,
      children: [],
      videoCount: 0,
    })
  }

  // Build tree
  for (const folder of folders) {
    const node = nodeMap.get(folder.id)
    if (!node) continue

    if (folder.parentId) {
      const parent = nodeMap.get(folder.parentId)
      if (parent) {
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    } else {
      roots.push(node)
    }
  }

  // Sort children alphabetically
  const sortNodes = (nodes: FolderNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name))
    for (const node of nodes) {
      sortNodes(node.children)
    }
  }
  sortNodes(roots)

  return roots
}

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === 0) return '0:00'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format file size in bytes to human-readable string
 */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let unitIndex = 0
  let size = bytes

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`
}
