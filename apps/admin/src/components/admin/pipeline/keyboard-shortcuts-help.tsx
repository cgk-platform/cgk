'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

interface KeyboardShortcutsHelpProps {
  onClose: () => void
}

const SHORTCUTS = [
  { keys: ['?'], description: 'Show this help' },
  { keys: ['k', '↑'], description: 'Move focus up' },
  { keys: ['j', '↓'], description: 'Move focus down' },
  { keys: ['h', '←'], description: 'Move focus to previous column' },
  { keys: ['l', '→'], description: 'Move focus to next column' },
  { keys: ['Enter'], description: 'Open focused card' },
  { keys: ['Esc'], description: 'Close modal / Deselect' },
  { keys: ['n'], description: 'Create new project' },
  { keys: ['f', '/'], description: 'Focus search / filter' },
  { keys: ['1-9'], description: 'Jump to column 1-9' },
  { keys: ['v k'], description: 'Switch to Kanban view' },
  { keys: ['v t'], description: 'Switch to Table view' },
  { keys: ['v c'], description: 'Switch to Calendar view' },
]

export function KeyboardShortcutsHelp({ onClose }: KeyboardShortcutsHelpProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-700/50 px-4 py-3">
          <h2 className="font-mono text-sm font-semibold text-slate-200">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          <div className="space-y-2">
            {SHORTCUTS.map((shortcut, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5"
              >
                <span className="font-mono text-xs text-slate-400">
                  {shortcut.description}
                </span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, j) => (
                    <span key={j} className="flex items-center gap-1">
                      {j > 0 && (
                        <span className="text-xs text-slate-600">/</span>
                      )}
                      <kbd className="min-w-[24px] rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-center font-mono text-xs text-slate-300">
                        {key}
                      </kbd>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-700/50 px-4 py-3">
          <p className="font-mono text-xs text-slate-600">
            Press <kbd className="rounded border border-slate-700 bg-slate-800 px-1 text-slate-400">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  )
}
