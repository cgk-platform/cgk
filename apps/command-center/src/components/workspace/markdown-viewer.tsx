'use client'

import { useCallback, useEffect, useState } from 'react'

interface MarkdownViewerProps {
  profile: string
  path: string | null
}

export function MarkdownViewer({ profile, path }: MarkdownViewerProps) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFile = useCallback(async () => {
    if (!path) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/openclaw/${profile}/workspace?path=${encodeURIComponent(path)}`
      )
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to load file')
        setContent(null)
      } else {
        setContent(data.content)
      }
    } catch {
      setError('Failed to fetch file')
      setContent(null)
    } finally {
      setLoading(false)
    }
  }, [profile, path])

  useEffect(() => {
    fetchFile()
  }, [fetchFile])

  if (!path) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a file to view
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive">
        {error}
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="border-b px-4 py-2">
        <span className="font-mono text-xs text-muted-foreground">{path}</span>
      </div>
      <pre className="whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed">
        {content}
      </pre>
    </div>
  )
}
