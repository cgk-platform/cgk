'use client'

import { cn } from '@cgk-platform/ui'
import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface FileEntry {
  name: string
  path: string
  isDir: boolean
  size?: number
}

interface FileTreeProps {
  profile: string
  selectedFile: string | null
  onSelectFile: (path: string) => void
}

interface DirState {
  files: FileEntry[]
  expanded: boolean
  loaded: boolean
}

export function FileTree({ profile, selectedFile, onSelectFile }: FileTreeProps) {
  const [dirs, setDirs] = useState<Record<string, DirState>>({
    '': { files: [], expanded: true, loaded: false },
  })

  const loadDir = useCallback(async (dir: string) => {
    try {
      const res = await fetch(`/api/openclaw/${profile}/workspace/files?dir=${encodeURIComponent(dir)}`)
      const data = await res.json()
      setDirs((prev) => ({
        ...prev,
        [dir]: { files: data.files || [], expanded: true, loaded: true },
      }))
    } catch {
      // ignore
    }
  }, [profile])

  useEffect(() => {
    loadDir('')
  }, [loadDir])

  const toggleDir = useCallback((dir: string) => {
    setDirs((prev) => {
      const existing = prev[dir]
      if (!existing || !existing.loaded) {
        // Need to load
        loadDir(dir)
        return prev
      }
      return { ...prev, [dir]: { ...existing, expanded: !existing.expanded } }
    })
  }, [loadDir])

  const renderDir = (path: string, depth: number) => {
    const state = dirs[path]
    if (!state || !state.expanded) return null

    return state.files.map((entry) => {
      if (entry.isDir) {
        const dirState = dirs[entry.path]
        const isExpanded = dirState?.expanded ?? false
        return (
          <div key={entry.path}>
            <button
              onClick={() => toggleDir(entry.path)}
              className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 shrink-0" />
              )}
              <Folder className="h-3 w-3 shrink-0 text-gold/70" />
              <span className="truncate">{entry.name}</span>
            </button>
            {isExpanded && renderDir(entry.path, depth + 1)}
          </div>
        )
      }

      return (
        <button
          key={entry.path}
          onClick={() => onSelectFile(entry.path)}
          className={cn(
            'flex w-full items-center gap-1.5 rounded px-2 py-1 text-xs',
            selectedFile === entry.path
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
          style={{ paddingLeft: `${depth * 12 + 20}px` }}
        >
          <File className="h-3 w-3 shrink-0" />
          <span className="truncate">{entry.name}</span>
        </button>
      )
    })
  }

  return (
    <div className="space-y-0.5 overflow-y-auto">
      {renderDir('', 0)}
    </div>
  )
}
