'use client'

import { cn } from '@cgk/ui'
import { Bold, Italic, Link as LinkIcon, List, ListOrdered, Code, Image, Eye, Edit } from 'lucide-react'
import { useState, useCallback } from 'react'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  minHeight?: string
}

export function MarkdownEditor({ value, onChange, minHeight = '400px' }: MarkdownEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')

  const insertAtCursor = useCallback(
    (before: string, after: string = '') => {
      const textarea = document.getElementById('md-editor') as HTMLTextAreaElement
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selectedText = value.substring(start, end)

      const newValue =
        value.substring(0, start) + before + selectedText + after + value.substring(end)

      onChange(newValue)

      // Restore cursor position
      setTimeout(() => {
        textarea.focus()
        const newCursorPos = start + before.length + selectedText.length + after.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
    },
    [value, onChange],
  )

  const toolbarButtons = [
    { icon: Bold, label: 'Bold', action: () => insertAtCursor('**', '**') },
    { icon: Italic, label: 'Italic', action: () => insertAtCursor('_', '_') },
    { icon: LinkIcon, label: 'Link', action: () => insertAtCursor('[', '](url)') },
    { icon: Code, label: 'Code', action: () => insertAtCursor('`', '`') },
    { icon: Image, label: 'Image', action: () => insertAtCursor('![alt](', ')') },
    { icon: List, label: 'Bullet List', action: () => insertAtCursor('\n- ') },
    { icon: ListOrdered, label: 'Numbered List', action: () => insertAtCursor('\n1. ') },
  ]

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between border-b bg-muted/50 px-2 py-1">
        <div className="flex gap-1">
          {toolbarButtons.map(({ icon: Icon, label, action }) => (
            <button
              key={label}
              type="button"
              onClick={action}
              className="rounded p-1.5 hover:bg-muted"
              title={label}
              disabled={mode === 'preview'}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={cn(
              'flex items-center gap-1 rounded px-2 py-1 text-xs',
              mode === 'edit' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
            )}
          >
            <Edit className="h-3 w-3" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={cn(
              'flex items-center gap-1 rounded px-2 py-1 text-xs',
              mode === 'preview' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
            )}
          >
            <Eye className="h-3 w-3" />
            Preview
          </button>
        </div>
      </div>

      {mode === 'edit' ? (
        <textarea
          id="md-editor"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full resize-none bg-background p-4 font-mono text-sm focus:outline-none"
          style={{ minHeight }}
          placeholder="Write your content in Markdown..."
        />
      ) : (
        <div
          className="prose prose-sm max-w-none p-4 dark:prose-invert"
          style={{ minHeight }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
        />
      )}
    </div>
  )
}

function renderMarkdown(text: string): string {
  // Simple markdown rendering for preview
  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary underline">$1</a>')
    // Images
    .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded" />')
    // Code
    .replace(/`(.+?)`/g, '<code class="rounded bg-muted px-1 py-0.5 font-mono text-sm">$1</code>')
    // Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')

  // Wrap in paragraph
  html = `<p>${html}</p>`

  // Wrap list items
  html = html.replace(/(<li>.*<\/li>)+/g, '<ul class="list-disc pl-4">$&</ul>')

  return html
}
