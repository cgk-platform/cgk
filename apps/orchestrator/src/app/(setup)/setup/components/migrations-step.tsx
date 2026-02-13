'use client'

import { Button } from '@cgk-platform/ui'
import { GitBranch, CheckCircle2, AlertCircle, Loader2, Play } from 'lucide-react'
import { useState, useEffect } from 'react'

interface StepProps {
  onComplete: () => void
  onBack: () => void
  isFirst: boolean
  isLast: boolean
}

interface MigrationProgress {
  phase: 'idle' | 'public' | 'tenant' | 'complete' | 'error'
  publicTotal: number
  publicCompleted: number
  tenantTotal: number
  tenantCompleted: number
  currentMigration?: string
  error?: string
}

/**
 * Migrations Step
 *
 * Runs database migrations for public and tenant template schemas.
 * Shows real-time progress as migrations execute.
 */
export function MigrationsStep({ onComplete, onBack }: StepProps) {
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<MigrationProgress>({
    phase: 'idle',
    publicTotal: 0,
    publicCompleted: 0,
    tenantTotal: 0,
    tenantCompleted: 0,
  })

  // Check if migrations are already done
  useEffect(() => {
    checkMigrationStatus()
  }, [])

  const checkMigrationStatus = async () => {
    try {
      const response = await fetch('/api/setup/migrate?action=status')
      const data = await response.json()

      if (data.alreadyComplete) {
        setProgress({
          phase: 'complete',
          publicTotal: data.publicCount || 28,
          publicCompleted: data.publicCount || 28,
          tenantTotal: data.tenantCount || 90,
          tenantCompleted: data.tenantCount || 90,
        })
      }
    } catch {
      // Migrations not run yet
    }
  }

  const runMigrations = async () => {
    setRunning(true)
    setProgress({
      phase: 'public',
      publicTotal: 28,
      publicCompleted: 0,
      tenantTotal: 90,
      tenantCompleted: 0,
    })

    try {
      // Run public schema migrations
      const publicResponse = await fetch('/api/setup/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema: 'public' }),
      })

      const publicData = await publicResponse.json()

      if (!publicData.success) {
        throw new Error(publicData.error || 'Public migrations failed')
      }

      setProgress((prev) => ({
        ...prev,
        phase: 'tenant',
        publicCompleted: publicData.count || 28,
      }))

      // Run tenant template migrations
      const tenantResponse = await fetch('/api/setup/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema: 'tenant_template' }),
      })

      const tenantData = await tenantResponse.json()

      if (!tenantData.success) {
        throw new Error(tenantData.error || 'Tenant migrations failed')
      }

      setProgress((prev) => ({
        ...prev,
        phase: 'complete',
        tenantCompleted: tenantData.count || 90,
      }))
    } catch (err) {
      setProgress((prev) => ({
        ...prev,
        phase: 'error',
        error: err instanceof Error ? err.message : 'Migration failed',
      }))
    } finally {
      setRunning(false)
    }
  }

  const publicProgress =
    progress.publicTotal > 0 ? (progress.publicCompleted / progress.publicTotal) * 100 : 0
  const tenantProgress =
    progress.tenantTotal > 0 ? (progress.tenantCompleted / progress.tenantTotal) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center">
          <GitBranch className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Database Migrations</h2>
          <p className="text-zinc-400 text-sm">
            Create database tables and set up the schema structure
          </p>
        </div>
      </div>

      {/* Migration Progress Panel */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-4">
        {/* Public Schema */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">Public Schema</span>
            <span className="text-xs font-mono text-zinc-500">
              {progress.publicCompleted}/{progress.publicTotal || '?'}
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-500"
              style={{ width: `${publicProgress}%` }}
            />
          </div>
          <p className="text-xs text-zinc-600 mt-1">
            Platform tables: organizations, users, sessions, api_keys...
          </p>
        </div>

        {/* Tenant Template */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">Tenant Template</span>
            <span className="text-xs font-mono text-zinc-500">
              {progress.tenantCompleted}/{progress.tenantTotal || '?'}
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-500"
              style={{ width: `${tenantProgress}%` }}
            />
          </div>
          <p className="text-xs text-zinc-600 mt-1">
            Tenant tables: orders, customers, products, creators...
          </p>
        </div>

        {/* Current migration (if running) */}
        {progress.currentMigration && (
          <div className="pt-2 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
              <code className="text-xs font-mono text-zinc-400">{progress.currentMigration}</code>
            </div>
          </div>
        )}

        {/* Error Display */}
        {progress.phase === 'error' && (
          <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-400 font-medium">Migration Failed</p>
              <p className="text-xs text-red-400/70 mt-1">{progress.error}</p>
            </div>
          </div>
        )}

        {/* Success Display */}
        {progress.phase === 'complete' && (
          <div className="p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-emerald-400 font-medium">Migrations Complete</p>
              <p className="text-xs text-emerald-400/70 mt-1">
                All database tables have been created successfully
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-xs text-zinc-500 space-y-2">
        <p>
          This will create all required database tables including the public schema (platform-wide)
          and tenant template schema (cloned for each new brand).
        </p>
        <p>
          <strong className="text-zinc-400">Note:</strong> Migrations are idempotent and can be
          safely re-run.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <Button variant="ghost" onClick={onBack} className="text-zinc-400">
          Back
        </Button>

        <div className="flex items-center gap-3">
          {progress.phase !== 'complete' && (
            <Button
              onClick={runMigrations}
              disabled={running}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Migrations
                </>
              )}
            </Button>
          )}

          {progress.phase === 'complete' && (
            <Button onClick={onComplete} className="bg-cyan-600 hover:bg-cyan-500 text-white">
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
