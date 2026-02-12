/**
 * Google Drive API Client
 * Handles Drive API operations
 */

import { google, type drive_v3 } from 'googleapis'

import { createOAuth2Client, type OAuthConfig, isTokenExpired, refreshAccessToken } from './oauth.js'
import { decryptToken, encryptToken } from './tokens.js'
import type { GDriveConnection } from '../types.js'

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  size: number
  modifiedTime: string
  parents: string[]
  webContentLink?: string
  thumbnailLink?: string
  fullPath?: string
}

export interface DriveChange {
  type: 'change' | 'remove'
  fileId: string
  file?: DriveFile
  removed: boolean
}

export interface DriveListResult {
  files: DriveFile[]
  nextPageToken?: string
}

export interface DriveChangesResult {
  changes: DriveChange[]
  newStartPageToken: string
}

/**
 * Create an authenticated Drive client
 */
export async function createDriveClient(
  oauthConfig: OAuthConfig,
  connection: GDriveConnection,
  onTokenRefresh?: (newAccessToken: string, expiryDate: number) => Promise<void>
): Promise<drive_v3.Drive> {
  const accessToken = decryptToken(connection.access_token_encrypted)
  const refreshToken = decryptToken(connection.refresh_token_encrypted)
  const expiryDate = connection.token_expires_at
    ? new Date(connection.token_expires_at).getTime()
    : 0

  const oauth2Client = createOAuth2Client(oauthConfig)

  // Check if token needs refresh
  if (isTokenExpired(expiryDate)) {
    const { access_token, expiry_date } = await refreshAccessToken(oauthConfig, refreshToken)

    oauth2Client.setCredentials({
      access_token,
      refresh_token: refreshToken,
      expiry_date,
    })

    // Notify caller about the new token
    if (onTokenRefresh) {
      await onTokenRefresh(encryptToken(access_token), expiry_date)
    }
  } else {
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: expiryDate,
    })
  }

  return google.drive({ version: 'v3', auth: oauth2Client })
}

/**
 * List files in a folder
 */
export async function listFiles(
  drive: drive_v3.Drive,
  folderId: string,
  pageToken?: string,
  pageSize: number = 100
): Promise<DriveListResult> {
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, parents, webContentLink, thumbnailLink)',
    pageSize,
    pageToken,
    orderBy: 'modifiedTime desc',
  })

  const files: DriveFile[] = (response.data.files || []).map((f) => ({
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType!,
    size: parseInt(f.size || '0', 10),
    modifiedTime: f.modifiedTime!,
    parents: f.parents || [],
    webContentLink: f.webContentLink || undefined,
    thumbnailLink: f.thumbnailLink || undefined,
  }))

  return {
    files,
    nextPageToken: response.data.nextPageToken || undefined,
  }
}

/**
 * List files recursively in a folder and subfolders
 */
export async function listFilesRecursively(
  drive: drive_v3.Drive,
  folderId: string,
  currentPath: string = ''
): Promise<DriveFile[]> {
  const allFiles: DriveFile[] = []
  let pageToken: string | undefined

  do {
    const result = await listFiles(drive, folderId, pageToken)

    for (const file of result.files) {
      const filePath = currentPath ? `${currentPath}/${file.name}` : file.name

      if (file.mimeType === 'application/vnd.google-apps.folder') {
        // Recursively list subfolder contents
        const subFiles = await listFilesRecursively(drive, file.id, filePath)
        allFiles.push(...subFiles)
      } else {
        allFiles.push({
          ...file,
          fullPath: filePath,
        })
      }
    }

    pageToken = result.nextPageToken
  } while (pageToken)

  return allFiles
}

/**
 * Get file metadata
 */
export async function getFile(
  drive: drive_v3.Drive,
  fileId: string
): Promise<DriveFile | null> {
  try {
    const response = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, modifiedTime, parents, webContentLink, thumbnailLink',
    })

    const f = response.data
    return {
      id: f.id!,
      name: f.name!,
      mimeType: f.mimeType!,
      size: parseInt(f.size || '0', 10),
      modifiedTime: f.modifiedTime!,
      parents: f.parents || [],
      webContentLink: f.webContentLink || undefined,
      thumbnailLink: f.thumbnailLink || undefined,
    }
  } catch (error) {
    console.error('Failed to get file:', error)
    return null
  }
}

/**
 * Download file content
 */
export async function downloadFile(
  drive: drive_v3.Drive,
  fileId: string
): Promise<Buffer> {
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  )

  return Buffer.from(response.data as ArrayBuffer)
}

/**
 * Get the start page token for change tracking
 */
export async function getStartPageToken(
  drive: drive_v3.Drive
): Promise<string> {
  const response = await drive.changes.getStartPageToken({})
  return response.data.startPageToken!
}

/**
 * List changes since a page token
 */
export async function listChanges(
  drive: drive_v3.Drive,
  pageToken: string,
  folderId?: string
): Promise<DriveChangesResult> {
  const response = await drive.changes.list({
    pageToken,
    fields: 'newStartPageToken, nextPageToken, changes(type, removed, fileId, file(id, name, mimeType, size, modifiedTime, parents))',
    spaces: 'drive',
    includeRemoved: true,
  })

  const changes: DriveChange[] = (response.data.changes || [])
    .filter((c) => {
      // If we have a folder filter, only include files in that folder
      if (folderId && c.file?.parents) {
        return c.file.parents.includes(folderId)
      }
      return true
    })
    .map((c) => ({
      type: c.type as 'change' | 'remove',
      fileId: c.fileId!,
      removed: c.removed || false,
      file: c.file
        ? {
            id: c.file.id!,
            name: c.file.name!,
            mimeType: c.file.mimeType!,
            size: parseInt(c.file.size || '0', 10),
            modifiedTime: c.file.modifiedTime!,
            parents: c.file.parents || [],
          }
        : undefined,
    }))

  return {
    changes,
    newStartPageToken: response.data.newStartPageToken || pageToken,
  }
}

/**
 * Create a watch channel for push notifications
 */
export async function createWatchChannel(
  drive: drive_v3.Drive,
  fileId: string,
  webhookUrl: string,
  channelId: string,
  expirationMs: number = 7 * 24 * 60 * 60 * 1000 // 7 days
): Promise<{
  channelId: string
  resourceId: string
  expiration: number
}> {
  const response = await drive.files.watch({
    fileId,
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
      expiration: String(Date.now() + expirationMs),
    },
  })

  return {
    channelId: response.data.id!,
    resourceId: response.data.resourceId!,
    expiration: parseInt(response.data.expiration!, 10),
  }
}

/**
 * Stop a watch channel
 */
export async function stopWatchChannel(
  drive: drive_v3.Drive,
  channelId: string,
  resourceId: string
): Promise<void> {
  await drive.channels.stop({
    requestBody: {
      id: channelId,
      resourceId,
    },
  })
}

/**
 * Get folder info
 */
export async function getFolder(
  drive: drive_v3.Drive,
  folderId: string
): Promise<{ id: string; name: string } | null> {
  try {
    const response = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType',
    })

    if (response.data.mimeType !== 'application/vnd.google-apps.folder') {
      return null
    }

    return {
      id: response.data.id!,
      name: response.data.name!,
    }
  } catch {
    return null
  }
}

/**
 * Check if file type is supported for import
 */
export function isSupportedDriveFile(mimeType: string): boolean {
  const supportedTypes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/tiff',
    'image/svg+xml',
    // Videos
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-msvideo',
    // Audio
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
    'audio/ogg',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ]

  return supportedTypes.includes(mimeType)
}
