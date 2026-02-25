'use client'

import { Button } from '@cgk-platform/ui'
import { Download, X } from 'lucide-react'
import { useEffect } from 'react'

interface MediaFile {
  name: string
  type: 'image' | 'video'
  size: number
  mtime: string
}

interface MediaLightboxProps {
  file: MediaFile
  profile: string
  onClose: () => void
}

export function MediaLightbox({ file, profile, onClose }: MediaLightboxProps) {
  const url = `/api/openclaw/${profile}/media/${encodeURIComponent(file.name)}`

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Controls */}
        <div className="absolute -top-10 right-0 flex items-center gap-2">
          <a href={url} download={file.name}>
            <Button variant="ghost" size="sm" className="text-white hover:text-white/80">
              <Download className="mr-1 h-4 w-4" />
              Download
            </Button>
          </a>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:text-white/80"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        {file.type === 'image' ? (
          <img
            src={url}
            alt={file.name}
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
          />
        ) : (
          <video
            src={url}
            controls
            autoPlay
            className="max-h-[85vh] max-w-[90vw] rounded-lg"
          />
        )}

        {/* Filename */}
        <p className="mt-2 text-center text-sm text-white/70">{file.name}</p>
      </div>
    </div>
  )
}
