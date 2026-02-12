'use client'

import { Button, cn, Input, Label } from '@cgk/ui'
import { Loader2, Scissors, X } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { formatTimestamp, parseTimestamp, type TrimRequest } from '@cgk/video/creator-tools'

interface TrimModalProps {
  videoDuration: number
  playbackId: string
  onTrim: (request: TrimRequest) => Promise<void>
  onClose: () => void
}

/**
 * Video trimming modal with timeline UI
 *
 * Features:
 * - Visual timeline with drag handles
 * - Preview of selected range
 * - Time input fields for precise control
 * - Clip duration display
 */
export function TrimModal({
  videoDuration,
  playbackId,
  onTrim,
  onClose,
}: TrimModalProps) {
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(Math.min(30, videoDuration))
  const [newTitle, setNewTitle] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null)

  const timelineRef = useRef<HTMLDivElement>(null)

  const clipDuration = endTime - startTime
  const startPercent = (startTime / videoDuration) * 100
  const widthPercent = ((endTime - startTime) / videoDuration) * 100

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!timelineRef.current) return

      const rect = timelineRef.current.getBoundingClientRect()
      const percent = (e.clientX - rect.left) / rect.width
      const time = percent * videoDuration

      // Set closest handle
      const distToStart = Math.abs(time - startTime)
      const distToEnd = Math.abs(time - endTime)

      if (distToStart < distToEnd) {
        setStartTime(Math.max(0, Math.min(time, endTime - 1)))
      } else {
        setEndTime(Math.min(videoDuration, Math.max(time, startTime + 1)))
      }
    },
    [videoDuration, startTime, endTime]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !timelineRef.current) return

      const rect = timelineRef.current.getBoundingClientRect()
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const time = percent * videoDuration

      if (isDragging === 'start') {
        setStartTime(Math.max(0, Math.min(time, endTime - 1)))
      } else {
        setEndTime(Math.min(videoDuration, Math.max(time, startTime + 1)))
      }
    },
    [isDragging, videoDuration, startTime, endTime]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(null)
  }, [])

  // Add global mouse event listeners when dragging
  useState(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  })

  const handleStartTimeInput = (value: string) => {
    const parsed = parseTimestamp(value)
    if (parsed !== null && parsed >= 0 && parsed < endTime) {
      setStartTime(parsed)
    }
  }

  const handleEndTimeInput = (value: string) => {
    const parsed = parseTimestamp(value)
    if (parsed !== null && parsed > startTime && parsed <= videoDuration) {
      setEndTime(parsed)
    }
  }

  const handleTrim = async () => {
    setError(null)
    setIsProcessing(true)

    try {
      await onTrim({
        startTime,
        endTime,
        saveAsNew: true,
        newTitle: newTitle.trim() || undefined,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create clip')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Scissors className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Trim Video</h2>
              <p className="text-sm text-zinc-400">
                Create a clip from this video
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6">
          {/* Video preview thumbnail strip */}
          <div className="relative overflow-hidden rounded-lg bg-zinc-800">
            <div className="flex h-20">
              {Array.from({ length: 10 }).map((_, i) => (
                <img
                  key={i}
                  src={`https://image.mux.com/${playbackId}/thumbnail.jpg?time=${Math.floor((i / 10) * videoDuration)}`}
                  alt=""
                  className="h-full w-[10%] object-cover"
                />
              ))}
            </div>

            {/* Selection overlay */}
            <div
              ref={timelineRef}
              className="absolute inset-0 cursor-pointer"
              onClick={handleTimelineClick}
            >
              {/* Dimmed areas */}
              <div
                className="absolute inset-y-0 left-0 bg-black/70"
                style={{ width: `${startPercent}%` }}
              />
              <div
                className="absolute inset-y-0 right-0 bg-black/70"
                style={{ width: `${100 - startPercent - widthPercent}%` }}
              />

              {/* Selection box */}
              <div
                className="absolute inset-y-0 border-2 border-amber-500"
                style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
              >
                {/* Start handle */}
                <div
                  className={cn(
                    'absolute -left-2 inset-y-0 w-4 cursor-ew-resize bg-amber-500',
                    isDragging === 'start' && 'bg-amber-400'
                  )}
                  onMouseDown={() => setIsDragging('start')}
                >
                  <div className="absolute inset-y-4 left-1.5 w-0.5 bg-black/30" />
                </div>

                {/* End handle */}
                <div
                  className={cn(
                    'absolute -right-2 inset-y-0 w-4 cursor-ew-resize bg-amber-500',
                    isDragging === 'end' && 'bg-amber-400'
                  )}
                  onMouseDown={() => setIsDragging('end')}
                >
                  <div className="absolute inset-y-4 right-1.5 w-0.5 bg-black/30" />
                </div>
              </div>
            </div>
          </div>

          {/* Time inputs */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-zinc-400">Start Time</Label>
              <Input
                value={formatTimestamp(startTime)}
                onChange={(e) => handleStartTimeInput(e.target.value)}
                placeholder="0:00"
                className="bg-zinc-800 border-zinc-700 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">End Time</Label>
              <Input
                value={formatTimestamp(endTime)}
                onChange={(e) => handleEndTimeInput(e.target.value)}
                placeholder="0:30"
                className="bg-zinc-800 border-zinc-700 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Clip Duration</Label>
              <div className="flex h-9 items-center rounded-md bg-zinc-800 px-3 font-mono text-amber-500">
                {formatTimestamp(clipDuration)}
              </div>
            </div>
          </div>

          {/* Clip title */}
          <div className="space-y-2">
            <Label className="text-zinc-400">Clip Title (optional)</Label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Leave empty to use original title with '(Clip)' suffix"
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 px-6 py-4">
          <div className="text-sm text-zinc-500">
            Video duration: {formatTimestamp(videoDuration)}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              onClick={handleTrim}
              disabled={isProcessing || clipDuration < 1}
              className="bg-amber-500 hover:bg-amber-400 text-black"
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Scissors className="mr-2 h-4 w-4" />
              )}
              Create Clip
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
