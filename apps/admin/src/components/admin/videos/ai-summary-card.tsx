'use client'

/**
 * AISummaryCard Component
 *
 * Displays AI-generated content:
 * - Suggested title
 * - Summary
 * - Auto-generated chapters
 *
 * @ai-pattern editorial-studio
 */

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from '@cgk/ui'

export interface TranscriptionChapter {
  headline: string
  summary: string
  startMs: number
  endMs: number
}

interface AISummaryCardProps {
  title?: string | null
  summary?: string | null
  chapters?: TranscriptionChapter[] | null
  onApplyTitle?: (title: string) => void
  onSeekToChapter?: (startMs: number) => void
  className?: string
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function AISummaryCard({
  title,
  summary,
  chapters,
  onApplyTitle,
  onSeekToChapter,
  className = '',
}: AISummaryCardProps) {
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null)

  const hasContent = title || summary || (chapters && chapters.length > 0)

  if (!hasContent) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AIIcon className="h-4 w-4 text-purple-500" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-zinc-500 dark:text-zinc-400">
            <SparklesIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">AI content will appear here after transcription</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="border-b border-zinc-200 dark:border-zinc-800">
        <CardTitle className="text-sm font-medium font-mono uppercase tracking-wide text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
          <AIIcon className="h-4 w-4 text-purple-500" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {/* AI Title */}
        {title && (
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Suggested Title
            </label>
            <div className="flex items-start gap-3">
              <p className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-700">
                {title}
              </p>
              {onApplyTitle && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onApplyTitle(title)}
                  className="shrink-0 h-9"
                >
                  Apply
                </Button>
              )}
            </div>
          </div>
        )}

        {/* AI Summary */}
        {summary && (
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Summary
            </label>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {summary}
            </p>
          </div>
        )}

        {/* Chapters */}
        {chapters && chapters.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Chapters ({chapters.length})
            </label>
            <div className="space-y-2">
              {chapters.map((chapter, index) => {
                const isExpanded = expandedChapter === index
                const duration = chapter.endMs - chapter.startMs

                return (
                  <div
                    key={index}
                    className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden transition-all duration-200"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedChapter(isExpanded ? null : index)}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <Badge
                        variant="outline"
                        className="shrink-0 font-mono text-xs bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800"
                      >
                        {formatTime(chapter.startMs)}
                      </Badge>
                      <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {chapter.headline}
                      </span>
                      <ChevronIcon
                        className={`h-4 w-4 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0 border-t border-zinc-100 dark:border-zinc-800">
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3 leading-relaxed">
                          {chapter.summary}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-500 font-mono">
                            Duration: {formatTime(duration)}
                          </span>
                          {onSeekToChapter && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onSeekToChapter(chapter.startMs)
                              }}
                              className="h-7 px-2 text-xs"
                            >
                              <PlayIcon className="h-3 w-3 mr-1" />
                              Jump to chapter
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AIIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function SparklesIcon({ className }: { className?: string }) {
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
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
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

export default AISummaryCard
