'use client'

import { useState } from 'react'
import { Button, Label } from '@cgk-platform/ui'
import { HardDrive, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface StepProps {
  onComplete: () => void
  onBack: () => void
  isFirst: boolean
  isLast: boolean
}

/**
 * Cache/KV Configuration Step
 *
 * Verifies Redis/KV connection for session storage and caching.
 */
export function CacheStep({ onComplete, onBack }: StepProps) {
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [cacheInfo, setCacheInfo] = useState<{
    type?: string
    url?: string
  } | null>(null)

  const testConnection = async () => {
    setTesting(true)
    setError(null)

    try {
      const response = await fetch('/api/setup/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      })

      const data = await response.json()

      if (data.success) {
        setStatus('success')
        setCacheInfo(data.cacheInfo)
      } else {
        setStatus('error')
        setError(data.error || 'Cache connection test failed')
      }
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to test cache')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center">
          <HardDrive className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Cache & Sessions</h2>
          <p className="text-zinc-400 text-sm">
            Configure Redis or Vercel KV for session storage and caching
          </p>
        </div>
      </div>

      {/* Connection Status Panel */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-zinc-400 uppercase tracking-wider">Cache Status</span>
          <div className="flex items-center gap-2">
            {status === 'idle' && (
              <>
                <div className="w-2 h-2 rounded-full bg-zinc-500" />
                <span className="text-xs text-zinc-500">Not Tested</span>
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
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs text-red-400">Failed</span>
              </>
            )}
          </div>
        </div>

        {/* Environment Info */}
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-zinc-800">
            <Label className="text-zinc-500 text-xs uppercase tracking-wider">Provider</Label>
            <code className="font-mono text-xs text-cyan-400">
              {cacheInfo?.type || 'Vercel KV / Redis'}
            </code>
          </div>

          {cacheInfo?.url && (
            <div className="flex items-center justify-between py-2">
              <Label className="text-zinc-500 text-xs uppercase tracking-wider">Endpoint</Label>
              <code className="font-mono text-xs text-zinc-300 truncate max-w-[200px]">
                {cacheInfo.url}
              </code>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-950/30 border border-red-900/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-400 font-medium">Cache Error</p>
              <p className="text-xs text-red-400/70 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Success Display */}
        {status === 'success' && (
          <div className="mt-4 p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-emerald-400 font-medium">Cache Connected</p>
              <p className="text-xs text-emerald-400/70 mt-1">
                Ready for session storage and caching
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="text-xs text-zinc-500 space-y-2">
        <p>
          <strong className="text-zinc-400">Using Vercel?</strong> Create a Vercel KV database in
          your project settings. The connection details will be automatically added.
        </p>
        <p>
          <strong className="text-zinc-400">Using Upstash?</strong> Set{' '}
          <code className="text-cyan-400">KV_REST_API_URL</code> and{' '}
          <code className="text-cyan-400">KV_REST_API_TOKEN</code> environment variables.
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

          <Button
            onClick={onComplete}
            disabled={status !== 'success'}
            className="bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
