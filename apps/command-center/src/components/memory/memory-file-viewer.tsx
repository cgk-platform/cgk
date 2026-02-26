'use client'

import { FileText } from 'lucide-react'

interface MemoryFileViewerProps {
  date: string | null
  content: string
  loading: boolean
}

export function MemoryFileViewer({ date, content, loading }: MemoryFileViewerProps) {
  if (!date) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-8 text-center">
        <FileText className="mb-2 h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Select a date from the calendar to view memory
        </p>
      </div>
    )
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-lg border bg-card" />
  }

  if (!content) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        No memory file for {date}
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-2">
        <h3 className="text-sm font-medium">{date}.md</h3>
      </div>
      <pre className="max-h-[500px] overflow-auto whitespace-pre-wrap p-4 font-mono text-xs text-muted-foreground">
        {content}
      </pre>
    </div>
  )
}
