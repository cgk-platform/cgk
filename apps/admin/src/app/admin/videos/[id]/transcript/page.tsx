'use client'

/**
 * Video Transcript Page
 *
 * Dedicated page for viewing and managing video transcription:
 * - Interactive transcript with click-to-seek
 * - AI-generated content (title, summary, chapters, tasks)
 * - Caption download (VTT/SRT)
 * - Transcript search
 *
 * @ai-pattern editorial-studio
 */

import { use, useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Button, Card, CardContent, Spinner } from '@cgk/ui'
import {
  TranscriptionStatus,
  TranscriptViewer,
  AISummaryCard,
  AITasksList,
  ChaptersTimeline,
  TranscriptSearch,
} from '@/components/admin/videos'
import type { TranscriptionStatusType, TranscriptionWord } from '@/components/admin/videos'

interface TranscriptData {
  id: string
  title: string
  transcription: {
    status: TranscriptionStatusType
    text: string | null
    words: TranscriptionWord[]
  }
  ai: {
    title: string | null
    summary: string | null
    chapters: Array<{
      headline: string
      summary: string
      startMs: number
      endMs: number
    }> | null
    tasks: Array<{
      text: string
      timestampSeconds?: number
      completed: boolean
    }> | null
  }
}

async function fetchTranscript(videoId: string): Promise<TranscriptData | null> {
  try {
    const response = await fetch(`/api/v1/videos/${videoId}/transcript`)
    if (!response.ok) {
      return null
    }
    const data = await response.json()
    return {
      id: data.id,
      title: data.title,
      transcription: {
        status: data.transcription?.status || 'pending',
        text: data.transcription?.text || null,
        words: data.transcription?.words || [],
      },
      ai: {
        title: data.ai?.title || null,
        summary: data.ai?.summary || null,
        chapters: data.ai?.chapters || null,
        tasks: data.ai?.tasks || null,
      },
    }
  } catch {
    return null
  }
}

interface Props {
  params: Promise<{ id: string }>
}

export default function TranscriptPage({ params }: Props) {
  const { id: videoId } = use(params)
  const [data, setData] = useState<TranscriptData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentTimeMs, setCurrentTimeMs] = useState(0)

  useEffect(() => {
    fetchTranscript(videoId)
      .then(setData)
      .finally(() => setIsLoading(false))
  }, [videoId])

  const handleRetryTranscription = useCallback(async () => {
    const response = await fetch(`/api/v1/videos/${videoId}/transcribe`, {
      method: 'POST',
    })
    if (response.ok) {
      setIsLoading(true)
      const updated = await fetchTranscript(videoId)
      setData(updated)
      setIsLoading(false)
    }
  }, [videoId])

  const handleToggleTask = useCallback(
    async (taskIndex: number, completed: boolean) => {
      const response = await fetch(`/api/v1/videos/${videoId}/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIndex, completed }),
      })
      if (!response.ok) {
        throw new Error('Failed to update task')
      }
    },
    [videoId]
  )

  const handleSeek = useCallback((timeMs: number) => {
    setCurrentTimeMs(timeMs)
  }, [])

  const handleApplyTitle = useCallback(async (_title: string) => {
    // Would save to API
  }, [])

  // Calculate total duration from words if available
  const totalDurationMs =
    data?.transcription.words.length && data.transcription.words.length > 0
      ? data.transcription.words[data.transcription.words.length - 1]?.endMs || 0
      : 300000 // Default 5 minutes

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4 p-6">
        <Link
          href={`/admin/videos/${videoId}`}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Video
        </Link>
        <div className="text-center py-12">
          <p className="text-zinc-500">Video not found or transcript unavailable</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Back Link */}
      <Link
        href={`/admin/videos/${videoId}`}
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Video
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">{data.title}</h1>
          <p className="mt-1 text-sm text-zinc-400">Transcript and AI Content</p>
        </div>
        <TranscriptionStatus
          status={data.transcription.status}
          videoId={data.id}
          onRetry={handleRetryTranscription}
        />
      </div>

      {/* Download Captions */}
      {data.transcription.status === 'completed' && data.transcription.words.length > 0 && (
        <div className="flex gap-3">
          <Button variant="outline" size="sm" asChild>
            <a
              href={`/api/v1/videos/${data.id}/transcript?format=vtt`}
              download={`${data.title}.vtt`}
            >
              <DownloadIcon className="h-4 w-4 mr-2" />
              Download VTT
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href={`/api/v1/videos/${data.id}/transcript?format=srt`}
              download={`${data.title}.srt`}
            >
              <DownloadIcon className="h-4 w-4 mr-2" />
              Download SRT
            </a>
          </Button>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Transcript */}
        <div className="lg:col-span-2 space-y-6">
          {data.transcription.words.length > 0 ? (
            <>
              <TranscriptSearch words={data.transcription.words} onSeek={handleSeek} />
              <TranscriptViewer
                words={data.transcription.words}
                currentTimeMs={currentTimeMs}
                onSeek={handleSeek}
                showSpeakers
                highlightFillers
              />
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <TranscriptIcon className="h-12 w-12 mx-auto mb-3 text-zinc-600" />
                <p className="text-zinc-400">
                  {data.transcription.status === 'pending'
                    ? 'Transcription has not been started yet'
                    : data.transcription.status === 'processing'
                      ? 'Transcription in progress...'
                      : data.transcription.status === 'failed'
                        ? 'Transcription failed. Try again.'
                        : 'No transcript available'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - AI Content */}
        <div className="space-y-6">
          <AISummaryCard
            title={data.ai.title}
            summary={data.ai.summary}
            chapters={data.ai.chapters}
            onApplyTitle={handleApplyTitle}
            onSeekToChapter={handleSeek}
          />

          {data.ai.chapters && data.ai.chapters.length > 0 && (
            <ChaptersTimeline
              chapters={data.ai.chapters}
              totalDurationMs={totalDurationMs}
              currentTimeMs={currentTimeMs}
              onSeek={handleSeek}
            />
          )}

          {data.ai.tasks && data.ai.tasks.length > 0 && (
            <AITasksList
              tasks={data.ai.tasks}
              videoId={data.id}
              onToggleTask={handleToggleTask}
              onSeekToTimestamp={(seconds) => handleSeek(seconds * 1000)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function TranscriptIcon({ className }: { className?: string }) {
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
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
      <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
    </svg>
  )
}
