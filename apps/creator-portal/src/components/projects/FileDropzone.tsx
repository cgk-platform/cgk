'use client'

import { useCallback, useState } from 'react'

import { ALL_ALLOWED_TYPES, MAX_FILE_SIZE, formatFileSize, getFileCategory } from '@/lib/files/upload'

interface FileDropzoneProps {
  onUpload: (file: File) => Promise<void>
  disabled?: boolean
}

export function FileDropzone({
  onUpload,
  disabled = false,
}: FileDropzoneProps): React.JSX.Element {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setError(null)

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    // Process first file (or could handle multiple)
    const firstFile = files[0]
    if (firstFile) {
      await processFile(firstFile)
    }
  }, [disabled])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const files = e.target.files
    if (!files || files.length === 0) return

    const firstFile = files[0]
    if (firstFile) {
      await processFile(firstFile)
    }

    // Reset input
    e.target.value = ''
  }, [])

  const processFile = async (file: File) => {
    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds maximum of ${formatFileSize(MAX_FILE_SIZE)}`)
      return
    }

    // Validate type
    if (!ALL_ALLOWED_TYPES.includes(file.type)) {
      setError(`File type "${file.type}" is not allowed`)
      return
    }

    setIsUploading(true)
    try {
      await onUpload(file)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative rounded-lg border-2 border-dashed p-8 text-center transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-primary/50'}
        `}
      >
        <input
          type="file"
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          accept={ALL_ALLOWED_TYPES.join(',')}
          className="absolute inset-0 cursor-pointer opacity-0"
        />

        <div className="flex flex-col items-center gap-3">
          {isUploading ? (
            <>
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm font-medium">Uploading...</p>
            </>
          ) : (
            <>
              <div className="rounded-full bg-primary/10 p-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" x2="12" y1="3" y2="15" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">
                  {isDragging ? 'Drop your file here' : 'Drag and drop or click to upload'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Videos, images, documents up to {formatFileSize(MAX_FILE_SIZE)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          {error}
        </div>
      )}
    </div>
  )
}

interface FileListItemProps {
  file: {
    id: string
    name: string
    originalName: string
    url: string
    sizeBytes: number
    contentType: string
    version: number
    uploadedAt: Date
  }
  onDelete?: (fileId: string, fileUrl: string) => Promise<void>
  canDelete?: boolean
}

export function FileListItem({
  file,
  onDelete,
  canDelete = false,
}: FileListItemProps): React.JSX.Element {
  const [isDeleting, setIsDeleting] = useState(false)
  const category = getFileCategory(file.contentType)

  const handleDelete = async () => {
    if (!onDelete || isDeleting) return
    setIsDeleting(true)
    try {
      await onDelete(file.id, file.url)
    } finally {
      setIsDeleting(false)
    }
  }

  const iconByCategory: Record<string, React.ReactNode> = {
    video: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m22 8-6 4 6 4V8Z" />
        <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
      </svg>
    ),
    image: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    ),
    document: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" x2="8" y1="13" y2="13" />
        <line x1="16" x2="8" y1="17" y2="17" />
        <line x1="10" x2="8" y1="9" y2="9" />
      </svg>
    ),
    audio: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
    archive: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
        <path d="m8.5 8.5 7 7" />
      </svg>
    ),
    unknown: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {iconByCategory[category] || iconByCategory.unknown}
      </div>

      <div className="min-w-0 flex-1">
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate font-medium hover:text-primary hover:underline"
        >
          {file.originalName}
        </a>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(file.sizeBytes)}</span>
          {file.version > 1 && <span>v{file.version}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Download"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
          </svg>
        </a>

        {canDelete && onDelete && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            title="Delete"
          >
            {isDeleting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
