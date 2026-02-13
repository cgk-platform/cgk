'use client'

import { cn } from '@cgk-platform/ui'
import { getStreamUrl, getThumbnailUrl } from '@cgk-platform/video'
import type Hls from 'hls.js'
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { formatDuration } from '@/lib/video/types'

interface VideoPlayerProps {
  playbackId: string
  title?: string
  autoPlay?: boolean
  muted?: boolean
  startTime?: number
  onProgress?: (currentTime: number, duration: number) => void
  onComplete?: () => void
  className?: string
}

export function VideoPlayer({
  playbackId,
  title,
  autoPlay = false,
  muted = false,
  startTime = 0,
  onProgress,
  onComplete,
  className,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [isMuted, setIsMuted] = useState(muted)
  const [currentTime, setCurrentTime] = useState(startTime)
  const [duration, setDuration] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [volume, setVolume] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quality, setQuality] = useState<string>('auto')
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [availableQualities, setAvailableQualities] = useState<string[]>([])

  const controlsTimeoutRef = useRef<NodeJS.Timeout>(null)

  const streamUrl = getStreamUrl(playbackId)
  const posterUrl = getThumbnailUrl(playbackId, { width: 1920 })

  // Initialize HLS.js
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const initHls = async () => {
      // Dynamic import for HLS.js
      const Hls = (await import('hls.js')).default

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
        })

        hlsRef.current = hls

        hls.loadSource(streamUrl)
        hls.attachMedia(video)

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false)
          // Get available quality levels
          const levels = hls.levels.map((level: { height: number }) => {
            if (level.height >= 1080) return '1080p'
            if (level.height >= 720) return '720p'
            if (level.height >= 480) return '480p'
            return `${level.height}p`
          })
          setAvailableQualities(['auto', ...new Set(levels)])

          if (autoPlay) {
            video.play().catch(() => {
              // Autoplay might be blocked
              setIsPlaying(false)
            })
          }

          if (startTime > 0) {
            video.currentTime = startTime
          }
        })

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setError('Network error - trying to recover...')
                hls.startLoad()
                break
              case Hls.ErrorTypes.MEDIA_ERROR:
                setError('Media error - trying to recover...')
                hls.recoverMediaError()
                break
              default:
                setError('Video playback error')
                hls.destroy()
                break
            }
          }
        })
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = streamUrl
        video.addEventListener('loadedmetadata', () => {
          setIsLoading(false)
          if (autoPlay) {
            video.play().catch(() => setIsPlaying(false))
          }
        })
      } else {
        setError('HLS is not supported in this browser')
      }
    }

    initHls()

    return () => {
      hlsRef.current?.destroy()
    }
  }, [streamUrl, autoPlay, startTime])

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      onProgress?.(video.currentTime, video.duration)
    }

    const handleDurationChange = () => {
      setDuration(video.duration)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      onComplete?.()
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('durationchange', handleDurationChange)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('durationchange', handleDurationChange)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [onProgress, onComplete])

  // Handle controls visibility
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }, [isPlaying])

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Player controls
  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (isFullscreen) {
      document.exitFullscreen()
    } else {
      containerRef.current.requestFullscreen()
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    const progress = progressRef.current
    if (!video || !progress) return

    const rect = progress.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    video.currentTime = pos * duration
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return

    const newVolume = parseFloat(e.target.value)
    video.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const handleQualityChange = (newQuality: string) => {
    const hls = hlsRef.current
    if (!hls) return

    if (newQuality === 'auto') {
      hls.currentLevel = -1
    } else {
      const height = parseInt(newQuality.replace('p', ''))
      const levelIndex = hls.levels.findIndex((level) => level.height === height)
      if (levelIndex !== -1) {
        hls.currentLevel = levelIndex
      }
    }
    setQuality(newQuality)
    setShowQualityMenu(false)
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden rounded-xl bg-black',
        'ring-1 ring-white/10',
        className,
      )}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="h-full w-full"
        poster={posterUrl}
        playsInline
        onClick={togglePlay}
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Play Button Overlay (when paused) */}
      {!isPlaying && !isLoading && !error && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/40"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 shadow-2xl transition-transform hover:scale-110">
            <Play className="ml-1 h-10 w-10 text-zinc-900" fill="currentColor" />
          </div>
        </button>
      )}

      {/* Controls */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-4 pt-16 transition-opacity duration-300',
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0',
        )}
      >
        {/* Progress Bar */}
        <div
          ref={progressRef}
          className="group mb-4 h-1 cursor-pointer rounded-full bg-white/30"
          onClick={handleSeek}
        >
          <div
            className="relative h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute -right-1.5 -top-1 h-3 w-3 scale-0 rounded-full bg-white shadow-lg transition-transform group-hover:scale-100" />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="rounded-full p-2 text-white transition-colors hover:bg-white/20"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" fill="currentColor" />
              ) : (
                <Play className="h-5 w-5" fill="currentColor" />
              )}
            </button>

            {/* Volume */}
            <div className="group flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="rounded-full p-2 text-white transition-colors hover:bg-white/20"
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="h-1 w-0 cursor-pointer appearance-none rounded-full bg-white/30 opacity-0 transition-all group-hover:w-20 group-hover:opacity-100"
              />
            </div>

            {/* Time Display */}
            <span className="font-mono text-sm text-white/80">
              {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quality Selector */}
            {availableQualities.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">{quality}</span>
                </button>

                {showQualityMenu && (
                  <div className="absolute bottom-full right-0 mb-2 rounded-lg border border-white/10 bg-zinc-900 py-1 shadow-xl">
                    {availableQualities.map((q) => (
                      <button
                        key={q}
                        onClick={() => handleQualityChange(q)}
                        className={cn(
                          'block w-full px-4 py-2 text-left text-sm transition-colors',
                          q === quality
                            ? 'bg-primary/20 text-primary'
                            : 'text-white/80 hover:bg-white/10 hover:text-white',
                        )}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="rounded-full p-2 text-white transition-colors hover:bg-white/20"
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Title Overlay */}
      {title && showControls && (
        <div className="absolute left-0 right-0 top-0 bg-gradient-to-b from-black/80 to-transparent p-4">
          <h3 className="text-lg font-medium text-white">{title}</h3>
        </div>
      )}
    </div>
  )
}
