'use client'

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Slider,
  Switch,
  Textarea,
  cn,
} from '@cgk-platform/ui'
import {
  Play,
  Pause,
  RotateCcw,
  Maximize,
  Minimize,
  FlipHorizontal,
  Settings,
  Type,
  Gauge,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

// Constants
const STORAGE_KEY = 'cgk-teleprompter-script'
const DEFAULT_WPM = 150
const DEFAULT_FONT_SIZE = 32
const MIN_WPM = 50
const MAX_WPM = 300
const MIN_FONT_SIZE = 16
const MAX_FONT_SIZE = 64
const COUNTDOWN_DURATION = 3
const CHARS_PER_WORD = 5

type TeleprompterMode = 'edit' | 'display'

export default function TeleprompterPage(): React.JSX.Element {
  // Script state
  const [script, setScript] = useState('')
  const [mode, setMode] = useState<TeleprompterMode>('edit')

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)

  // Settings state
  const [wpm, setWpm] = useState(DEFAULT_WPM)
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE)
  const [isMirrored, setIsMirrored] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load script from localStorage on mount
  useEffect(() => {
    const savedScript = localStorage.getItem(STORAGE_KEY)
    if (savedScript) {
      setScript(savedScript)
    }
  }, [])

  // Save script to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, script)
  }, [script])

  // Calculate scroll speed (pixels per millisecond) based on WPM
  const calculateScrollSpeed = useCallback(() => {
    // WPM = words per minute
    // Chars per minute = WPM * CHARS_PER_WORD
    // We need to convert this to pixels per millisecond
    // Assuming average line height is fontSize * 1.6
    const lineHeight = fontSize * 1.6
    const charsPerLine = 60 // Approximate characters per line
    const wordsPerLine = charsPerLine / CHARS_PER_WORD
    const linesPerMinute = wpm / wordsPerLine
    const pixelsPerMinute = linesPerMinute * lineHeight
    const pixelsPerMs = pixelsPerMinute / 60000
    return pixelsPerMs
  }, [wpm, fontSize])

  // Animation loop for smooth scrolling
  const animate = useCallback(
    (timestamp: number) => {
      if (!scrollContainerRef.current) return

      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp
      }

      const elapsed = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp

      const scrollSpeed = calculateScrollSpeed()
      const scrollAmount = elapsed * scrollSpeed

      scrollContainerRef.current.scrollTop += scrollAmount

      // Check if we've reached the end
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        setIsPlaying(false)
        return
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    },
    [calculateScrollSpeed]
  )

  // Handle play/pause
  useEffect(() => {
    if (isPlaying && countdown === null) {
      lastTimeRef.current = null
      animationFrameRef.current = requestAnimationFrame(animate)
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, countdown, animate])

  // Countdown timer
  useEffect(() => {
    if (countdown === null) return

    if (countdown === 0) {
      setCountdown(null)
      setIsPlaying(true)
      return
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts in display mode
      if (mode !== 'display') return

      if (e.key === ' ') {
        e.preventDefault()
        if (isPlaying) {
          setIsPlaying(false)
        } else if (countdown === null) {
          startPlayback()
        }
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          exitFullscreen()
        } else {
          handleReset()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, isPlaying, countdown, isFullscreen])

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const startPlayback = () => {
    if (!script.trim()) return
    setCountdown(COUNTDOWN_DURATION)
  }

  const togglePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false)
    } else if (countdown === null) {
      startPlayback()
    }
  }

  const handleReset = () => {
    setIsPlaying(false)
    setCountdown(null)
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }

  const enterDisplayMode = () => {
    if (!script.trim()) return
    setMode('display')
    handleReset()
  }

  const exitDisplayMode = () => {
    setMode('edit')
    setIsPlaying(false)
    setCountdown(null)
    if (isFullscreen) {
      exitFullscreen()
    }
  }

  const toggleFullscreen = async () => {
    if (!containerRef.current) return

    if (!isFullscreen) {
      try {
        await containerRef.current.requestFullscreen()
      } catch (err) {
        console.error('Failed to enter fullscreen:', err)
      }
    } else {
      exitFullscreen()
    }
  }

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.error)
    }
  }

  // Calculate estimated reading time
  const wordCount = script.trim().split(/\s+/).filter(Boolean).length
  const estimatedMinutes = wordCount > 0 ? Math.ceil(wordCount / wpm) : 0

  if (mode === 'display') {
    return (
      <div
        ref={containerRef}
        className={cn(
          'fixed inset-0 z-50 flex flex-col bg-black',
          isFullscreen && 'bg-black'
        )}
      >
        {/* Countdown overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90">
            <div className="text-center">
              <div className="text-9xl font-bold text-white animate-pulse">{countdown}</div>
              <p className="mt-4 text-xl text-white/60">Get ready...</p>
            </div>
          </div>
        )}

        {/* Controls bar */}
        <div
          className={cn(
            'flex items-center justify-between border-b border-white/10 bg-black/80 px-4 py-2 backdrop-blur',
            countdown !== null && 'opacity-0'
          )}
        >
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={exitDisplayMode}
              className="text-white hover:bg-white/10 hover:text-white"
            >
              Exit
            </Button>
            <div className="h-4 w-px bg-white/20" />
            <span className="text-sm text-white/60">{wpm} WPM</span>
            <span className="text-white/40">|</span>
            <span className="text-sm text-white/60">{fontSize}px</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePlayPause}
              className="text-white hover:bg-white/10 hover:text-white"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMirrored(!isMirrored)}
              className={cn(
                'text-white hover:bg-white/10 hover:text-white',
                isMirrored && 'bg-white/20'
              )}
            >
              <FlipHorizontal className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/10 hover:text-white"
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Teleprompter display */}
        <div
          ref={scrollContainerRef}
          className={cn(
            'flex-1 overflow-y-auto px-8 py-12',
            isMirrored && 'scale-x-[-1]'
          )}
          style={{
            scrollBehavior: isPlaying ? 'auto' : 'smooth',
          }}
        >
          {/* Center reading line indicator */}
          <div className="pointer-events-none fixed left-0 right-0 top-1/2 z-10 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-30" />

          {/* Script text */}
          <div className="mx-auto max-w-4xl">
            {/* Top padding for center alignment */}
            <div className="h-[40vh]" />

            <div
              className="whitespace-pre-wrap leading-relaxed text-white"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: 1.6,
              }}
            >
              {script}
            </div>

            {/* Bottom padding for scrolling past end */}
            <div className="h-[60vh]" />
          </div>
        </div>

        {/* Keyboard hints */}
        {!isFullscreen && countdown === null && (
          <div className="flex items-center justify-center gap-4 border-t border-white/10 bg-black/80 px-4 py-2 text-xs text-white/40">
            <span>
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white/60">Space</kbd> Play/Pause
            </span>
            <span>
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white/60">Esc</kbd> Exit
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teleprompter</h1>
          <p className="mt-1 text-muted-foreground">
            Prepare and practice your scripts with smooth scrolling
          </p>
        </div>
        <Button
          onClick={enterDisplayMode}
          disabled={!script.trim()}
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          Start Teleprompter
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Script editor */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Your Script</span>
                {wordCount > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {wordCount} words | ~{estimatedMinutes} min at {wpm} WPM
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste or type your script here..."
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="min-h-[400px] resize-none font-mono text-base leading-relaxed"
              />
            </CardContent>
          </Card>
        </div>

        {/* Settings panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Speed control */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    Speed
                  </Label>
                  <span className="text-sm font-medium">{wpm} WPM</span>
                </div>
                <Slider
                  value={[wpm]}
                  onValueChange={(values) => {
                    if (values[0] !== undefined) setWpm(values[0])
                  }}
                  min={MIN_WPM}
                  max={MAX_WPM}
                  step={10}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Slow ({MIN_WPM})</span>
                  <span>Fast ({MAX_WPM})</span>
                </div>
              </div>

              {/* Font size control */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Type className="h-4 w-4 text-muted-foreground" />
                    Font Size
                  </Label>
                  <span className="text-sm font-medium">{fontSize}px</span>
                </div>
                <Slider
                  value={[fontSize]}
                  onValueChange={(values) => {
                    if (values[0] !== undefined) setFontSize(values[0])
                  }}
                  min={MIN_FONT_SIZE}
                  max={MAX_FONT_SIZE}
                  step={2}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Small ({MIN_FONT_SIZE}px)</span>
                  <span>Large ({MAX_FONT_SIZE}px)</span>
                </div>
              </div>

              {/* Mirror mode toggle */}
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <FlipHorizontal className="h-4 w-4 text-muted-foreground" />
                  Mirror Mode
                </Label>
                <Switch checked={isMirrored} onCheckedChange={setIsMirrored} />
              </div>
            </CardContent>
          </Card>

          {/* Tips card */}
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-base">Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Space:</strong> Play/pause the teleprompter
              </p>
              <p>
                <strong className="text-foreground">Escape:</strong> Exit fullscreen or display mode
              </p>
              <p>
                <strong className="text-foreground">Mirror mode:</strong> Flips text horizontally for use with a teleprompter mirror
              </p>
              <p>
                <strong className="text-foreground">Reading line:</strong> Keep your eyes on the red line in the center of the screen
              </p>
            </CardContent>
          </Card>

          {/* Preview card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  'rounded-lg bg-black p-4 text-white',
                  isMirrored && 'scale-x-[-1]'
                )}
                style={{
                  fontSize: `${Math.max(12, fontSize / 2)}px`,
                  lineHeight: 1.4,
                }}
              >
                {script.slice(0, 200) || 'Your script preview will appear here...'}
                {script.length > 200 && '...'}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
