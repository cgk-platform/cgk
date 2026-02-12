'use client'

/**
 * ChaptersTimeline Component
 *
 * Visual chapter navigation with:
 * - Timeline bar showing chapter positions
 * - Clickable chapter markers
 * - Current chapter highlighting
 * - Chapter labels on hover
 *
 * @ai-pattern editorial-studio
 */

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@cgk/ui'

export interface TranscriptionChapter {
  headline: string
  summary: string
  startMs: number
  endMs: number
}

interface ChaptersTimelineProps {
  chapters: TranscriptionChapter[]
  totalDurationMs: number
  currentTimeMs?: number
  onSeek?: (timeMs: number) => void
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

// Chapter colors for visual distinction
const CHAPTER_COLORS = [
  'bg-blue-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-indigo-500',
]

export function ChaptersTimeline({
  chapters,
  totalDurationMs,
  currentTimeMs = 0,
  onSeek,
  className = '',
}: ChaptersTimelineProps) {
  const [hoveredChapter, setHoveredChapter] = useState<number | null>(null)

  // Calculate current chapter
  const currentChapterIndex = useMemo(() => {
    return chapters.findIndex(
      (chapter) =>
        currentTimeMs >= chapter.startMs && currentTimeMs < chapter.endMs
    )
  }, [chapters, currentTimeMs])

  // Calculate progress percentage
  const progressPercent = useMemo(() => {
    if (totalDurationMs === 0) return 0
    return Math.min(100, (currentTimeMs / totalDurationMs) * 100)
  }, [currentTimeMs, totalDurationMs])

  if (chapters.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ChapterIcon className="h-4 w-4 text-blue-500" />
            Chapters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-zinc-500 dark:text-zinc-400">
            <p className="text-sm">No chapters available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium font-mono uppercase tracking-wide text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
            <ChapterIcon className="h-4 w-4 text-blue-500" />
            Chapters
          </CardTitle>
          <span className="text-xs text-zinc-500 font-mono">
            {formatTime(currentTimeMs)} / {formatTime(totalDurationMs)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Timeline bar */}
        <div className="relative">
          {/* Track background */}
          <div className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden relative">
            {/* Chapter segments */}
            {chapters.map((chapter, index) => {
              const startPercent = (chapter.startMs / totalDurationMs) * 100
              const widthPercent =
                ((chapter.endMs - chapter.startMs) / totalDurationMs) * 100
              const color = CHAPTER_COLORS[index % CHAPTER_COLORS.length]
              const isHovered = hoveredChapter === index
              const isCurrent = currentChapterIndex === index

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => onSeek?.(chapter.startMs)}
                  onMouseEnter={() => setHoveredChapter(index)}
                  onMouseLeave={() => setHoveredChapter(null)}
                  disabled={!onSeek}
                  className={`
                    absolute top-0 bottom-0 transition-all duration-150
                    ${color}
                    ${isHovered || isCurrent ? 'opacity-100' : 'opacity-60'}
                    ${isHovered ? 'z-10 scale-y-110' : ''}
                    ${!onSeek ? '' : 'cursor-pointer hover:opacity-100'}
                  `}
                  style={{
                    left: `${startPercent}%`,
                    width: `${widthPercent}%`,
                  }}
                  title={chapter.headline}
                >
                  {/* Chapter number */}
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white/90">
                    {widthPercent > 5 ? index + 1 : ''}
                  </span>
                </button>
              )
            })}

            {/* Progress indicator */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-20 transition-[left] duration-100"
              style={{ left: `${progressPercent}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow" />
            </div>
          </div>

          {/* Hover tooltip */}
          {hoveredChapter !== null && chapters[hoveredChapter] && (
            <div
              className="absolute top-full mt-2 z-30 pointer-events-none"
              style={{
                left: `${(chapters[hoveredChapter]!.startMs / totalDurationMs) * 100}%`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-2 rounded-lg shadow-lg text-xs max-w-[200px]">
                <p className="font-medium truncate">
                  {chapters[hoveredChapter]!.headline}
                </p>
                <p className="text-zinc-400 dark:text-zinc-600 mt-0.5 font-mono">
                  {formatTime(chapters[hoveredChapter]!.startMs)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Chapter list */}
        <div className="space-y-1">
          {chapters.map((chapter, index) => {
            const color = CHAPTER_COLORS[index % CHAPTER_COLORS.length]
            const isCurrent = currentChapterIndex === index

            return (
              <button
                key={index}
                type="button"
                onClick={() => onSeek?.(chapter.startMs)}
                disabled={!onSeek}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                  ${isCurrent
                    ? 'bg-zinc-100 dark:bg-zinc-800'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }
                  ${!onSeek ? '' : 'cursor-pointer'}
                `}
              >
                {/* Color indicator */}
                <div className={`w-1.5 h-8 rounded-full ${color} shrink-0`} />

                {/* Chapter info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500 w-8">
                      {formatTime(chapter.startMs)}
                    </span>
                    <span
                      className={`text-sm truncate ${isCurrent ? 'font-medium text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'}`}
                    >
                      {chapter.headline}
                    </span>
                  </div>
                </div>

                {/* Play indicator for current */}
                {isCurrent && (
                  <div className="shrink-0">
                    <PlayingIndicator />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function ChapterIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function PlayingIndicator() {
  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-0.5 bg-emerald-500 rounded-full animate-pulse"
          style={{
            height: `${8 + (i === 1 ? 4 : 0)}px`,
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  )
}

export default ChaptersTimeline
