'use client'

import { cn } from '@cgk-platform/ui'
import {
  BarChart3,
  Clock,
  Cpu,
  FolderOpen,
  GitCompare,
  Image,
  LayoutDashboard,
  MessageSquare,
  Puzzle,
  Search,
  Settings,
  Terminal,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut'

interface CommandItem {
  id: string
  label: string
  category: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  keywords?: string[]
}

const COMMANDS: CommandItem[] = [
  // Global
  { id: 'overview', label: 'Overview', category: 'Navigation', href: '/', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', category: 'Navigation', href: '/analytics', icon: BarChart3, keywords: ['cost', 'tokens', 'usage'] },
  { id: 'parity', label: 'Parity Checker', category: 'Navigation', href: '/parity', icon: GitCompare, keywords: ['compare', 'skills', 'diff'] },

  // CGK
  { id: 'cgk-overview', label: 'CGK Overview', category: 'CGK Linens', href: '/cgk', icon: LayoutDashboard },
  { id: 'cgk-cron', label: 'CGK Cron Jobs', category: 'CGK Linens', href: '/cgk/cron', icon: Clock, keywords: ['schedule', 'jobs'] },
  { id: 'cgk-sessions', label: 'CGK Sessions', category: 'CGK Linens', href: '/cgk/sessions', icon: Terminal },
  { id: 'cgk-logs', label: 'CGK Logs', category: 'CGK Linens', href: '/cgk/logs', icon: Terminal, keywords: ['stream'] },
  { id: 'cgk-models', label: 'CGK Models', category: 'CGK Linens', href: '/cgk/models', icon: Cpu, keywords: ['llm', 'ai'] },
  { id: 'cgk-channels', label: 'CGK Channels', category: 'CGK Linens', href: '/cgk/channels', icon: MessageSquare, keywords: ['slack'] },
  { id: 'cgk-skills', label: 'CGK Skills', category: 'CGK Linens', href: '/cgk/skills', icon: Puzzle },
  { id: 'cgk-media', label: 'CGK Media', category: 'CGK Linens', href: '/cgk/media', icon: Image, keywords: ['images', 'videos'] },
  { id: 'cgk-workspace', label: 'CGK Workspace', category: 'CGK Linens', href: '/cgk/workspace', icon: FolderOpen, keywords: ['files'] },
  { id: 'cgk-config', label: 'CGK Config', category: 'CGK Linens', href: '/cgk/config', icon: Settings },

  // RAWDOG
  { id: 'rawdog-overview', label: 'RAWDOG Overview', category: 'RAWDOG', href: '/rawdog', icon: LayoutDashboard },
  { id: 'rawdog-cron', label: 'RAWDOG Cron Jobs', category: 'RAWDOG', href: '/rawdog/cron', icon: Clock },
  { id: 'rawdog-sessions', label: 'RAWDOG Sessions', category: 'RAWDOG', href: '/rawdog/sessions', icon: Terminal },
  { id: 'rawdog-logs', label: 'RAWDOG Logs', category: 'RAWDOG', href: '/rawdog/logs', icon: Terminal },
  { id: 'rawdog-models', label: 'RAWDOG Models', category: 'RAWDOG', href: '/rawdog/models', icon: Cpu },
  { id: 'rawdog-channels', label: 'RAWDOG Channels', category: 'RAWDOG', href: '/rawdog/channels', icon: MessageSquare },
  { id: 'rawdog-skills', label: 'RAWDOG Skills', category: 'RAWDOG', href: '/rawdog/skills', icon: Puzzle },
  { id: 'rawdog-media', label: 'RAWDOG Media', category: 'RAWDOG', href: '/rawdog/media', icon: Image },
  { id: 'rawdog-workspace', label: 'RAWDOG Workspace', category: 'RAWDOG', href: '/rawdog/workspace', icon: FolderOpen },
  { id: 'rawdog-config', label: 'RAWDOG Config', category: 'RAWDOG', href: '/rawdog/config', icon: Settings },

  // VitaHustle
  { id: 'vita-overview', label: 'VitaHustle Overview', category: 'VitaHustle', href: '/vitahustle', icon: LayoutDashboard },
  { id: 'vita-cron', label: 'VitaHustle Cron Jobs', category: 'VitaHustle', href: '/vitahustle/cron', icon: Clock },
  { id: 'vita-sessions', label: 'VitaHustle Sessions', category: 'VitaHustle', href: '/vitahustle/sessions', icon: Terminal },
  { id: 'vita-logs', label: 'VitaHustle Logs', category: 'VitaHustle', href: '/vitahustle/logs', icon: Terminal },
  { id: 'vita-models', label: 'VitaHustle Models', category: 'VitaHustle', href: '/vitahustle/models', icon: Cpu },
  { id: 'vita-channels', label: 'VitaHustle Channels', category: 'VitaHustle', href: '/vitahustle/channels', icon: MessageSquare },
  { id: 'vita-skills', label: 'VitaHustle Skills', category: 'VitaHustle', href: '/vitahustle/skills', icon: Puzzle },
  { id: 'vita-media', label: 'VitaHustle Media', category: 'VitaHustle', href: '/vitahustle/media', icon: Image },
  { id: 'vita-workspace', label: 'VitaHustle Workspace', category: 'VitaHustle', href: '/vitahustle/workspace', icon: FolderOpen },
  { id: 'vita-config', label: 'VitaHustle Config', category: 'VitaHustle', href: '/vitahustle/config', icon: Settings },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useKeyboardShortcut('k', () => setOpen(true), { metaKey: true })

  useEffect(() => {
    if (open) {
      setSearch('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!search) return COMMANDS
    const lower = search.toLowerCase()
    return COMMANDS.filter((cmd) => {
      if (cmd.label.toLowerCase().includes(lower)) return true
      if (cmd.category.toLowerCase().includes(lower)) return true
      return cmd.keywords?.some((kw) => kw.includes(lower)) ?? false
    })
  }, [search])

  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {}
    for (const cmd of filtered) {
      if (!groups[cmd.category]) groups[cmd.category] = []
      groups[cmd.category]!.push(cmd)
    }
    return Object.entries(groups)
  }, [filtered])

  const navigate = useCallback((href: string) => {
    setOpen(false)
    router.push(href)
  }, [router])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[selectedIndex]
      if (item) navigate(item.href)
    }
  }, [filtered, selectedIndex, navigate])

  if (!open) return null

  let flatIndex = 0

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[20vh]" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-black/50" />
      <div
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, profiles, features..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border px-1.5 py-0.5 text-2xs text-muted-foreground">ESC</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {grouped.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No results found
            </div>
          ) : (
            grouped.map(([category, items]) => (
              <div key={category}>
                <div className="px-2 py-1.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                  {category}
                </div>
                {items.map((item) => {
                  const idx = flatIndex++
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.href)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        idx === selectedIndex
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-accent'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className="border-t px-4 py-2 text-2xs text-muted-foreground">
          <span className="mr-3"><kbd className="rounded border px-1 py-0.5">↑↓</kbd> Navigate</span>
          <span className="mr-3"><kbd className="rounded border px-1 py-0.5">↵</kbd> Open</span>
          <span><kbd className="rounded border px-1 py-0.5">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  )
}
