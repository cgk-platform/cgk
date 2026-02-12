'use client'

import { cn } from '@cgk/ui'
import { Pause, Play, RotateCcw, Settings2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { TeleprompterSettings, TeleprompterScript } from '@cgk/video/creator-tools'
import { calculateScrollRate, DEFAULT_TELEPROMPTER_SETTINGS } from '@cgk/video/creator-tools'

interface TeleprompterProps {
  script: TeleprompterScript
  settings?: Partial<TeleprompterSettings>
  onSettingsChange?: (settings: TeleprompterSettings) => void
  className?: string
  showControls?: boolean
}

/**
 * Teleprompter component for video recording guidance
 *
 * Features:
 * - Smooth auto-scrolling at configurable speed
 * - Mirror mode for reflection teleprompters
 * - Progress indicator
 * - Keyboard shortcuts (Space to play/pause, R to reset)
 */
export function Teleprompter({
  script,
  settings: initialSettings,
  onSettingsChange,
  className,
  showControls = true,
}: TeleprompterProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<TeleprompterSettings>({
    ...DEFAULT_TELEPROMPTER_SETTINGS,
    scrollSpeed: script.scrollSpeed,
    fontSize: script.fontSize,
    ...initialSettings,
  })

  const scrollRate = calculateScrollRate(settings.scrollSpeed)

  // Animation loop for smooth scrolling
  const animate = useCallback(
    (timestamp: number) => {
      if (!containerRef.current || !contentRef.current) return

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp
      }

      const deltaTime = (timestamp - lastTimeRef.current) / 1000
      lastTimeRef.current = timestamp

      const scrollAmount = scrollRate * deltaTime
      containerRef.current.scrollTop += scrollAmount

      // Calculate progress
      const maxScroll =
        contentRef.current.scrollHeight - containerRef.current.clientHeight
      const currentProgress =
        maxScroll > 0 ? (containerRef.current.scrollTop / maxScroll) * 100 : 100

      setProgress(currentProgress)

      // Stop at the end
      if (currentProgress >= 100) {
        setIsPlaying(false)
        return
      }

      if (isPlaying) {
        animationRef.current = requestAnimationFrame(animate)
      }
    },
    [isPlaying, scrollRate]
  )

  // Start/stop animation
  useEffect(() => {
    if (isPlaying) {
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
  }, [isPlaying, animate])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        setIsPlaying((p) => !p)
      } else if (e.code === 'KeyR') {
        e.preventDefault()
        handleReset()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleReset = () => {
    setIsPlaying(false)
    setProgress(0)
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
    }
  }

  const handleSettingsChange = (newSettings: Partial<TeleprompterSettings>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    onSettingsChange?.(updated)
  }

  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden rounded-lg',
        settings.mirrorMode && 'scale-x-[-1]',
        className
      )}
      style={{
        backgroundColor: settings.backgroundColor,
        color: settings.textColor,
      }}
    >
      {/* Progress bar */}
      {settings.showProgress && (
        <div className="absolute left-0 right-0 top-0 z-10 h-1 bg-white/10">
          <div
            className="h-full bg-amber-500 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Scrolling content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        style={{ paddingTop: '40vh', paddingBottom: '40vh' }}
      >
        <div
          ref={contentRef}
          className="mx-auto max-w-3xl px-8 text-center"
          style={{
            fontSize: settings.fontSize,
            lineHeight: settings.lineHeight,
            fontFamily: settings.fontFamily,
          }}
        >
          {/* Center line indicator */}
          <div className="pointer-events-none absolute left-0 right-0 top-1/2 z-20 -translate-y-1/2">
            <div className="mx-auto h-px w-32 bg-amber-500/40" />
          </div>

          {/* Script content with paragraph breaks */}
          {script.content.split('\n\n').map((paragraph, idx) => (
            <p key={idx} className="mb-8">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      {/* Controls */}
      {showControls && (
        <div
          className={cn(
            'absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 p-2 backdrop-blur-sm',
            settings.mirrorMode && 'scale-x-[-1]'
          )}
        >
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-black transition-colors hover:bg-amber-400"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>

          <button
            onClick={handleReset}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            title="Reset (R)"
          >
            <RotateCcw className="h-5 w-5" />
          </button>

          <div className="mx-2 h-6 w-px bg-white/20" />

          <button
            onClick={() => setShowSettings((s) => !s)}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
              showSettings
                ? 'bg-amber-500 text-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            )}
            title="Settings"
          >
            <Settings2 className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div
          className={cn(
            'absolute bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-lg bg-zinc-900/95 p-4 backdrop-blur-sm',
            settings.mirrorMode && 'scale-x-[-1]'
          )}
          style={{ width: '280px' }}
        >
          <div className="space-y-4">
            {/* Scroll Speed */}
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-zinc-400">Scroll Speed</span>
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
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-700 accent-amber-500"
              />
            </div>

            {/* Font Size */}
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-zinc-400">Font Size</span>
                <span className="font-mono text-amber-500">{settings.fontSize}px</span>
              </div>
              <input
                type="range"
                min="16"
                max="72"
                step="2"
                value={settings.fontSize}
                onChange={(e) =>
                  handleSettingsChange({ fontSize: parseInt(e.target.value, 10) })
                }
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-700 accent-amber-500"
              />
            </div>

            {/* Mirror Mode */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Mirror Mode</span>
              <button
                onClick={() => handleSettingsChange({ mirrorMode: !settings.mirrorMode })}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  settings.mirrorMode ? 'bg-amber-500' : 'bg-zinc-600'
                )}
              >
                <span
                  className={cn(
                    'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                    settings.mirrorMode && 'translate-x-5'
                  )}
                />
              </button>
            </div>

            {/* Show Progress */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Show Progress</span>
              <button
                onClick={() => handleSettingsChange({ showProgress: !settings.showProgress })}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  settings.showProgress ? 'bg-amber-500' : 'bg-zinc-600'
                )}
              >
                <span
                  className={cn(
                    'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                    settings.showProgress && 'translate-x-5'
                  )}
                />
              </button>
            </div>
          </div>

          <div className="mt-4 border-t border-zinc-700 pt-3 text-center text-xs text-zinc-500">
            Press <kbd className="rounded bg-zinc-800 px-1.5 py-0.5">Space</kbd> to play/pause
          </div>
        </div>
      )}
    </div>
  )
}
