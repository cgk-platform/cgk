'use client'

import { useState } from 'react'
import { Button, Label } from '@cgk-platform/ui'
import { Cloud, CheckCircle2, AlertCircle, Loader2, SkipForward } from 'lucide-react'

interface StepProps {
  onComplete: () => void
  onBack: () => void
  isFirst: boolean
  isLast: boolean
}

/**
 * Storage Configuration Step (Optional)
 *
 * Configures blob storage for file uploads and assets.
 * This step can be skipped - storage is optional.
 */
export function StorageStep({ onComplete, onBack }: StepProps) {
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'skipped'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [storageInfo, setStorageInfo] = useState<{
    provider?: string
    bucket?: string
  } | null>(null)

  const testConnection = async () => {
    setTesting(true)
    setError(null)

    try {
      const response = await fetch('/api/setup/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      })

      const data = await response.json()

      if (data.success) {
        setStatus('success')
        setStorageInfo(data.storageInfo)
      } else {
        setStatus('error')
        setError(data.error || 'Storage connection test failed')
      }
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to test storage')
    } finally {
      setTesting(false)
    }
  }

  const handleSkip = () => {
    setStatus('skipped')
    onComplete()
  }

  return (
    <div className="space-y-6">
      {/* Header with optional badge */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-zinc-900/50 border border-zinc-700 flex items-center justify-center">
          <Cloud className="w-6 h-6 text-zinc-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-white">File Storage</h2>
            <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider bg-zinc-800 text-zinc-400 rounded">
              Optional
            </span>
          </div>
          <p className="text-zinc-400 text-sm">
            Configure blob storage for file uploads and media assets
          </p>
        </div>
      </div>

      {/* Connection Status Panel */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-zinc-400 uppercase tracking-wider">Storage Status</span>
          <div className="flex items-center gap-2">
            {status === 'idle' && (
              <>
                <div className="w-2 h-2 rounded-full bg-zinc-500" />
                <span className="text-xs text-zinc-500">Not Configured</span>
              </>
            )}
            {status === 'success' && (
              <>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-400">Connected</span>
              </>
            )}
            {status === 'error' && (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs text-amber-400">Not Available</span>
              </>
            )}
            {status === 'skipped' && (
              <>
                <div className="w-2 h-2 rounded-full bg-zinc-500" />
                <span className="text-xs text-zinc-400">Skipped</span>
              </>
            )}
          </div>
        </div>

        {/* Storage Info */}
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-zinc-800">
            <Label className="text-zinc-500 text-xs uppercase tracking-wider">Provider</Label>
            <code className="font-mono text-xs text-zinc-400">
              {storageInfo?.provider || 'Vercel Blob / S3'}
            </code>
          </div>

          {storageInfo?.bucket && (
            <div className="flex items-center justify-between py-2">
              <Label className="text-zinc-500 text-xs uppercase tracking-wider">Bucket</Label>
              <code className="font-mono text-xs text-zinc-300">{storageInfo.bucket}</code>
            </div>
          )}
        </div>

        {/* Error Display (softer, since optional) */}
        {error && (
          <div className="mt-4 p-3 bg-amber-950/30 border border-amber-900/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-400 font-medium">Storage Not Available</p>
              <p className="text-xs text-amber-400/70 mt-1">{error}</p>
              <p className="text-xs text-zinc-500 mt-2">
                You can skip this step and configure storage later.
              </p>
            </div>
          </div>
        )}

        {/* Success Display */}
        {status === 'success' && (
          <div className="mt-4 p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-emerald-400 font-medium">Storage Connected</p>
              <p className="text-xs text-emerald-400/70 mt-1">
                Ready for file uploads and media storage
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="text-xs text-zinc-500 space-y-2">
        <p>
          <strong className="text-zinc-400">Using Vercel?</strong> Create a Vercel Blob store in
          your project settings. The token will be automatically added.
        </p>
        <p>
          <strong className="text-zinc-400">Using S3?</strong> Set{' '}
          <code className="text-cyan-400">AWS_ACCESS_KEY_ID</code>,{' '}
          <code className="text-cyan-400">AWS_SECRET_ACCESS_KEY</code>, and{' '}
          <code className="text-cyan-400">AWS_S3_BUCKET</code> environment variables.
        </p>
        <p className="text-zinc-600">
          <strong>Note:</strong> Storage is optional. The platform works without it, but file
          uploads will be disabled.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <Button variant="ghost" onClick={onBack} className="text-zinc-400">
          Back
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={testConnection}
            disabled={testing}
            className="border-zinc-700"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>

          <Button variant="ghost" onClick={handleSkip} className="text-zinc-400">
            <SkipForward className="w-4 h-4 mr-2" />
            Skip
          </Button>

          <Button
            onClick={onComplete}
            disabled={status !== 'success' && status !== 'skipped'}
            className="bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
