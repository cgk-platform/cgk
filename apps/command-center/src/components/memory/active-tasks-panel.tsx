'use client'

import { Card, CardContent } from '@cgk-platform/ui'
import { CheckCircle2, FileText } from 'lucide-react'
import { useState } from 'react'

interface ActiveTask {
  name: string
}

interface ActiveTasksPanelProps {
  tasks: ActiveTask[]
  profile: string
}

export function ActiveTasksPanel({ tasks, profile }: ActiveTasksPanelProps) {
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [taskContent, setTaskContent] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadTask(name: string) {
    setSelectedTask(name)
    setLoading(true)
    try {
      const res = await fetch(
        `/api/openclaw/${profile}/memory?task=${encodeURIComponent(name)}`
      )
      const data = await res.json()
      setTaskContent(data.taskContent || '')
    } catch {
      setTaskContent('Failed to load task')
    } finally {
      setLoading(false)
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">No active tasks</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Active Tasks ({tasks.length})
      </h3>
      {tasks.map((task) => (
        <Card key={task.name}>
          <CardContent className="p-0">
            <button
              onClick={() => loadTask(task.name)}
              className="flex w-full items-center gap-2 p-3 text-left transition-colors hover:bg-accent/50"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate text-xs font-medium">{task.name}</span>
            </button>
            {selectedTask === task.name && (
              <div className="border-t p-3">
                {loading ? (
                  <div className="h-16 animate-pulse rounded bg-muted" />
                ) : (
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                    {taskContent || 'Empty'}
                  </pre>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
