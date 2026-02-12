'use client'

import { Button, cn } from '@cgk/ui'
import {
  Camera,
  CameraOff,
  Circle,
  Mic,
  MicOff,
  Monitor,
  Pause,
  Play,
  Square,
  StopCircle,
  Video,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

type RecordingMode = 'camera' | 'screen' | 'screen_camera'
type RecordingState = 'idle' | 'previewing' | 'recording' | 'paused' | 'stopped'

interface RecordingInterfaceProps {
  onRecordingComplete: (blob: Blob, mode: RecordingMode) => void
  teleprompterContent?: string | null
  className?: string
}

/**
 * Video recording interface for creators
 *
 * Features:
 * - Camera, screen, or picture-in-picture recording
 * - Real-time preview
 * - Pause/resume support
 * - Optional teleprompter overlay
 */
export function RecordingInterface({
  onRecordingComplete,
  teleprompterContent,
  className,
}: RecordingInterfaceProps) {
  const [mode, setMode] = useState<RecordingMode>('camera')
  const [state, setState] = useState<RecordingState>('idle')
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const pipVideoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopAllStreams = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    cameraStreamRef.current = null
  }, [])

  // Clean up streams on unmount
  useEffect(() => {
    return () => {
      stopAllStreams()
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }
  }, [stopAllStreams])

  const startPreview = async () => {
    setError(null)

    try {
      if (mode === 'camera') {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1920, height: 1080, facingMode: 'user' },
          audio: true,
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } else if (mode === 'screen') {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080 },
          audio: true,
        })
        // Add microphone audio
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        })
        const combinedStream = new MediaStream([
          ...screenStream.getVideoTracks(),
          ...audioStream.getAudioTracks(),
        ])
        streamRef.current = combinedStream
        if (videoRef.current) {
          videoRef.current.srcObject = combinedStream
        }
      } else if (mode === 'screen_camera') {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080 },
          audio: true,
        })
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
          audio: true,
        })
        cameraStreamRef.current = cameraStream
        if (pipVideoRef.current) {
          pipVideoRef.current.srcObject = cameraStream
        }

        // Combine streams
        const combinedStream = new MediaStream([
          ...screenStream.getVideoTracks(),
          ...cameraStream.getAudioTracks(),
        ])
        streamRef.current = combinedStream
        if (videoRef.current) {
          videoRef.current.srcObject = combinedStream
        }
      }

      setState('previewing')
    } catch (err) {
      console.error('Failed to start preview:', err)
      setError(err instanceof Error ? err.message : 'Failed to access camera/screen')
    }
  }

  const startRecording = () => {
    if (!streamRef.current) return

    chunksRef.current = []

    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp9,opus',
    })

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      onRecordingComplete(blob, mode)
    }

    mediaRecorderRef.current = mediaRecorder
    mediaRecorder.start(1000) // Capture in 1-second chunks

    // Start duration timer
    setDuration(0)
    durationIntervalRef.current = setInterval(() => {
      setDuration((d) => d + 1)
    }, 1000)

    setState('recording')
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause()
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
      setState('paused')
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume()
      durationIntervalRef.current = setInterval(() => {
        setDuration((d) => d + 1)
      }, 1000)
      setState('recording')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }
    stopAllStreams()
    setState('stopped')
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }
    stopAllStreams()
    chunksRef.current = []
    setState('idle')
    setDuration(0)
  }

  const toggleMute = () => {
    const audioTracks = streamRef.current?.getAudioTracks()
    if (audioTracks) {
      audioTracks.forEach((track) => {
        track.enabled = isMuted
      })
      setIsMuted(!isMuted)
    }
  }

  const toggleCamera = () => {
    const videoTracks = cameraStreamRef.current?.getVideoTracks() || streamRef.current?.getVideoTracks()
    if (videoTracks) {
      videoTracks.forEach((track) => {
        track.enabled = isCameraOff
      })
      setIsCameraOff(!isCameraOff)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Mode selector */}
      {state === 'idle' && (
        <div className="flex justify-center gap-4">
          {[
            { mode: 'camera' as const, icon: Camera, label: 'Camera' },
            { mode: 'screen' as const, icon: Monitor, label: 'Screen' },
            { mode: 'screen_camera' as const, icon: Video, label: 'Screen + Camera' },
          ].map(({ mode: m, icon: Icon, label }) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border p-4 transition-all',
                mode === m
                  ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                  : 'border-border hover:border-muted-foreground'
              )}
            >
              <Icon className="h-8 w-8" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Video preview */}
      <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full object-cover"
        />

        {/* Picture-in-picture camera for screen_camera mode */}
        {mode === 'screen_camera' && state !== 'idle' && (
          <div className="absolute bottom-4 right-4 h-32 w-48 overflow-hidden rounded-lg border-2 border-white/50 shadow-lg">
            <video
              ref={pipVideoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Recording indicator */}
        {state === 'recording' && (
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-red-500 px-3 py-1.5 text-white">
            <Circle className="h-3 w-3 animate-pulse fill-current" />
            <span className="font-mono text-sm">{formatDuration(duration)}</span>
          </div>
        )}

        {state === 'paused' && (
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-amber-500 px-3 py-1.5 text-black">
            <Pause className="h-3 w-3 fill-current" />
            <span className="font-mono text-sm">{formatDuration(duration)}</span>
          </div>
        )}

        {/* Teleprompter overlay (optional) */}
        {teleprompterContent && state !== 'idle' && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6">
            <p className="text-center text-lg text-white/90">
              {teleprompterContent.slice(0, 200)}...
            </p>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center">
              <p className="text-red-400">{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setError(null)
                  setState('idle')
                }}
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {state === 'idle' && (
          <Button size="lg" onClick={startPreview}>
            <Camera className="mr-2 h-5 w-5" />
            Start Preview
          </Button>
        )}

        {state === 'previewing' && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className={isMuted ? 'text-red-500' : ''}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            {mode === 'camera' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCamera}
                className={isCameraOff ? 'text-red-500' : ''}
              >
                {isCameraOff ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
              </Button>
            )}

            <Button size="lg" onClick={startRecording} className="bg-red-500 hover:bg-red-600">
              <Circle className="mr-2 h-5 w-5 fill-current" />
              Start Recording
            </Button>

            <Button variant="outline" onClick={cancelRecording}>
              Cancel
            </Button>
          </>
        )}

        {state === 'recording' && (
          <>
            <Button variant="ghost" size="icon" onClick={toggleMute}>
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            <Button size="lg" variant="outline" onClick={pauseRecording}>
              <Pause className="mr-2 h-5 w-5" />
              Pause
            </Button>

            <Button size="lg" onClick={stopRecording} className="bg-red-500 hover:bg-red-600">
              <Square className="mr-2 h-5 w-5 fill-current" />
              Stop Recording
            </Button>
          </>
        )}

        {state === 'paused' && (
          <>
            <Button size="lg" onClick={resumeRecording}>
              <Play className="mr-2 h-5 w-5" />
              Resume
            </Button>

            <Button size="lg" onClick={stopRecording} className="bg-red-500 hover:bg-red-600">
              <StopCircle className="mr-2 h-5 w-5" />
              Finish
            </Button>

            <Button variant="ghost" onClick={cancelRecording}>
              Discard
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
