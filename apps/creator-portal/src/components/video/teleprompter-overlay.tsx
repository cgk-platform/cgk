'use client'

import { cn } from '@cgk-platform/ui'
import {
  calculateScrollRate,
  DEFAULT_TELEPROMPTER_SETTINGS,
  type TeleprompterSettings,
} from '@cgk-platform/video/creator-tools'
import { Maximize2, Minimize2, Settings2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface TeleprompterOverlayProps {
  content: string
  isRecording: boolean
  settings?: Partial<TeleprompterSettings>
  onSettingsChange?: (settings: TeleprompterSettings) => void
  className?: string
}

/**
 * Teleprompter overlay for recording interface
 *
 * A more compact version designed to overlay on the recording preview,
 * with transparency and minimal controls.
 */
export function TeleprompterOverlay({
  content,
  isRecording,
  settings: initialSettings,
  onSettingsChange,
  className,
}: TeleprompterOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [progress, setProgress] = useState(0)
  const [settings, setSettings] = useState<TeleprompterSettings>({
    ...DEFAULT_TELEPROMPTER_SETTINGS,
    ...initialSettings,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    textColor: '#ffffff',
    fontSize: 28,
  })

  const scrollRate = calculateScrollRate(settings.scrollSpeed)

  // Animation loop
  const animate = useCallback(
    (timestamp: number) => {
      if (!containerRef.current || !contentRef.current || !isRecording) return

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp
      }

      const deltaTime = (timestamp - lastTimeRef.current) / 1000
      lastTimeRef.current = timestamp

      const scrollAmount = scrollRate * deltaTime
      containerRef.current.scrollTop += scrollAmount

      const maxScroll =
        contentRef.current.scrollHeight - containerRef.current.clientHeight
      const currentProgress =
        maxScroll > 0 ? (containerRef.current.scrollTop / maxScroll) * 100 : 100

      setProgress(currentProgress)

      if (currentProgress < 100 && isRecording) {
        animationRef.current = requestAnimationFrame(animate)
      }
    },
    [isRecording, scrollRate]
  )

  // Start/stop animation based on recording state
  useEffect(() => {
    if (isRecording) {
      lastTimeRef.current = 0
      animationRef.current = requestAnimationFrame(animate)
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isRecording, animate])

  // Reset on content change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
    }
    setProgress(0)
  }, [content])

  const handleSettingsChange = (newSettings: Partial<TeleprompterSettings>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    onSettingsChange?.(updated)
  }

  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden rounded-lg backdrop-blur-sm',
        isFullscreen ? 'fixed inset-4 z-50' : 'h-full',
        settings.mirrorMode && 'scale-x-[-1]',
        className
      )}
      style={{
        backgroundColor: settings.backgroundColor,
      }}
    >
      {/* Progress bar */}
      {settings.showProgress && (
        <div className="absolute left-0 right-0 top-0 z-10 h-1 bg-white/10">
          <div
            className="h-full bg-amber-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Controls */}
      <div
        className={cn(
          'absolute right-2 top-2 z-20 flex gap-1',
          settings.mirrorMode && 'scale-x-[-1]'
        )}
      >
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={cn(
            'rounded-full p-2 transition-colors',
            showSettings
              ? 'bg-amber-500 text-black'
              : 'bg-black/50 text-white hover:bg-black/70'
          )}
        >
          <Settings2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div
          className={cn(
            'absolute right-2 top-12 z-20 w-56 rounded-lg bg-black/90 p-3 shadow-lg',
            settings.mirrorMode && 'scale-x-[-1]'
          )}
        >
          <div className="space-y-3 text-sm">
            <div>
              <div className="mb-1 flex items-center justify-between text-white/70">
                <span>Speed</span>
                <span className="font-mono text-amber-500">{settings.scrollSpeed}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={settings.scrollSpeed}
                onChange={(e) =>
                  handleSettingsChange({ scrollSpeed: parseInt(e.target.value, 10) })
                }
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-amber-500"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-white/70">
                <span>Font</span>
                <span className="font-mono text-amber-500">{settings.fontSize}px</span>
              </div>
              <input
                type="range"
                min="16"
                max="48"
                step="2"
                value={settings.fontSize}
                onChange={(e) =>
                  handleSettingsChange({ fontSize: parseInt(e.target.value, 10) })
                }
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-amber-500"
              />
            </div>

            <label className="flex items-center justify-between text-white/70">
              <span>Mirror</span>
              <input
                type="checkbox"
                checked={settings.mirrorMode}
                onChange={(e) =>
                  handleSettingsChange({ mirrorMode: e.target.checked })
                }
                className="h-4 w-4 rounded accent-amber-500"
              />
            </label>
          </div>
        </div>
      )}

      {/* Scrolling content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        style={{ paddingTop: '30%', paddingBottom: '30%' }}
      >
        {/* Center line */}
        <div className="pointer-events-none absolute left-0 right-0 top-1/2 z-10 -translate-y-1/2">
          <div className="mx-auto h-px w-16 bg-amber-500/50" />
        </div>

        <div
          ref={contentRef}
          className="mx-auto max-w-lg px-6 text-center"
          style={{
            fontSize: settings.fontSize,
            lineHeight: settings.lineHeight,
            color: settings.textColor,
          }}
        >
          {content.split('\n\n').map((paragraph, idx) => (
            <p key={idx} className="mb-6">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div
          className={cn(
            'absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-red-500 px-2 py-1 text-xs text-white',
            settings.mirrorMode && 'scale-x-[-1]'
          )}
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          REC
        </div>
      )}
    </div>
  )
}
