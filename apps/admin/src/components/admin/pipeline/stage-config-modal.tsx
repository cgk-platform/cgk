'use client'

import { cn } from '@cgk/ui'
import { GripVertical, X } from 'lucide-react'
import { useState, useEffect } from 'react'

import type { StageConfig, PipelineConfig } from '@/lib/pipeline/types'

interface StageConfigModalProps {
  config: PipelineConfig
  onSave: (config: Partial<PipelineConfig>) => Promise<void>
  onClose: () => void
}

export function StageConfigModal({
  config,
  onSave,
  onClose,
}: StageConfigModalProps) {
  const [stages, setStages] = useState<StageConfig[]>(config.stages)
  const [wipLimits, setWipLimits] = useState<Record<string, number>>(
    config.wipLimits || {}
  )
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave({ stages, wipLimits })
      onClose()
    } catch (error) {
      console.error('Failed to save config:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const updateStage = (index: number, updates: Partial<StageConfig>) => {
    setStages((prev) => {
      const newStages = [...prev]
      newStages[index] = { ...newStages[index], ...updates }
      return newStages
    })
  }

  const updateWipLimit = (stageId: string, limit: number | undefined) => {
    setWipLimits((prev) => {
      if (limit === undefined || limit === 0) {
        const { [stageId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [stageId]: limit }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-2xl rounded-lg border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/50 px-4 py-3">
          <h2 className="font-mono text-sm font-semibold text-slate-200">
            Stage Configuration
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          <div className="mb-4 rounded border border-slate-700/50 bg-slate-800/30 p-3">
            <p className="font-mono text-xs text-slate-500">
              Configure stage labels, colors, and WIP limits. Changes will apply to all views.
            </p>
          </div>

          <div className="space-y-2">
            {/* Header row */}
            <div className="grid grid-cols-[24px_1fr_100px_80px_100px] gap-3 px-2 font-mono text-xs font-medium uppercase tracking-wider text-slate-500">
              <div />
              <div>Label</div>
              <div>Color</div>
              <div>WIP Limit</div>
              <div>Notify</div>
            </div>

            {stages.map((stage, index) => {
              const isCore = ['draft', 'approved', 'payout_approved'].includes(stage.id)
              return (
                <div
                  key={stage.id}
                  className={cn(
                    'grid grid-cols-[24px_1fr_100px_80px_100px] items-center gap-3 rounded border border-slate-700/30 bg-slate-800/20 px-2 py-2',
                    isCore && 'opacity-75'
                  )}
                >
                  {/* Drag handle */}
                  <div className="flex justify-center">
                    <GripVertical className="h-4 w-4 cursor-grab text-slate-600" />
                  </div>

                  {/* Label */}
                  <input
                    type="text"
                    value={stage.label}
                    onChange={(e) => updateStage(index, { label: e.target.value })}
                    disabled={isCore}
                    className="rounded border border-slate-700/50 bg-slate-900/50 px-2 py-1 font-mono text-xs text-slate-200 focus:border-blue-500/50 focus:outline-none disabled:opacity-50"
                  />

                  {/* Color */}
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={stage.color}
                      onChange={(e) => updateStage(index, { color: e.target.value })}
                      className="h-6 w-6 cursor-pointer rounded border border-slate-700/50 bg-transparent"
                    />
                    <input
                      type="text"
                      value={stage.color}
                      onChange={(e) => updateStage(index, { color: e.target.value })}
                      className="w-16 rounded border border-slate-700/50 bg-slate-900/50 px-2 py-1 font-mono text-xs text-slate-400 focus:border-blue-500/50 focus:outline-none"
                    />
                  </div>

                  {/* WIP Limit */}
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={wipLimits[stage.id] || ''}
                    placeholder="0"
                    onChange={(e) =>
                      updateWipLimit(
                        stage.id,
                        e.target.value ? parseInt(e.target.value, 10) : undefined
                      )
                    }
                    className="w-full rounded border border-slate-700/50 bg-slate-900/50 px-2 py-1 font-mono text-xs text-slate-200 placeholder-slate-600 focus:border-blue-500/50 focus:outline-none"
                  />

                  {/* Auto-notify */}
                  <label className="flex cursor-pointer items-center justify-center">
                    <input
                      type="checkbox"
                      checked={stage.autoNotifyCreator || false}
                      onChange={(e) =>
                        updateStage(index, { autoNotifyCreator: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500/20"
                    />
                  </label>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-700/50 px-4 py-3">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 font-mono text-xs text-slate-400 transition-colors hover:text-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded bg-blue-500 px-4 py-2 font-mono text-xs font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
