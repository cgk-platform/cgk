'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface SignatureCanvasProps {
  onSignatureChange: (data: string | null) => void
  width?: number
  height?: number
}

export function SignatureCanvas({
  onSignatureChange,
  width = 400,
  height = 150,
}: SignatureCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set up for high DPI displays
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    // Set drawing styles
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [width, height])

  const getCoordinates = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }

      const rect = canvas.getBoundingClientRect()

      if ('touches' in e && e.touches[0]) {
        const touch = e.touches[0]
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        }
      }

      // Type guard for MouseEvent
      const mouseEvent = e as React.MouseEvent
      return {
        x: mouseEvent.clientX - rect.left,
        y: mouseEvent.clientY - rect.top,
      }
    },
    []
  )

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      setIsDrawing(true)
      const coords = getCoordinates(e)
      lastPointRef.current = coords

      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (ctx) {
        ctx.beginPath()
        ctx.moveTo(coords.x, coords.y)
      }
    },
    [getCoordinates]
  )

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return
      e.preventDefault()

      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!ctx || !lastPointRef.current) return

      const coords = getCoordinates(e)

      ctx.lineTo(coords.x, coords.y)
      ctx.stroke()

      lastPointRef.current = coords
      setHasSignature(true)
    },
    [isDrawing, getCoordinates]
  )

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
    lastPointRef.current = null

    const canvas = canvasRef.current
    if (canvas && hasSignature) {
      // Export signature as base64
      const data = canvas.toDataURL('image/png')
      onSignatureChange(data)
    }
  }, [hasSignature, onSignatureChange])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    ctx.clearRect(0, 0, width, height)
    setHasSignature(false)
    onSignatureChange(null)
  }, [width, height, onSignatureChange])

  return (
    <div className="space-y-2">
      <div className="relative">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="cursor-crosshair touch-none rounded-lg border-2 border-dashed border-muted-foreground/50 bg-white"
          style={{ width, height }}
        />

        {!hasSignature && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Draw your signature here
            </p>
          </div>
        )}

        {/* Signature line */}
        <div
          className="pointer-events-none absolute bottom-6 left-4 right-4 border-b border-muted-foreground/30"
          style={{ bottom: '24px' }}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={clear}
          disabled={!hasSignature}
          className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          Clear
        </button>
      </div>
    </div>
  )
}

interface TypedSignatureProps {
  name: string
  onNameChange: (name: string) => void
  selectedFont: string
  onFontChange: (font: string) => void
}

const SIGNATURE_FONTS = [
  { name: 'Brush Script', value: 'brush-script', style: 'font-brush' },
  { name: 'Dancing Script', value: 'dancing-script', style: 'font-dancing' },
  { name: 'Great Vibes', value: 'great-vibes', style: 'font-vibes' },
  { name: 'Pacifico', value: 'pacifico', style: 'font-pacifico' },
]

export function TypedSignature({
  name,
  onNameChange,
  selectedFont,
  onFontChange,
}: TypedSignatureProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium">
          Type your name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Your full name"
          className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-lg outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {name && (
        <div>
          <label className="block text-sm font-medium mb-2">
            Select a style
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SIGNATURE_FONTS.map((font) => (
              <button
                key={font.value}
                type="button"
                onClick={() => onFontChange(font.value)}
                className={`rounded-lg border-2 p-4 text-center transition-colors ${
                  selectedFont === font.value
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/50'
                }`}
              >
                <span
                  className="text-2xl"
                  style={{
                    fontFamily:
                      font.value === 'brush-script'
                        ? "'Brush Script MT', cursive"
                        : font.value === 'dancing-script'
                          ? "'Dancing Script', cursive"
                          : font.value === 'great-vibes'
                            ? "'Great Vibes', cursive"
                            : "'Pacifico', cursive",
                  }}
                >
                  {name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface SignatureCaptureProps {
  onSignatureComplete: (data: {
    signatureData: string
    signatureType: 'drawn' | 'typed'
    fontName?: string
  }) => void
}

export function SignatureCapture({
  onSignatureComplete,
}: SignatureCaptureProps): React.JSX.Element {
  const [mode, setMode] = useState<'draw' | 'type'>('draw')
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null)
  const [typedName, setTypedName] = useState('')
  const [selectedFont, setSelectedFont] = useState('brush-script')

  const isValid = mode === 'draw' ? !!drawnSignature : typedName.length >= 2

  const handleAdopt = () => {
    if (mode === 'draw' && drawnSignature) {
      onSignatureComplete({
        signatureData: drawnSignature,
        signatureType: 'drawn',
      })
    } else if (mode === 'type' && typedName) {
      onSignatureComplete({
        signatureData: typedName,
        signatureType: 'typed',
        fontName: selectedFont,
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="flex border-b">
        <button
          type="button"
          onClick={() => setMode('draw')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            mode === 'draw'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Draw
        </button>
        <button
          type="button"
          onClick={() => setMode('type')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            mode === 'type'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Type
        </button>
      </div>

      {/* Signature input */}
      <div className="min-h-[200px]">
        {mode === 'draw' ? (
          <SignatureCanvas onSignatureChange={setDrawnSignature} />
        ) : (
          <TypedSignature
            name={typedName}
            onNameChange={setTypedName}
            selectedFont={selectedFont}
            onFontChange={setSelectedFont}
          />
        )}
      </div>

      {/* Adopt button */}
      <button
        type="button"
        onClick={handleAdopt}
        disabled={!isValid}
        className="w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Adopt Signature
      </button>

      <p className="text-center text-xs text-muted-foreground">
        By clicking "Adopt Signature", you agree that this electronic signature
        is the legal equivalent of your handwritten signature.
      </p>
    </div>
  )
}
