'use client'

import { Button, cn, Progress } from '@cgk/ui'
import {
  Upload,
  X,
  File,
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { useCallback, useState } from 'react'

import type { AssetType } from '@cgk/dam'

export interface UploadFile {
  id: string
  file: File
  name: string
  size: number
  type: string
  assetType: AssetType | null
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error'
  error?: string | null
  assetId?: string
}

export interface AssetUploaderProps {
  onUpload: (files: File[]) => Promise<void>
  onFileProgress?: (fileId: string, progress: number) => void
  onFileComplete?: (fileId: string, assetId: string) => void
  onFileError?: (fileId: string, error: string) => void
  maxFiles?: number
  maxSize?: number
  acceptedTypes?: string[]
  disabled?: boolean
}

const assetTypeIcons: Record<AssetType, React.ComponentType<{ className?: string }>> = {
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  document: FileText,
}

function getAssetTypeFromMime(mimeType: string): AssetType | null {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (
    mimeType.startsWith('application/pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('spreadsheet') ||
    mimeType.startsWith('text/')
  ) {
    return 'document'
  }
  return null
}

function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function AssetUploader({
  onUpload,
  maxFiles = 50,
  maxSize = 500 * 1024 * 1024, // 500MB
  acceptedTypes,
  disabled = false,
}: AssetUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxSize) {
      return `File too large. Maximum size is ${formatFileSize(maxSize)}`
    }

    const assetType = getAssetTypeFromMime(file.type)
    if (!assetType) {
      return 'Unsupported file type'
    }

    if (acceptedTypes && !acceptedTypes.some(t => file.type.match(t))) {
      return 'File type not accepted'
    }

    return null
  }, [maxSize, acceptedTypes])

  const addFiles = useCallback((newFiles: File[]) => {
    const filesToAdd = newFiles.slice(0, maxFiles - files.length)

    const uploadFiles: UploadFile[] = filesToAdd.map(file => {
      const error = validateFile(file)
      return {
        id: generateId(),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        assetType: getAssetTypeFromMime(file.type),
        progress: 0,
        status: error ? 'error' : 'pending',
        error,
      }
    })

    setFiles(prev => [...prev, ...uploadFiles])
  }, [files.length, maxFiles, validateFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) return

    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }, [disabled, addFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files))
    }
    e.target.value = ''
  }, [addFiles])

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }, [])

  const clearCompleted = useCallback(() => {
    setFiles(prev => prev.filter(f => f.status !== 'complete'))
  }, [])

  const handleUpload = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending')
    if (pendingFiles.length === 0) return

    setIsUploading(true)

    // Update status to uploading
    setFiles(prev => prev.map(f =>
      f.status === 'pending' ? { ...f, status: 'uploading' as const } : f
    ))

    try {
      // Simulate progress for each file
      for (const uploadFile of pendingFiles) {
        setFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, progress: 30 } : f
        ))
      }

      await onUpload(pendingFiles.map(f => f.file))

      // Mark all as complete
      setFiles(prev => prev.map(f =>
        f.status === 'uploading' ? { ...f, status: 'complete' as const, progress: 100 } : f
      ))
    } catch (error) {
      setFiles(prev => prev.map(f =>
        f.status === 'uploading'
          ? { ...f, status: 'error' as const, error: 'Upload failed' }
          : f
      ))
    } finally {
      setIsUploading(false)
    }
  }

  const pendingCount = files.filter(f => f.status === 'pending').length
  const completedCount = files.filter(f => f.status === 'complete').length

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'relative rounded-xl border-2 border-dashed transition-all duration-200',
          'flex flex-col items-center justify-center gap-4 p-8 text-center',
          isDragging
            ? 'border-amber-500 bg-amber-500/5'
            : 'border-slate-700 hover:border-slate-600',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <div className={cn(
          'rounded-full p-4 transition-colors',
          isDragging ? 'bg-amber-500/20' : 'bg-slate-800'
        )}>
          <Upload className={cn(
            'h-8 w-8',
            isDragging ? 'text-amber-500' : 'text-slate-400'
          )} />
        </div>

        <div>
          <p className="text-lg font-medium text-slate-200">
            {isDragging ? 'Drop files here' : 'Drag and drop files'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            or click to browse from your computer
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-teal-500/10 px-2 py-0.5 text-teal-500">
            Images
          </span>
          <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-violet-500">
            Videos
          </span>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-500">
            Audio
          </span>
          <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-slate-400">
            Documents
          </span>
        </div>

        <p className="text-xs text-slate-600">
          Maximum {maxFiles} files, up to {formatFileSize(maxSize)} each
        </p>

        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          disabled={disabled}
          className="absolute inset-0 cursor-pointer opacity-0"
          accept={acceptedTypes?.join(',')}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-300">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </h3>
            <div className="flex items-center gap-2">
              {completedCount > 0 && (
                <button
                  onClick={clearCompleted}
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  Clear completed
                </button>
              )}
              {pendingCount > 0 && (
                <Button
                  size="sm"
                  onClick={handleUpload}
                  disabled={isUploading || pendingCount === 0}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload {pendingCount} file{pendingCount !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto">
            {files.map(file => {
              const Icon = file.assetType ? assetTypeIcons[file.assetType] : File

              return (
                <div
                  key={file.id}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3',
                    file.status === 'error'
                      ? 'border-red-500/30 bg-red-500/5'
                      : file.status === 'complete'
                      ? 'border-teal-500/30 bg-teal-500/5'
                      : 'border-slate-700 bg-slate-800/50'
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    file.status === 'error'
                      ? 'bg-red-500/20 text-red-400'
                      : file.status === 'complete'
                      ? 'bg-teal-500/20 text-teal-400'
                      : file.assetType === 'image'
                      ? 'bg-teal-500/10 text-teal-500'
                      : file.assetType === 'video'
                      ? 'bg-violet-500/10 text-violet-500'
                      : file.assetType === 'audio'
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'bg-slate-700 text-slate-400'
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* File info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-200">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatFileSize(file.size)}
                      {file.assetType && (
                        <span className="ml-2 uppercase">{file.assetType}</span>
                      )}
                    </p>

                    {/* Progress bar */}
                    {file.status === 'uploading' && (
                      <Progress value={file.progress} className="mt-2 h-1" />
                    )}

                    {/* Error message */}
                    {file.error && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
                        <AlertCircle className="h-3 w-3" />
                        {file.error}
                      </p>
                    )}
                  </div>

                  {/* Status icon */}
                  {file.status === 'complete' && (
                    <CheckCircle2 className="h-5 w-5 text-teal-500" />
                  )}
                  {file.status === 'uploading' && (
                    <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}

                  {/* Remove button */}
                  {file.status !== 'uploading' && (
                    <button
                      onClick={() => removeFile(file.id)}
                      className="rounded-md p-1 text-slate-500 hover:bg-slate-700 hover:text-slate-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
