'use client'

/**
 * AITasksList Component
 *
 * Displays AI-extracted action items with:
 * - Completion toggle checkboxes
 * - Optional timestamps
 * - Click to seek to mention
 *
 * @ai-pattern editorial-studio
 */

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Checkbox } from '@cgk-platform/ui'

export interface AITask {
  text: string
  timestampSeconds?: number
  completed: boolean
}

interface AITasksListProps {
  tasks: AITask[]
  videoId: string
  onToggleTask?: (taskIndex: number, completed: boolean) => Promise<void>
  onSeekToTimestamp?: (timestampSeconds: number) => void
  className?: string
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export function AITasksList({
  tasks,
  videoId: _videoId,
  onToggleTask,
  onSeekToTimestamp,
  className = '',
}: AITasksListProps) {
  const [optimisticTasks, setOptimisticTasks] = useState<Record<number, boolean>>({})
  const [loadingTasks, setLoadingTasks] = useState<Set<number>>(new Set())

  const handleToggle = useCallback(
    async (taskIndex: number, completed: boolean) => {
      if (!onToggleTask || loadingTasks.has(taskIndex)) return

      // Optimistic update
      setOptimisticTasks((prev) => ({ ...prev, [taskIndex]: completed }))
      setLoadingTasks((prev) => new Set(prev).add(taskIndex))

      try {
        await onToggleTask(taskIndex, completed)
      } catch {
        // Revert on error
        setOptimisticTasks((prev) => {
          const next = { ...prev }
          delete next[taskIndex]
          return next
        })
      } finally {
        setLoadingTasks((prev) => {
          const next = new Set(prev)
          next.delete(taskIndex)
          return next
        })
      }
    },
    [onToggleTask, loadingTasks]
  )

  const completedCount = tasks.filter(
    (task, index) => optimisticTasks[index] ?? task.completed
  ).length

  if (tasks.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TaskIcon className="h-4 w-4 text-amber-500" />
            Action Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-zinc-500 dark:text-zinc-400">
            <ChecklistIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No action items found in this video</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium font-mono uppercase tracking-wide text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
            <TaskIcon className="h-4 w-4 text-amber-500" />
            Action Items
          </CardTitle>
          <span className="text-xs text-zinc-500 dark:text-zinc-500 font-mono">
            {completedCount}/{tasks.length} done
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {tasks.map((task, index) => {
            const isCompleted = optimisticTasks[index] ?? task.completed
            const isLoading = loadingTasks.has(index)

            return (
              <li
                key={index}
                className="flex items-start gap-3 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <Checkbox
                  checked={isCompleted}
                  onCheckedChange={(checked) =>
                    handleToggle(index, checked as boolean)
                  }
                  disabled={!onToggleTask || isLoading}
                  className={`
                    mt-0.5 shrink-0
                    ${isLoading ? 'opacity-50' : ''}
                    data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600
                  `}
                />

                <div className="flex-1 min-w-0">
                  <p
                    className={`
                      text-sm leading-relaxed
                      ${isCompleted
                        ? 'text-zinc-400 dark:text-zinc-500 line-through'
                        : 'text-zinc-900 dark:text-zinc-100'
                      }
                    `}
                  >
                    {task.text}
                  </p>

                  {task.timestampSeconds !== undefined && (
                    <button
                      type="button"
                      onClick={() =>
                        onSeekToTimestamp?.(task.timestampSeconds!)
                      }
                      disabled={!onSeekToTimestamp}
                      className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-mono hover:text-amber-700 dark:hover:text-amber-300 disabled:opacity-50 disabled:cursor-default flex items-center gap-1"
                    >
                      <PlayIcon className="h-3 w-3" />
                      {formatTime(task.timestampSeconds)}
                    </button>
                  )}
                </div>

                {isLoading && (
                  <div className="shrink-0">
                    <LoadingSpinner className="h-4 w-4 text-zinc-400" />
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        {/* Progress bar */}
        <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                style={{
                  width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-xs font-mono text-zinc-500">
              {Math.round(
                tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0
              )}
              %
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TaskIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M2.625 6.75a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875 0A.75.75 0 018.25 6h12a.75.75 0 010 1.5h-12a.75.75 0 01-.75-.75zM2.625 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zM7.5 12a.75.75 0 01.75-.75h12a.75.75 0 010 1.5h-12A.75.75 0 017.5 12zm-4.875 5.25a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875 0a.75.75 0 01.75-.75h12a.75.75 0 010 1.5h-12a.75.75 0 01-.75-.75z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function ChecklistIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
    </svg>
  )
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className={`animate-spin ${className}`}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

export default AITasksList
