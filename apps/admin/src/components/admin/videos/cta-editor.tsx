'use client'

import { Button, cn, Input, Label } from '@cgk-platform/ui'
import { ExternalLink, GripVertical, Loader2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import {
  CTA_POSITION_CONFIG,
  CTA_STYLE_CONFIG,
  CTA_VALIDATION,
  type CTAButton,
  type CTAButtonInput,
  type CTAPosition,
  type CTAStyle,
} from '@cgk-platform/video/creator-tools'

interface CTAEditorProps {
  buttons: CTAButton[]
  videoDuration: number
  onSave: (buttons: CTAButtonInput[]) => Promise<void>
  className?: string
}

/**
 * CTA Button Editor for videos
 *
 * Features:
 * - Add up to 3 CTA buttons
 * - Configure style, position, and timing
 * - Drag to reorder
 * - Preview button appearance
 */
export function CTAEditor({ buttons: initialButtons, videoDuration, onSave, className }: CTAEditorProps) {
  const [buttons, setButtons] = useState<CTAButtonInput[]>(
    initialButtons.map((b) => ({
      label: b.label,
      url: b.url,
      style: b.style,
      position: b.position,
      showAtSeconds: b.showAtSeconds,
      hideAtSeconds: b.hideAtSeconds,
      sortOrder: b.sortOrder,
    }))
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const canAddMore = buttons.length < CTA_VALIDATION.maxButtons

  const handleAddButton = () => {
    if (!canAddMore) return

    setButtons([
      ...buttons,
      {
        label: '',
        url: '',
        style: 'primary',
        position: 'end',
        showAtSeconds: null,
        hideAtSeconds: null,
        sortOrder: buttons.length,
      },
    ])
    setExpandedIndex(buttons.length)
  }

  const handleRemoveButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index))
    if (expandedIndex === index) {
      setExpandedIndex(null)
    }
  }

  const handleUpdateButton = (index: number, updates: Partial<CTAButtonInput>) => {
    setButtons(
      buttons.map((b, i) =>
        i === index ? { ...b, ...updates } : b
      )
    )
  }

  const handleSave = async () => {
    setError(null)

    // Validate buttons
    for (let i = 0; i < buttons.length; i++) {
      const b = buttons[i]
      if (!b) continue
      if (!b.label.trim()) {
        setError(`Button ${i + 1}: Label is required`)
        return
      }
      if (!b.url.trim()) {
        setError(`Button ${i + 1}: URL is required`)
        return
      }
      if (!CTA_VALIDATION.urlPattern.test(b.url)) {
        setError(`Button ${i + 1}: URL must start with http:// or https://`)
        return
      }
      if (b.position === 'overlay' && (b.showAtSeconds === null || b.showAtSeconds === undefined)) {
        setError(`Button ${i + 1}: Overlay position requires a start time`)
        return
      }
    }

    setIsSaving(true)
    try {
      await onSave(buttons)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Call-to-Action Buttons</h3>
          <p className="text-sm text-muted-foreground">
            Add buttons that appear before, after, or during video playback
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddButton}
          disabled={!canAddMore}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Button
        </Button>
      </div>

      {/* Button list */}
      {buttons.length === 0 ? (
        <div className="rounded-lg border border-dashed py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No CTA buttons configured. Add one to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {buttons.map((button, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-lg border bg-card"
            >
              {/* Button header */}
              <div
                className="flex cursor-pointer items-center gap-3 px-4 py-3"
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />

                {/* Preview */}
                <div
                  className={cn(
                    'flex-1 rounded px-3 py-1.5 text-sm font-medium',
                    CTA_STYLE_CONFIG[button.style || 'primary'].className
                  )}
                >
                  {button.label || 'Untitled Button'}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded bg-muted px-2 py-0.5">
                    {CTA_POSITION_CONFIG[button.position || 'end'].label}
                  </span>
                  {button.url && (
                    <a
                      href={button.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveButton(index)
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Expanded editor */}
              {expandedIndex === index && (
                <div className="space-y-4 border-t bg-muted/30 px-4 py-4">
                  {/* Label and URL */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Button Label</Label>
                      <Input
                        value={button.label}
                        onChange={(e) =>
                          handleUpdateButton(index, { label: e.target.value })
                        }
                        placeholder="Shop Now"
                        maxLength={CTA_VALIDATION.maxLabelLength}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>URL</Label>
                      <Input
                        value={button.url}
                        onChange={(e) =>
                          handleUpdateButton(index, { url: e.target.value })
                        }
                        placeholder="https://example.com/shop"
                      />
                    </div>
                  </div>

                  {/* Style selection */}
                  <div className="space-y-2">
                    <Label>Style</Label>
                    <div className="flex gap-2">
                      {(Object.keys(CTA_STYLE_CONFIG) as CTAStyle[]).map((style) => (
                        <button
                          key={style}
                          onClick={() => handleUpdateButton(index, { style })}
                          className={cn(
                            'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all',
                            CTA_STYLE_CONFIG[style].className,
                            button.style === style && 'ring-2 ring-amber-500 ring-offset-2 ring-offset-background'
                          )}
                        >
                          {CTA_STYLE_CONFIG[style].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Position selection */}
                  <div className="space-y-2">
                    <Label>Position</Label>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {(Object.keys(CTA_POSITION_CONFIG) as CTAPosition[]).map((position) => (
                        <button
                          key={position}
                          onClick={() =>
                            handleUpdateButton(index, {
                              position,
                              showAtSeconds: position === 'overlay' ? 0 : null,
                              hideAtSeconds: null,
                            })
                          }
                          className={cn(
                            'rounded-md border px-3 py-2 text-left transition-colors',
                            button.position === position
                              ? 'border-amber-500 bg-amber-500/10'
                              : 'border-border hover:bg-muted'
                          )}
                        >
                          <div className="font-medium text-sm">
                            {CTA_POSITION_CONFIG[position].label}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {CTA_POSITION_CONFIG[position].description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Overlay timing (only for overlay position) */}
                  {button.position === 'overlay' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Show at (seconds)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={videoDuration}
                          value={button.showAtSeconds ?? 0}
                          onChange={(e) =>
                            handleUpdateButton(index, {
                              showAtSeconds: parseInt(e.target.value, 10) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Hide at (seconds, optional)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={videoDuration}
                          value={button.hideAtSeconds ?? ''}
                          onChange={(e) =>
                            handleUpdateButton(index, {
                              hideAtSeconds: e.target.value
                                ? parseInt(e.target.value, 10)
                                : null,
                            })
                          }
                          placeholder="End of video"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Save button */}
      <div className="flex justify-end border-t pt-4">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save CTA Buttons
        </Button>
      </div>
    </div>
  )
}
