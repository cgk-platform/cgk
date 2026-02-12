'use client'

import { Button, Progress, cn } from '@cgk/ui'
import {
  AlertCircle,
  CheckCircle,
  Cloud,
  FileVideo,
  Loader2,
  Upload,
  X,
} from 'lucide-react'
import { useCallback, useState } from 'react'

import { createVideoAction } from '@/lib/video/actions'

import type { UploadState } from '@/lib/video/types'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadComplete?: (videoId: string) => void
  folderId?: string
}

export function UploadModal({
  isOpen,
  onClose,
  onUploadComplete,
  folderId,
}: UploadModalProps) {
  const [uploads, setUploads] = useState<UploadState[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFiles = useCallback(async (files: File[]) => {
    setError(null)

    // Create initial upload states
    const newUploads: UploadState[] = files.map((file) => ({
      file,
      progress: 0,
      status: 'pending' as const,
    }))

    setUploads((prev) => [...prev, ...newUploads])

    // Process uploads
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file) continue

      const uploadIndex = uploads.length + i

      try {
        // Update to uploading status
        setUploads((prev) =>
          prev.map((u, idx) =>
            idx === uploadIndex ? { ...u, status: 'uploading' as const } : u,
          ),
        )

        // Create video and get upload URL
        const { videoId, uploadUrl } = await createVideoAction({
          title: file.name.replace(/\.[^/.]+$/, ''),
          recordingType: 'upload',
          folderId,
        })

        // Upload directly to Mux
        await uploadToMux(uploadUrl, file, (progress: number) => {
          setUploads((prev) =>
            prev.map((u, idx) =>
              idx === uploadIndex ? { ...u, progress } : u,
            ),
          )
        })

        // Update to processing status
        setUploads((prev) =>
          prev.map((u, idx) =>
            idx === uploadIndex
              ? { ...u, status: 'processing' as const, progress: 100, videoId }
              : u,
          ),
        )

        // Notify parent
        onUploadComplete?.(videoId)

        // Update to complete after a moment
        setTimeout(() => {
          setUploads((prev) =>
            prev.map((u, idx) =>
              idx === uploadIndex ? { ...u, status: 'complete' as const } : u,
            ),
          )
        }, 2000)
      } catch (err) {
        setUploads((prev) =>
          prev.map((u, idx) =>
            idx === uploadIndex
              ? {
                  ...u,
                  status: 'error' as const,
                  error: err instanceof Error ? err.message : 'Upload failed',
                }
              : u,
          ),
        )
      }
    }
  }, [folderId, onUploadComplete, uploads.length])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith('video/'),
    )

    if (files.length === 0) {
      setError('Please drop video files only')
      return
    }

    handleFiles(files)
  }, [handleFiles])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length > 0) {
        handleFiles(files)
      }
    },
    [handleFiles],
  )

  const uploadToMux = async (
    uploadUrl: string,
    file: File,
    onProgress: (progress: number) => void,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          onProgress(progress)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'))
      })

      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.send(file)
    })
  }

  const removeUpload = (index: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== index))
  }

  const handleClose = () => {
    const activeUploads = uploads.filter(
      (u) => u.status === 'uploading' || u.status === 'pending',
    )
    if (activeUploads.length > 0) {
      if (
        !confirm('You have uploads in progress. Are you sure you want to close?')
      ) {
        return
      }
    }
    setUploads([])
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Upload Videos</h2>
              <p className="text-sm text-zinc-400">
                Drag and drop or click to select
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Drop Zone */}
          <label
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all',
              isDragging
                ? 'border-primary bg-primary/10'
                : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800',
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="video/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            <div
              className={cn(
                'mb-4 flex h-16 w-16 items-center justify-center rounded-full transition-colors',
                isDragging ? 'bg-primary/20' : 'bg-zinc-700',
              )}
            >
              <Cloud
                className={cn(
                  'h-8 w-8 transition-colors',
                  isDragging ? 'text-primary' : 'text-zinc-400',
                )}
              />
            </div>

            <p className="mb-2 text-center text-sm font-medium text-white">
              {isDragging ? 'Drop videos here' : 'Drop videos here or click to browse'}
            </p>
            <p className="text-center text-xs text-zinc-500">
              Supports MP4, MOV, WebM, and other video formats
            </p>
          </label>

          {/* Error Message */}
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Upload List */}
          {uploads.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-medium text-zinc-300">
                Uploads ({uploads.length})
              </h3>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {uploads.map((upload, index) => (
                  <UploadItem
                    key={`${upload.file.name}-${index}`}
                    upload={upload}
                    onRemove={() => removeUpload(index)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-800 px-6 py-4">
          <Button variant="ghost" onClick={handleClose}>
            {uploads.length > 0 ? 'Close' : 'Cancel'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function UploadItem({
  upload,
  onRemove,
}: {
  upload: UploadState
  onRemove: () => void
}) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  return (
    <div className="flex items-center gap-4 rounded-lg bg-zinc-800 p-3">
      {/* Icon */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-700">
        <FileVideo className="h-5 w-5 text-zinc-300" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-white">
          {upload.file.name}
        </p>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>{formatFileSize(upload.file.size)}</span>
          {upload.status === 'uploading' && (
            <span className="text-primary">{upload.progress}%</span>
          )}
          {upload.status === 'processing' && (
            <span className="text-amber-400">Processing...</span>
          )}
          {upload.status === 'complete' && (
            <span className="text-emerald-400">Complete</span>
          )}
          {upload.status === 'error' && (
            <span className="text-red-400">{upload.error}</span>
          )}
        </div>

        {/* Progress Bar */}
        {(upload.status === 'uploading' || upload.status === 'processing') && (
          <Progress
            value={upload.progress}
            className="mt-2 h-1"
          />
        )}
      </div>

      {/* Status Icon / Remove */}
      <div className="flex-shrink-0">
        {upload.status === 'uploading' && (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        )}
        {upload.status === 'processing' && (
          <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
        )}
        {upload.status === 'complete' && (
          <CheckCircle className="h-5 w-5 text-emerald-400" />
        )}
        {upload.status === 'error' && (
          <button
            onClick={onRemove}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {upload.status === 'pending' && (
          <button
            onClick={onRemove}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
