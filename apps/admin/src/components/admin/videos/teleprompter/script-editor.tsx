'use client'

import { Button, cn, Input, Label, Textarea } from '@cgk/ui'
import { FileText, Loader2, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'

import type { CreateScriptInput, TeleprompterScript, UpdateScriptInput } from '@cgk/video/creator-tools'
import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  SCROLL_SPEED_MAX,
  SCROLL_SPEED_MIN,
} from '@cgk/video/creator-tools'

interface ScriptEditorProps {
  script?: TeleprompterScript | null
  onSave: (input: CreateScriptInput | UpdateScriptInput) => Promise<void>
  onDelete?: () => Promise<void>
  className?: string
}

/**
 * Script editor for teleprompter scripts
 *
 * Features:
 * - Title and content editing
 * - Default scroll speed and font size settings
 * - Character count display
 * - Auto-save indicator
 */
export function ScriptEditor({ script, onSave, onDelete, className }: ScriptEditorProps) {
  const [title, setTitle] = useState(script?.title || '')
  const [content, setContent] = useState(script?.content || '')
  const [scrollSpeed, setScrollSpeed] = useState(script?.scrollSpeed || 3)
  const [fontSize, setFontSize] = useState(script?.fontSize || 32)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const handleTitleChange = (value: string) => {
    setTitle(value)
    setHasChanges(true)
    setError(null)
  }

  const handleContentChange = (value: string) => {
    setContent(value)
    setHasChanges(true)
    setError(null)
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!content.trim()) {
      setError('Script content is required')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await onSave({
        title: title.trim(),
        content: content.trim(),
        scrollSpeed,
        fontSize,
      })
      setHasChanges(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save script')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm('Are you sure you want to delete this script?')) return

    setIsDeleting(true)
    try {
      await onDelete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete script')
      setIsDeleting(false)
    }
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const charCount = content.length
  const estimatedReadingTime = Math.ceil(wordCount / 150) // 150 wpm for teleprompter

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Header with title */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
          <FileText className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <Input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Script title..."
            className="border-none bg-transparent p-0 text-xl font-semibold focus:ring-0"
          />
          <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
            <span>{wordCount} words</span>
            <span>{charCount} characters</span>
            <span>~{estimatedReadingTime} min read</span>
          </div>
        </div>
      </div>

      {/* Content editor */}
      <div className="space-y-2">
        <Label htmlFor="script-content">Script Content</Label>
        <Textarea
          id="script-content"
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Enter your script here...

Use paragraph breaks (blank lines) to separate sections. The teleprompter will add extra spacing between paragraphs for better readability."
          className="min-h-[300px] resize-y font-sans text-base leading-relaxed"
        />
      </div>

      {/* Default settings */}
      <div className="grid gap-6 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Default Scroll Speed</Label>
            <span className="font-mono text-sm text-amber-500">{scrollSpeed}</span>
          </div>
          <input
            type="range"
            min={SCROLL_SPEED_MIN}
            max={SCROLL_SPEED_MAX}
            value={scrollSpeed}
            onChange={(e) => {
              setScrollSpeed(parseInt(e.target.value, 10))
              setHasChanges(true)
            }}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-amber-500"
          />
          <p className="text-xs text-muted-foreground">
            1 = very slow, 5 = normal, 10 = very fast
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Default Font Size</Label>
            <span className="font-mono text-sm text-amber-500">{fontSize}px</span>
          </div>
          <input
            type="range"
            min={FONT_SIZE_MIN}
            max={FONT_SIZE_MAX}
            step={2}
            value={fontSize}
            onChange={(e) => {
              setFontSize(parseInt(e.target.value, 10))
              setHasChanges(true)
            }}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-amber-500"
          />
          <p className="text-xs text-muted-foreground">
            Recommended: 28-40px for most setups
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-4">
        <div className="flex items-center gap-2">
          {script && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-muted-foreground hover:text-destructive"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-sm text-muted-foreground">Unsaved changes</span>
          )}
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {script ? 'Save Changes' : 'Create Script'}
          </Button>
        </div>
      </div>
    </div>
  )
}
