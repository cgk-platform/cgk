'use client'

import { Button, cn } from '@cgk/ui'
import { Download, Loader2, Play, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface VideoPreviewProps {
  blob: Blob
  onUpload: () => Promise<void>
  onDiscard: () => void
  className?: string
}

/**
 * Video preview before upload
 *
 * Features:
 * - Playback preview of recorded video
 * - File size and duration display
 * - Upload confirmation
 * - Download option
 */
export function VideoPreview({
  blob,
  onUpload,
  onDiscard,
  className,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const videoUrl = URL.createObjectURL(blob)

  // Clean up URL on unmount
  useEffect(() => {
    return () => {
      URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleUpload = async () => {
    setIsUploading(true)
    try {
      await onUpload()
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = () => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recording-${Date.now()}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Video preview */}
      <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          className="h-full w-full object-contain"
        />

        {/* Play button overlay */}
        {!isPlaying && (
          <button
            onClick={handlePlayPause}
            className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/40"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg">
              <Play className="h-8 w-8 text-black ml-1" />
            </div>
          </button>
        )}

        {/* Click to pause */}
        {isPlaying && (
          <button
            onClick={handlePlayPause}
            className="absolute inset-0"
          />
        )}
      </div>

      {/* Timeline */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-muted-foreground">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-amber-500"
        />
        <span className="font-mono text-sm text-muted-foreground">
          {formatTime(duration)}
        </span>
      </div>

      {/* Video info */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Duration: </span>
            <span className="font-medium">{formatTime(duration)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Size: </span>
            <span className="font-medium">{formatFileSize(blob.size)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Format: </span>
            <span className="font-medium">WebM</span>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button
          variant="ghost"
          onClick={onDiscard}
          disabled={isUploading}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Discard
        </Button>

        <Button
          size="lg"
          onClick={handleUpload}
          disabled={isUploading}
          className="bg-green-600 hover:bg-green-500"
        >
          {isUploading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Upload className="mr-2 h-5 w-5" />
          )}
          {isUploading ? 'Uploading...' : 'Upload Video'}
        </Button>
      </div>
    </div>
  )
}
