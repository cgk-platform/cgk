'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

import { AssetUploader } from '@/components/admin/dam'

export default function UploadPage() {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 })

  const handleUpload = useCallback(async (files: File[]) => {
    setIsUploading(true)
    let success = 0
    let failed = 0

    for (const file of files) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', file.name.replace(/\.[^/.]+$/, ''))

        const response = await fetch('/api/admin/dam/assets', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          success++
        } else {
          failed++
        }
      } catch {
        failed++
      }
    }

    setUploadResults({ success, failed })
    setIsUploading(false)

    // Navigate back to library after successful upload
    if (success > 0) {
      setTimeout(() => {
        router.push('/admin/dam')
      }, 1500)
    }
  }, [router])

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/dam"
            className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Link>
          <h1 className="text-2xl font-bold text-slate-100">Upload Assets</h1>
          <p className="mt-1 text-slate-500">
            Upload images, videos, audio files, and documents to your asset library.
          </p>
        </div>

        {/* Upload results */}
        {(uploadResults.success > 0 || uploadResults.failed > 0) && (
          <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900 p-4">
            <div className="flex items-center gap-4">
              {uploadResults.success > 0 && (
                <div className="flex items-center gap-2 text-teal-400">
                  <span className="text-2xl font-bold">{uploadResults.success}</span>
                  <span className="text-sm">uploaded successfully</span>
                </div>
              )}
              {uploadResults.failed > 0 && (
                <div className="flex items-center gap-2 text-red-400">
                  <span className="text-2xl font-bold">{uploadResults.failed}</span>
                  <span className="text-sm">failed</span>
                </div>
              )}
            </div>
            {uploadResults.success > 0 && (
              <p className="mt-2 text-sm text-slate-500">
                Redirecting to library...
              </p>
            )}
          </div>
        )}

        {/* Uploader */}
        <AssetUploader
          onUpload={handleUpload}
          maxFiles={50}
          maxSize={500 * 1024 * 1024}
          disabled={isUploading}
        />

        {/* Tips */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="font-medium text-slate-200">Upload Tips</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li>Supported formats: PNG, JPG, WEBP, GIF, MP4, MOV, MP3, WAV, PDF, and more</li>
            <li>Maximum file size: 500 MB per file</li>
            <li>You can upload up to 50 files at once</li>
            <li>Files will be automatically organized by type</li>
            <li>Thumbnails are generated automatically for images and videos</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
